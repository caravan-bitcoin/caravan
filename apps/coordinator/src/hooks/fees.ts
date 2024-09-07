import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { calculateTimeElapsed } from "../components/Wallet/fee-bumping/utils";
import { Buffer } from "buffer/";
import { importPSBT } from "../actions/transactionActions";
import { useGetClient } from "./client";
import {
  TransactionAnalyzer,
  UTXO,
  BtcTransactionTemplate,
} from "@caravan/fees";
import {
  RootState,
  ExtendedAnalyzer,
  WalletSliceUTXO,
  PendingTransactionsResult,
} from "components/types/fees";

export const usePsbtDetails = (psbtHex: string) => {
  const [txTemplate, setTxTemplate] = useState<BtcTransactionTemplate | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const network = useSelector((state: RootState) => state.settings.network);
  const settings = useSelector((state: RootState) => state.settings);

  useEffect(() => {
    if (!psbtHex) return;

    try {
      const template = BtcTransactionTemplate.rawPsbt(psbtHex, {
        network,
        targetFeeRate: settings.targetFeeRate,
        dustThreshold: settings.dustThreshold,
        scriptType: settings.addressType,
        requiredSigners: settings.requiredSigners,
        totalSigners: settings.totalSigners,
      });
      setTxTemplate(template);
      setError(null);
    } catch (err) {
      setError(err.message);
      setTxTemplate(null);
    }
  }, [psbtHex, network, settings]);

  const calculateFee = () => {
    if (!txTemplate) return "0";
    return txTemplate.currentFee;
  };

  return { txTemplate, error, calculateFee };
};

export const useTransactionDetails = (txid: string) => {
  const walletSlices = useSelector((state: RootState) => [
    ...Object.values(state.wallet.deposits.nodes),
    ...Object.values(state.wallet.change.nodes),
  ]);

  const pendingTxs = walletSlices
    .flatMap((slice) => slice.utxos)
    .filter((utxo) => !utxo.confirmed);

  const targetTx = pendingTxs.find((tx) => tx.txid === txid);

  const inputs: WalletSliceUTXO[] = pendingTxs.filter(
    (utxo) => utxo.txid === txid,
  );
  const outputs: WalletSliceUTXO[] = targetTx ? [targetTx] : [];

  return { inputs, outputs };
};
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
    ExtendedAnalyzer[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentNetworkFeeRate, setCurrentNetworkFeeRate] = useState<
    number | null
  >(1);

  const settings = useSelector((state: RootState) => {
    return state.settings;
  });
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

    // Manually defined extra UTXO object based on the data provided
    const extraUtxo: UTXO = {
      txid: "19128c8c8c51c1677193db46034d485b159393a3c452ea89ecd13d2d94cd776d",
      vout: 1,
      value: "67023682",
      prevTxHex:
        "0200000000010113f6166509ff0bc3859f4dbc655c9110fc61d66863d5fbb01f85e34888c95d6b0100000000fdffffff02c62e00000000000016001452bda9bc68632002ad956b35d8fa02e25332843a42b3fe0300000000160014ebfd0815c01fed09827c8ec7963976a5641ee05e02473044022051481d5cfa0d7ca581b30b59f44689bf592e20a2f71b8fcca7a957a186cce52b02200c8df48490667716be48babc6186a733c0a91c0d900abc9f080ddf3a76ea4b8b01210232e706b2fb0738439ee02d25d0576c174faa389d1bd5fe1f210ced54c79f5a568b4e2c00", // Provide the previous transaction hex
      witnessUtxo: {
        script: Buffer.from("ebfd0815c01fed09827c8ec7963976a5641ee05e", "hex"), // Convert script to buffer
        value: 67023682, // Replace with the correct amount in sats
      },
      sequence: 0xfffffffd, // Defined sequence
    };

    // Append the extra UTXO to the combined inputs
    combinedInputs.push(extraUtxo);
    return combinedInputs;
  };

  const analyzeTransaction = async (
    utxo: WalletSliceUTXO,
    currentNetworkFeeRate: number,
    settings: RootState["settings"],
    availableInputs: UTXO[],
  ): Promise<ExtendedAnalyzer> => {
    try {
      const analyzer = new TransactionAnalyzer({
        txHex: utxo.transactionHex,
        network: settings.network,
        targetFeeRate: 100, // currentNetworkFeeRate
        absoluteFee: utxo.amountSats.toString(),
        availableUtxos: availableInputs,
        requiredSigners: settings.requiredSigners,
        totalSigners: settings.totalSigners,
        addressType: settings.addressType,
        changeOutputIndex: 0, // as in pending tx we are checking for all UTXO's which are not confirmed and within our wallet so having a default here
      });

      const timeElapsed = calculateTimeElapsed(utxo.time);

      const inputTemplates = analyzer.getInputTemplates();

      // Find the index of the matching input in availableInputs (note inputTemplates are generated from originalTx hex itself)
      const changeOutputIndex = availableInputs.findIndex((input) =>
        inputTemplates.some(
          (template) =>
            template.txid === input.txid && template.vout === input.vout,
        ),
      );

      // If a match was found, update the analyzer with the correct changeOutputIndex
      if (changeOutputIndex !== -1) {
        analyzer.changeOutputIndex = changeOutputIndex;
      }

      // Check if we have any inputs for this transaction in our wallet
      // This is crucial for RBF because we can only replace transactions where we control the inputs
      const hasInputsInWallet = changeOutputIndex !== -1;

      // Check if we have any spendable outputs for this transaction
      // This is necessary for CPFP because we need to be able to spend an output to create a child transaction
      const hasSpendableOutputs = analyzer.canCPFP;

      return {
        analyzer,
        timeElapsed,
        txId: utxo.txid,
        txHex: utxo.transactionHex,
        // We can only perform RBF if:
        // 1. We have inputs from this transaction in our wallet (we control the inputs)
        // 2. The transaction signals RBF (checked by analyzer.canRBF)
        canRBF: hasInputsInWallet && analyzer.canRBF,
        // We can perform CPFP if we have any spendable outputs from this transaction
        canCPFP: hasSpendableOutputs,
      };
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
