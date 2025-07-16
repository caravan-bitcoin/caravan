import { useSelector } from "react-redux";
import { useEffect, useMemo, useState } from "react";
import { getWalletSlices, Slice, UTXO as SliceUTXO } from "selectors/wallet";
import { UTXO } from "@caravan/fees";
import { Coin, fetchTransactionCoins } from "clients/transactions";
import { MultisigAddressType, P2SH, P2SH_P2WSH, P2WSH } from "@caravan/bitcoin";
import { TransactionDetails } from "@caravan/clients";
import { useGetClient } from "./client";

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
const getUtxoFromCoin = (coin: Coin): UTXO => {
  const { slice } = coin;
  if (!slice) {
    throw new Error("Slice not found in coin");
  }

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
 * @description Given a pending transaction from the current wallet, returns an array
 * of UTXO objects that can be used in a fee bumping transaction.
 * @param txid - The transaction ID to fetch utxos from
 * @returns The utxos from the transaction
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
