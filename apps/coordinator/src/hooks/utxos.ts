import { useSelector } from "react-redux";
import { useEffect, useMemo, useState } from "react";
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
import { UTXO } from "@caravan/fees";
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
  reconstructUtxosFromPendingTransactions,
  ReconstructedUtxos,
  matchPsbtInputsToUtxos,
} from "utils/uxtoReconstruction";
import { Psbt } from "bitcoinjs-lib";
import { getInputIdentifiersFromPsbt } from "utils/psbtUtils";

/*
 * need to create a function that given a coin and a slice returns a utxo that can be used
 * to create a new transcation. a utxo needs to have:
 * - txid
 * - vout
 * - value
 * - prevTxHex
 * - nonWitnessUtxo
 * - witnessUtxo (script, value if segwit)
 * - bip32Derivations (array of objects with pubkey, masterFingerprint, path)
 * - witnessScript (script if segwit)
 * - redeemScript (script if p2sh)
 * - sequence number (optional)
 */
export const getUtxoFromCoin = (coin: Coin): UTXO => {
  const { slice } = coin;
  if (!slice) {
    throw new Error("Slice not found in coin");
  }
  console.log("coin", coin);
  const { addressType }: { addressType?: MultisigAddressType } = JSON.parse(
    slice.multisig.braidDetails,
  );

  if (!addressType) {
    throw new Error("Address type not found in braid details");
  }

  const baseUtxo = {
    txid: coin.prevTxId,
    vout: coin.vout,
    value: coin.value,
    prevTxHex: coin.prevTxHex,
    bip32Derivations: slice.multisig.bip32Derivation,
  };
  const nonWitnessUtxo = Buffer.from(coin.prevTxHex, "hex");
  const witnessUtxo = {
    script: slice.multisig.redeem.output,
    value: parseInt(coin.value),
  };
  const redeemScript = slice.multisig.redeem.output;
  const witnessScript = slice.multisig.redeem.output;
  switch (addressType) {
    case P2SH:
      return {
        ...baseUtxo,
        nonWitnessUtxo,
        redeemScript,
      };
    case P2WSH:
      return {
        ...baseUtxo,
        witnessScript,
        witnessUtxo,
      };
    case P2SH_P2WSH:
      return {
        ...baseUtxo,
        nonWitnessUtxo,
        redeemScript,
        witnessScript,
      };
    default:
      throw new Error(`Unsupported address type: ${addressType}`);
  }
};

// This is useful for flattening the utxos from a wallet into a list of coins
const getCoinFromSliceUtxos = (slice: Slice): Coin[] => {
  return slice.utxos.map((utxo: SliceUTXO) => {
    return {
      prevTxId: utxo.txid,
      vout: utxo.index,
      address: slice.multisig.address,
      value: utxo.amountSats,
      prevTxHex: utxo.transactionHex,
      slice,
    };
  });
};

/**
 * Efficiently combines and deduplicates UTXOs from multiple sources for fee bumping
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
 *
 * @example
 * const combinedUtxos = extractSpendableUtxos(
 *   pendingTransactionUtxos, // From usePendingUtxos hook
 *   availableWalletUtxos     // From useWalletUtxos hook
 * );
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
        .catch(setIsError)
        .finally(() => setIsLoading(false));
    }
  }, [client, txid]);

  const utxos = useMemo(() => {
    if (!coins || coins.size === 0) {
      return [];
    }

    // Build lookup map and process coins in one chain
    const addressToSlice = new Map<string, Slice>(
      walletSlices.map((slice) => [slice.multisig.address, slice]),
    );

    return Array.from(coins.values())
      .filter((coin) => addressToSlice.has(coin.address))
      .map((coin) => {
        coin.slice = addressToSlice.get(coin.address);
        return getUtxoFromCoin(coin);
      });
  }, [coins, walletSlices]);

  return { utxos, isLoading, isError };
};

/**
 * @description Returns all the utxos from the current wallet.
 * Use with usePendingUtxos to get all available coins/utxos
 * that can be used in a fee bumping transaction.
 * @returns The utxos from the wallet
 */
export const useWalletUtxos = () => {
  const walletSlices = useSelector(getWalletSlices);
  return walletSlices.flatMap(getCoinFromSliceUtxos).map(getUtxoFromCoin);
};

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
 * ## Example Scenario:
 * ```
 * 1. You have UTXO A (txid:123, vout:0) in your wallet
 * 2. You create pending Transaction X that spends UTXO A
 * 3. Bitcoin Core hides UTXO A from listunspent (since it's "spent" by pending TX X)
 * 4. Someone gives you a PSBT that also wants to spend UTXO A (for RBF)
 * 5. This hook finds UTXO A by looking at what Transaction X consumed
 * 6. Returns reconstructed UTXO A ready for the new PSBT signing
 * ```
 *
 * @param pendingTransactions - Unconfirmed transactions currently in the wallet
 * @param allSlices - Wallet metadata (used to identify UTXO ownership and get signing info)
 * @param neededInputIds - Set of `txid:vout` strings representing specific UTXOs to reconstruct
 * @returns An object containing:
 *   - `utxos`: Array of reconstructed UTXO objects with wallet metadata
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
        reconstructedUtxos: [] as ReconstructedUtxos[],
        hasPendingInputs: false,
      };
    }

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
    hasPendingInputs,
    isLoading: transactionQueries.some((q) => q.isLoading),
    error: transactionQueries.find((q) => q.error)?.error,
  };
};

/**
 * Custom hook to handle PSBT input resolution and reconstruction of UTXO's
 * @param  parsedPsbt - The parsed PSBT object
 * @returns  Contains allInputs, isRbfPSBT, loading/error states
 */
export const usePsbtInputs = (parsedPsbt: Psbt) => {
  const allSlices = useSelector(getWalletSlices);

  const psbtInputIdentifiers = useMemo(
    () =>
      parsedPsbt ? getInputIdentifiersFromPsbt(parsedPsbt) : new Set<string>(),
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
