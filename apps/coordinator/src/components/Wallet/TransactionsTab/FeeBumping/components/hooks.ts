import { TransactionAnalyzer } from "@caravan/fees";
import { extractUtxosForFeeBumping, validateTransactionInputs } from "../utils";
import { FeePriority, useFeeEstimates } from "clients/fees";
import { MultisigAddressType, Network } from "@caravan/bitcoin";
import { selectWalletConfig } from "selectors/wallet";
import { useSelector } from "react-redux";
import { useEffect, useMemo, useState } from "react";
import { TransactionDetails } from "@caravan/clients";
import { usePendingUtxos, useWalletUtxos } from "hooks/utxos";

export const useGetAvailableUtxos = (transaction?: TransactionDetails) => {
  const {
    utxos: pendingUtxos,
    isLoading,
    isError,
  } = usePendingUtxos(transaction?.txid || "");
  const walletUtxos = useWalletUtxos();

  // Memoize the combined UTXOs so it only recalculates when dependencies change
  const availableUtxos = useMemo(() => {
    // Return empty array if no transaction
    if (!transaction) return [];
    return extractUtxosForFeeBumping(pendingUtxos || [], walletUtxos || []);
  }, [pendingUtxos, walletUtxos, transaction]);

  return { availableUtxos, isLoading, isError };
};

export const useAnalyzeTransaction = (
  transaction: TransactionDetails,
  txHex: string,
) => {
  const {
    availableUtxos,
    isLoading: isLoadingAvailableUtxos,
    isError: isErrorAvailableUtxos,
  } = useGetAvailableUtxos(transaction!);

  const { data: feeEstimates, isLoading: isLoadingFeeEstimates } =
    useFeeEstimates();

  const { network, addressType, requiredSigners, totalSigners } =
    useSelector(selectWalletConfig);

  const [error, setError] = useState("");

  useEffect(() => {
    if (isErrorAvailableUtxos) {
      setError("There was an error getting available utxos");
    } else {
      setError("");
    }
  }, [isErrorAvailableUtxos]);

  const analysis = useMemo(() => {
    if (
      !transaction ||
      !txHex ||
      !availableUtxos.length ||
      isLoadingFeeEstimates
    )
      return null;
    try {
      // Validate inputs
      validateTransactionInputs(txHex, transaction.fee, availableUtxos);

      // Create analyzer with wallet-specific parameters
      const analyzer = new TransactionAnalyzer({
        txHex,
        network: network as Network,
        targetFeeRate: feeEstimates[FeePriority.MEDIUM] ?? 0,
        absoluteFee: transaction.fee.toString(),
        availableUtxos,
        requiredSigners,
        totalSigners,
        addressType: addressType as MultisigAddressType,
      });

      return analyzer.analyze();
    } catch (error) {
      console.error("Error analyzing transaction:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Unknown error analyzing transaction",
      );
    }
  }, [
    transaction?.txid,
    txHex,
    availableUtxos,
    feeEstimates,
    network,
    addressType,
    requiredSigners,
    totalSigners,
  ]);

  return {
    analysis: analysis ?? null,
    error,
    isLoading: isLoadingAvailableUtxos || isLoadingFeeEstimates,
  };
};
