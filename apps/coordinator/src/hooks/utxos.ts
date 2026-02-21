import { useSelector } from "react-redux";
import { useEffect, useMemo, useState } from "react";
import { Psbt } from "bitcoinjs-lib";
import {
  getWalletSlices,
  Slice,
  UTXO as SliceUTXO,
  WalletState,
} from "selectors/wallet";
import {
  selectAvailableInputsFromPSBT,
  selectMissingInputIdentifiersFromPSBT,
} from "selectors/transaction";
import { UTXO } from "@caravan/transactions";
import {
  Coin,
  fetchTransactionCoins,
  usePendingTransactions,
  useTransactionsWithHex,
} from "clients/transactions";
import { MultisigAddressType, P2SH, P2SH_P2WSH, P2WSH } from "@caravan/bitcoin";
import { useGetClient } from "hooks/client";
import { TransactionDetails } from "@caravan/clients";
import {
  extractNeededTransactionIds,
  reconstructCoinsFromPendingTransactions,
  ReconstructedCoin,
  matchPsbtInputsToUtxos,
} from "utils/utxoReconstruction";
import { getInputIdentifiersFromPsbt } from "utils/psbtUtils";

/**
 * Converts a ReconstructedCoin to a UTXO format compatible with @caravan/transactions.
 *
 * This function takes a coin that has been reconstructed from transaction data and
 * transforms it into the UTXO format required for PSBT signing. The specific fields
 * included depend on the address type (P2SH, P2WSH, or P2SH-P2WSH).
 *
 * @param coin - The reconstructed coin with all necessary metadata
 * @returns A properly formatted UTXO object ready for transaction signing
 * @throws Error if the address type is unsupported
 */
export const getUtxoFromCoin = (coin: ReconstructedCoin): UTXO => {
  const baseUtxo = {
    txid: coin.txid,
    vout: coin.vout,
    index: coin.vout,
    value: coin.value,
    amountSats: coin.value,
    prevTxHex: coin.prevTxHex,
    transactionHex: coin.prevTxHex,
    confirmed: coin.confirmed,
    bip32Derivations: coin.bip32Derivations,

    // Wallet metadata to satisfy the 'Input' type
    multisig: coin.multisig,
    bip32Path: coin.bip32Path,
    change: coin.change,
  };

  const nonWitnessUtxo = Buffer.from(coin.prevTxHex, "hex");
  const witnessUtxo = {
    script: Buffer.from(coin.witnessScript, "hex"),
    value: parseInt(coin.value),
  };

  switch (coin.addressType) {
    case P2SH:
      return {
        ...baseUtxo,
        nonWitnessUtxo,
        redeemScript: Buffer.from(coin.redeemScript, "hex"),
      } as UTXO;
    case P2WSH:
      return {
        ...baseUtxo,
        witnessScript: Buffer.from(coin.witnessScript, "hex"),
        witnessUtxo,
      } as UTXO;
    case P2SH_P2WSH:
      return {
        ...baseUtxo,
        nonWitnessUtxo,
        redeemScript: Buffer.from(coin.redeemScript, "hex"),
        witnessScript: Buffer.from(coin.witnessScript, "hex"),
        witnessUtxo,
      } as UTXO;
    default:
      throw new Error(`Unsupported address type: ${coin.addressType}`);
  }
};

/**
 * Converts a wallet slice's UTXOs to ReconstructedCoin format.
 *
 * This flattens the UTXO data from a slice and enriches it with wallet metadata
 * needed for transaction signing. Useful for getting all spendable coins from a wallet.
 *
 * @param slice - A wallet slice containing UTXOs and multisig information
 * @returns Array of reconstructed coins from this slice
 */
