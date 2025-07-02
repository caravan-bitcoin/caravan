import { useMemo } from "react";
import { useSelector } from "react-redux";
import { Psbt } from "bitcoinjs-lib-v6";

import { TransactionDetails } from "@caravan/clients";
import { Slice } from "selectors/wallet";
import { matchPsbtInputsToUtxos } from "utils/psbtUtils";
import { useTransactionsWithHex } from "clients/transactions";
import {
  reconstructUtxosFromPendingTransactions,
  extractNeededTransactionIds,
} from "utils/utxoReconstruction";
import { selectPsbtInputs, selectIsRbfPsbt } from "selectors/transaction";

/**
 * Custom hook to reconstruct UTXOs referenced by pending transactions.
 *
 * In situations where the wallet is working with unconfirmed transactions (e.g., in RBF workflows),
 * Bitcoin Core may not expose all UTXOs, especially if they are consumed or created in the mempool.
 * This hook addresses that by:
 *
 * 1. Identifying UTXO input IDs that need reconstruction (e.g., from an incomplete PSBT).
 * 2. Fetching original transactions that created those UTXOs.
 * 3. Reconstructing full UTXO data using `reconstructUtxosFromPendingTransactions()`.
 *
 * @param pendingTransactions - Unconfirmed transactions currently in the wallet.
 * @param allSlices - Wallet metadata (used to identify UTXO ownership).
 * @param neededInputIds - Set of `txid:vout` strings representing UTXOs to reconstruct.
 * @returns An object containing:
 *   - `utxos`: Array of reconstructed UTXO objects.
 *   - `isLoading`: Indicates if transaction data is still being fetched.
 *   - `error`: Any error encountered during transaction retrieval.
 */
export const useReconstructedUtxos = (
  pendingTransactions: TransactionDetails[],
  allSlices: Slice[],
  neededInputIds: Set<string>,
) => {
  // Extract transaction IDs we need to fetch
  const neededTxids = useMemo(
    () => extractNeededTransactionIds(pendingTransactions, neededInputIds),
    [pendingTransactions, neededInputIds],
  );

  // Fetch all needed transactions with hex
  const transactionQueries = useTransactionsWithHex(neededTxids);

  // Reconstruct UTXOs from fetched data
  const reconstructedUtxos = useMemo(() => {
    if (transactionQueries.some((q) => q.isLoading)) return [];

    const txLookup = new Map(
      transactionQueries
        .filter((q) => q.data)
        .map((q) => [q.data!.txid, q.data!]),
    );

    return reconstructUtxosFromPendingTransactions(
      pendingTransactions,
      txLookup,
      allSlices,
      neededInputIds,
    );
  }, [transactionQueries, pendingTransactions, allSlices, neededInputIds]);

  return {
    utxos: reconstructedUtxos,
    isLoading: transactionQueries.some((q) => q.isLoading),
    error: transactionQueries.find((q) => q.error)?.error,
  };
};

/**
 * Hook that provides complete PSBT input resolution
 * Handles both normal PSBTs and RBF PSBTs automatically
 */
export const usePsbtInputs = (psbt: Psbt | null) => {
  // Get PSBT inputs  from selectors
  const inputs = useSelector((state) =>
    psbt ? selectPsbtInputs(state, psbt) : null,
  );

  const isRbfPsbt = useSelector((state) =>
    psbt ? selectIsRbfPsbt(state, psbt) : false,
  );

  const {
    utxos: reconstructedUtxos,
    isLoading: isReconstructing,
    error: reconstructionError,
  } = useReconstructedUtxos(
    inputs?.pendingInputs?.pendingTransactions || [],
    inputs?.pendingInputs?.allSlices || [],
    inputs?.pendingInputs?.neededInputIds || new Set(),
  );

  // Combine all inputs
  const allInputs = useMemo(() => {
    if (!inputs || !psbt) return [];

    const { availableInputs, inputIdentifiers, spendableSlices } = inputs;

    // For normal PSBTs, just return available inputs
    if (!isRbfPsbt) {
      return availableInputs;
    }

    // For RBF PSBTs, combine available + reconstructed
    if (!isReconstructing && reconstructedUtxos.length >= 0) {
      return matchPsbtInputsToUtxos(
        inputIdentifiers,
        spendableSlices,
        reconstructedUtxos,
      );
    }

    return [];
  }, [inputs, psbt, isRbfPsbt, isReconstructing, reconstructedUtxos]);

  return {
    inputs: allInputs,
    isLoading: isReconstructing,
    error: reconstructionError,
    isRbfPsbt,
    availableInputCount: inputs?.availableInputs?.length || 0,
    reconstructedInputCount: reconstructedUtxos.length,
    totalRequiredInputCount: psbt?.txInputs.length || 0,
  };
};
