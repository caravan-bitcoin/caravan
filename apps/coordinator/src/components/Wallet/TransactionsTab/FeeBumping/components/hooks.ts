import {
  CancelRbfOptions,
  createCancelRbfTransaction,
  TransactionAnalyzer,
  UTXO,
} from "@caravan/fees";
import { extractUtxosForFeeBumping, validateTransactionInputs } from "../utils";
import { FeePriority, useFeeEstimates } from "clients/fees";
import { MultisigAddressType, Network } from "@caravan/bitcoin";
import { selectWalletConfig } from "selectors/wallet";
import { useSelector } from "react-redux";
import { useEffect, useMemo, useState, useCallback } from "react";
import { TransactionDetails } from "@caravan/clients";
import { usePendingUtxos, useWalletUtxos } from "hooks/utxos";
import { useGetGlobalXpubs } from "../context/hooks";
import { DUST_IN_SATOSHIS } from "utils/constants";

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
    availableUtxos,
    error,
    isLoading: isLoadingAvailableUtxos || isLoadingFeeEstimates,
  };
};

export const useCreateCancelRBF = (
  transaction: TransactionDetails,
  txHex: string,
  availableUtxos: UTXO[],
) => {
  const { network, addressType, requiredSigners, totalSigners } =
    useSelector(selectWalletConfig);
  const globalXpubs = useGetGlobalXpubs();

  const createCancelRBF = useCallback(
    (cancelAddress: string, feeRate: number) => {
      if (
        !cancelAddress ||
        !feeRate ||
        !globalXpubs ||
        !availableUtxos ||
        !transaction ||
        !txHex
      ) {
        throw new Error("Missing required parameters for cancel RBF");
      }

      const cancelRbfOptions: CancelRbfOptions = {
        originalTx: txHex,
        network: network as Network,
        targetFeeRate: feeRate,
        absoluteFee: transaction.fee.toString(),
        availableInputs: availableUtxos,
        scriptType: addressType as MultisigAddressType,
        cancelAddress,
        dustThreshold: DUST_IN_SATOSHIS.toString(),
        strict: false,
        fullRBF: true,
        reuseAllInputs: true,
        requiredSigners,
        totalSigners,
        globalXpubs,
      };

      try {
        return createCancelRbfTransaction(cancelRbfOptions);
      } catch (error) {
        throw new Error(
          error instanceof Error
            ? error.message
            : "Unknown error creating cancel RBF",
        );
      }
    },
    [
      txHex,
      transaction?.fee,
      network,
      addressType,
      requiredSigners,
      totalSigners,
      globalXpubs,
      availableUtxos,
    ],
  );

  return { createCancelRBF };
};