const getCoinFromSliceUtxos = (slice: Slice): ReconstructedCoin[] => {
  const { addressType } = JSON.parse(slice.multisig.braidDetails);

  return slice.utxos.map((utxo: SliceUTXO) => ({
    txid: utxo.txid,
    vout: utxo.index,
    value: utxo.amountSats,
    prevTxHex: utxo.transactionHex,
    address: slice.multisig.address,
    confirmed: utxo.confirmed,

    // Signing metadata
    addressType,
    bip32Derivations: slice.multisig.bip32Derivation,
    redeemScript: slice.multisig.redeem.output,
    witnessScript: slice.multisig.redeem.output,

    // Wallet metadata
    multisig: slice.multisig,
    bip32Path: slice.bip32Path,
    change: slice.change,
  }));
};

/**
 * Efficiently combines and deduplicates UTXOs from multiple sources for fee bumping.
 *
 * This function merges UTXOs from pending transactions (required for RBF) with
 * additional wallet UTXOs (available for adding inputs). It uses an optimized
 * deduplication strategy to handle large UTXO sets efficiently.
 *
 * The order matters: pending UTXOs are prioritized because they're required
 * for Replace-by-Fee operations, while wallet UTXOs provide additional
 * flexibility for fee bumping strategies.
 *
 * @param pendingUtxos - UTXOs from the pending transaction being fee-bumped
 * @param walletUtxos - Additional UTXOs from wallet for fee bumping flexibility
 * @returns Deduplicated array of UTXOs prioritized for fee bumping operations
 *
 * @performance Uses Set-based deduplication for O(1) lookup performance
 * @performance Processes UTXOs in single pass for optimal memory usage
 */
export const extractSpendableUtxos = (
  pendingUtxos: UTXO[],
  walletUtxos: UTXO[],
): UTXO[] => {
  const processedUtxoKeys = new Set<string>();

  // Helper function to create unique UTXO identifier
  const createUtxoKey = (utxo: UTXO): string => `${utxo.txid}:${utxo.vout}`;

  return [...pendingUtxos, ...walletUtxos].filter((utxo) => {
    const key = createUtxoKey(utxo);
    if (processedUtxoKeys.has(key)) return false;
    processedUtxoKeys.add(key);
    return true;
  });
};

/**
 * Custom hook to reconstruct UTXOs that were consumed as inputs by a specific pending transaction.
 *
 * ## Purpose:
 * When you want to perform RBF (Replace-By-Fee) on a pending transaction, you need to know
 * what UTXOs that transaction originally consumed so you can reuse them in the replacement.
 *
 * ## How it works:
 * 1. **Input**: A pending transaction ID
 * 2. **Fetch**: Gets the transaction details and identifies its input UTXOs
 * 3. **Reconstruct**: Rebuilds UTXO objects with wallet metadata for those inputs
 * 4. **Output**: Array of UTXOs that the pending transaction consumed
 *
 * ## Difference from `useReconstructedUtxos`:
 * - This hook: "Given pending TX, what UTXOs did it spend?" (forward lookup)
 * - `useReconstructedUtxos`: "Given UTXO IDs I need, find them even if hidden" (reverse lookup)
 *
 * @param txid - The transaction ID of the pending transaction to analyze
 * @returns Object containing:
 *   - `utxos`: Array of UTXO objects that this transaction consumed as inputs
 *   - `isLoading`: Whether transaction data is still being fetched
 *   - `isError`: Whether an error occurred during fetching
 */
