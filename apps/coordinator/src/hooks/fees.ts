import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { calculateTimeElapsed } from "../components/Wallet/fee-bumping/utils";
import { Buffer } from "buffer/";
import { useGetClient } from "./client";
import { TransactionAnalyzer, UTXO } from "@caravan/fees";
import {
  RootState,
  AnalyzerWithTimeElapsed,
  WalletSliceUTXO,
  PendingTransactionsResult,
} from "components/types/fees";

/**
 * Custom hook to fetch and analyze pending transactions in the wallet.
 *
 * This hook retrieves all unconfirmed transactions from the wallet state,
 * analyzes them using the TransactionAnalyzer, and prepares them for potential
 * fee bumping operations (RBF or CPFP). It also fetches the current network fee rate.
 *
 * @returns {Object} An object containing:
 *   - pendingTransactions: Array of analyzed transactions with time elapsed information.
 *   - currentNetworkFeeRate: The current estimated network fee rate.
 *   - isLoading: Boolean indicating if the data is still being fetched.
 *   - error: String containing any error message, or null if no error.
 */
export const useGetPendingTransactions = (): PendingTransactionsResult => {
  const [pendingTransactions, setPendingTransactions] = useState<
    AnalyzerWithTimeElapsed[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentNetworkFeeRate, setCurrentNetworkFeeRate] = useState<
    number | null
  >(1);

  const settings = useSelector((state: RootState) => state.settings);
  const walletSlices = useSelector((state: RootState) => [
    ...Object.values(state.wallet.deposits.nodes),
    ...Object.values(state.wallet.change.nodes),
  ]);
  const blockchainClient = useGetClient();

  const getCurrentNetworkFeeRate = async (): Promise<number> => {
    try {
      return await blockchainClient.getFeeEstimate();
    } catch (error) {
      console.error("Error fetching network fee rate:", error);
      return 1; // Default to 1 sat/vB if unable to fetch
    }
  };

  const getAvailableInputs = async (
    txid: string,
    maxAdditionalInputs: number = 5,
  ): Promise<UTXO[]> => {
    const allUtxos = walletSlices.flatMap((slice) => slice.utxos);
    const existingInputs = allUtxos.filter((utxo) => utxo.txid === txid);
    const additionalUtxos = allUtxos.filter(
      (utxo) =>
        utxo.txid !== txid &&
        !existingInputs.some(
          (input) => input.txid === utxo.txid && input.index === utxo.index,
        ),
    );

    const sortedAdditionalUtxos = additionalUtxos
      .sort((a, b) => b.amountSats.minus(a.amountSats).toNumber())
      .slice(0, maxAdditionalInputs);

    const formatUtxo = async (utxo: WalletSliceUTXO): Promise<UTXO> => {
      const fullTx = await blockchainClient.getTransaction(utxo.txid);

      const output = fullTx.vout[utxo.index];
      console.log("fullTx", fullTx, output);
      return {
        txid: utxo.txid,
        vout: utxo.index,
        value: utxo.amountSats.toString(),
        prevTxHex: utxo.transactionHex,
        witnessUtxo: {
          script: Buffer.from(output.scriptpubkey, "hex"),
          value: Number(output.value),
        },
      };
    };

    const combinedInputs = await Promise.all([
      ...existingInputs.map(formatUtxo),
      ...sortedAdditionalUtxos.map(formatUtxo),
    ]);
    console.log("combinedInputs", combinedInputs);
    return combinedInputs;
  };

  const analyzeTransaction = async (
    utxo: WalletSliceUTXO,
    currentNetworkFeeRate: number,
    settings: RootState["settings"],
    availableInputs: UTXO[],
  ): Promise<AnalyzerWithTimeElapsed> => {
    try {
      const analyzer = new TransactionAnalyzer({
        txHex: utxo.transactionHex,
        network: settings.network,
        targetFeeRate: currentNetworkFeeRate,
        absoluteFee: utxo.amountSats.toString(),
        availableUtxos: availableInputs,
        requiredSigners: settings.requiredSigners,
        totalSigners: settings.totalSigners,
        addressType: settings.addressType,
        changeOutputIndex: 0, // as in pending tx we are checking for all UTXO's which are not confirmed and within our wallet so having a default here
      });

      const analysis = analyzer.analyze();
      console.log(" analysis ", utxo, analysis);
      return analyzer as AnalyzerWithTimeElapsed;
    } catch (error) {
      console.error("Error analyzing transaction:", error);
      throw error;
    }
  };

  useEffect(() => {
    const fetchPendingTransactions = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const pendingTxs = walletSlices
          .flatMap((slice) => slice.utxos)
          .filter((utxo) => utxo.confirmed);

        const currentNetworkFeeRate = await getCurrentNetworkFeeRate();
        setCurrentNetworkFeeRate(currentNetworkFeeRate);

        const analyzedTransactions = await Promise.all(
          pendingTxs.map(async (utxo) => {
            const availableInputs = await getAvailableInputs(utxo.txid);
            console.log(" availableInputs ", availableInputs);
            return analyzeTransaction(
              utxo,
              currentNetworkFeeRate,
              settings,
              availableInputs,
            );
          }),
        );

        setPendingTransactions(analyzedTransactions);
      } catch (error) {
        console.error("Error fetching pending transactions:", error);
        setError(
          "Failed to fetch pending transactions. Please try again later.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchPendingTransactions();
  }, []);

  return { pendingTransactions, currentNetworkFeeRate, isLoading, error };
};
