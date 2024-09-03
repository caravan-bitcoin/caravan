import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { calculateTimeElapsed } from "../components/Wallet/fee-bumping/utils";
import { useGetClient } from "./client";
import { TransactionAnalyzer } from "@caravan/fees";
import {
  RootState,
  UTXO,
  AnalyzerWithTimeElapsed,
} from "components/types/fees";

export const useGetPendingTransactions = () => {
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
  const analyzeTransaction = async (
    utxo: UTXO,
    currentNetworkFeeRate: number,
    settings: RootState["settings"],
  ): Promise<AnalyzerWithTimeElapsed> => {
    try {
      const analyzer = new TransactionAnalyzer({
        txHex: utxo.transactionHex,
        network: settings.network,
        targetFeeRate: currentNetworkFeeRate,
        absoluteFee: utxo.amountSats.toString(),
        availableUtxos: [], // need to provide available UTXOs for CPFP
        requiredSigners: settings.requiredSigners,
        totalSigners: settings.totalSigners,
        addressType: settings.addressType,
      });
      console.log("checkl11", analyzer.analyze());
      // Add the timeElapsed property to the analyzer instance
      (analyzer as AnalyzerWithTimeElapsed).timeElapsed = calculateTimeElapsed(
        utxo.time,
      );

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
          pendingTxs.map(async (utxo) =>
            analyzeTransaction(utxo, currentNetworkFeeRate, settings),
          ),
        );
        console.log("done", pendingTxs);
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