export const usePendingUtxos = (txid: string) => {
  const client = useGetClient();
  const walletSlices = useSelector(getWalletSlices);
  const [coins, setCoins] = useState<Map<string, Coin>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (client && txid) {
      setIsLoading(true);
      fetchTransactionCoins(txid, client)
        .then(setCoins)
        .catch(() => setIsError(true))
        .finally(() => setIsLoading(false));
    }
  }, [client, txid]);

  const utxos = useMemo(() => {
    if (!coins || coins.size === 0) {
      return [];
    }

    // Build lookup map for efficient slice finding
    const addressToSlice = new Map<string, Slice>(
      walletSlices.map((slice) => [slice.multisig.address, slice]),
    );

    return Array.from(coins.values())
      .filter((coin) => addressToSlice.has(coin.address))
      .map((coin) => {
        const slice = addressToSlice.get(coin.address)!;
        const { addressType } = JSON.parse(slice.multisig.braidDetails);

        // Construct the unified type for pending tx inputs
        const reconstructedCoin: ReconstructedCoin = {
          txid: coin.prevTxId,
          vout: coin.vout,
          value: coin.value,
          prevTxHex: coin.prevTxHex,
          address: coin.address,
          confirmed: false, // Pending inputs are by definition unconfirmed
          addressType,
          bip32Derivations: slice.multisig.bip32Derivation,
          redeemScript: slice.multisig.redeem.output,
          witnessScript: slice.multisig.redeem.output,
          multisig: slice.multisig,
          bip32Path: slice.bip32Path,
          change: slice.change,
        };

        return getUtxoFromCoin(reconstructedCoin);
      });
  }, [coins, walletSlices]);

  return { utxos, isLoading, isError };
};

/**
 * Returns all the UTXOs from the current wallet.
 *
 * Use with usePendingUtxos to get all available coins/UTXOs
 * that can be used in a fee bumping transaction.
 *
 * @returns Array of UTXOs from all wallet slices
 */
export const useWalletUtxos = (): UTXO[] => {
  const walletSlices = useSelector(getWalletSlices);
  return walletSlices.flatMap(getCoinFromSliceUtxos).map(getUtxoFromCoin);
};

/**
 * Returns available UTXOs for a given transaction, combining pending and wallet UTXOs.
 *
 * This hook is useful for fee bumping scenarios where you need both the UTXOs
 * from a pending transaction and additional wallet UTXOs.
 *
 * @param transaction - Optional transaction to get pending UTXOs for
 * @returns Object containing:
 *   - `availableUtxos`: Combined and deduplicated UTXOs
 *   - `isLoading`: Whether data is still being fetched
 *   - `isError`: Whether an error occurred
 */
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
    return extractSpendableUtxos(pendingUtxos || [], walletUtxos || []);
  }, [pendingUtxos, walletUtxos, transaction]);

  return { availableUtxos, isLoading, isError };
};

/**
 * Custom hook to reconstruct specific UTXOs that are referenced in a PSBT but hidden by pending transactions.
 *
 * ## How this differs from `usePendingUtxos`:
 *
 * **`usePendingUtxos`** (Forward Direction):
 * - Input: A pending transaction ID
 * - Output: "What UTXOs did this pending transaction consume as inputs?"
 * - Use case: RBF - you want to reuse the same inputs that a pending transaction used
 * - Flow: Pending TX → Find its inputs → Reconstruct those UTXOs
 *
 * **`useReconstructedUtxos`** (Reverse Direction):
 * - Input: Specific UTXO identifiers (from a PSBT) that you need
 * - Output: "Here are those specific UTXOs, even if they're hidden by pending transactions"
 * - Use case: PSBT Import - you have a PSBT that references UTXOs not visible in `listunspent`
 * - Flow: Needed UTXO IDs → Search pending TXs → Find which TX consumed them → Reconstruct
 *
 * ## Why UTXOs become "hidden":
 * When a transaction is pending (unconfirmed), Bitcoin Core's `listunspent` won't return UTXOs
 * that are consumed by that pending transaction (to prevent double-spending). However, in RBF
 * scenarios or when importing PSBTs, we legitimately need access to these "consumed" UTXOs.
 *
 * ## Reconstruction Process:
 * 1. **Identify**: Given a set of UTXO identifiers (`txid:vout`) that we need to find
 * 2. **Search**: Look through pending transactions to see which ones consumed these UTXOs
 * 3. **Fetch**: Get the original transactions that created those UTXOs
 * 4. **Reconstruct**: Build complete UTXO objects with wallet metadata for signing
 *
 * @param pendingTransactions - Unconfirmed transactions currently in the wallet
 * @param allSlices - Wallet metadata (used to identify UTXO ownership and get signing info)
 * @param neededInputIds - Set of `txid:vout` strings representing specific UTXOs to reconstruct
 * @returns An object containing:
 *   - `utxos`: Array of reconstructed UTXO objects with wallet metadata
 *   - `hasPendingInputs`: Whether any of the needed inputs were found in pending transactions
 *   - `isLoading`: Indicates if transaction data is still being fetched
 *   - `error`: Any error encountered during transaction retrieval
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
  const { reconstructedUtxos, hasPendingInputs } = useMemo(() => {
    if (transactionQueries.some((q) => q.isLoading)) {
      return {
        reconstructedUtxos: [],
        hasPendingInputs: false,
      };
    }

    const txLookup = new Map(
      transactionQueries
        .filter((q) => q.data)
        .map((q) => [q.data!.txid, q.data!]),
    );

    return reconstructCoinsFromPendingTransactions(
      pendingTransactions,
      txLookup,
      allSlices,
      neededInputIds,
    );
  }, [transactionQueries, pendingTransactions, allSlices, neededInputIds]);

  return {
    utxos: reconstructedUtxos,
    hasPendingInputs,
    isLoading: transactionQueries.some((q) => q.isLoading),
    error: transactionQueries.find((q) => q.error)?.error,
  };
};

/**
 * Custom hook to handle PSBT input resolution and reconstruction of UTXOs.
 *
 * This is the main hook for resolving all inputs needed to sign a PSBT. It handles
 * both normal PSBTs (where inputs are available in the wallet) and RBF PSBTs (where
 * inputs need to be reconstructed from pending transactions).
 *
 * @param parsedPsbt - The parsed PSBT object
 * @returns Object containing:
 *   - `allInputs`: All resolved inputs ready for signing
 *   - `hasPendingInputs`: Whether any inputs came from pending transactions (indicates RBF)
 *   - `reconstructionLoading`: Whether reconstruction is still in progress
 *   - `reconstructionError`: Any error that occurred during reconstruction
 *   - `psbtInputIdentifiers`: Set of all input identifiers in the PSBT
 *   - `missingInputIds`: Set of input identifiers not found in the wallet
 */
export const usePsbtInputs = (parsedPsbt: Psbt) => {
  const allSlices = useSelector(getWalletSlices);

  const psbtInputIdentifiers = useMemo(
    () => (parsedPsbt ? getInputIdentifiersFromPsbt(parsedPsbt) : new Set<string>()),
    [parsedPsbt],
  );

  const missingInputIds = useSelector((state: WalletState) =>
    parsedPsbt
      ? selectMissingInputIdentifiersFromPSBT(state, parsedPsbt)
      : new Set<string>(),
  );

  const availableInputs = useSelector((state: WalletState) =>
    parsedPsbt ? selectAvailableInputsFromPSBT(state, parsedPsbt) : [],
  );

  const { transactions: pendingTxs } = usePendingTransactions();

  const {
    utxos: reconstructedUtxos,
    hasPendingInputs,
    isLoading: reconstructionLoading,
    error: reconstructionError,
  } = useReconstructedUtxos(pendingTxs, allSlices, missingInputIds);

  // Combine all inputs
  const allInputs = useMemo(() => {
    if (!availableInputs || !parsedPsbt) return [];

    // For normal PSBTs, just return available inputs
    if (!hasPendingInputs) {
      return availableInputs;
    }

    if (!reconstructionLoading && reconstructedUtxos.length > 0) {
      return matchPsbtInputsToUtxos(
        psbtInputIdentifiers,
        availableInputs,
        reconstructedUtxos,
      );
    }

    return [];
  }, [
    availableInputs,
    parsedPsbt,
    hasPendingInputs,
    reconstructionLoading,
    reconstructedUtxos,
    psbtInputIdentifiers,
  ]);

  return {
    allInputs,
    hasPendingInputs,
    reconstructionLoading,
    reconstructionError,
    psbtInputIdentifiers,
    missingInputIds,
  };
};