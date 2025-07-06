import { useSelector } from "react-redux";
import { useMemo } from "react";
import { getWalletSlices, Slice, UTXO as SliceUTXO } from "selectors/wallet";
import { UTXO } from "@caravan/fees";
import { Coin, useTransactionCoins } from "clients/transactions";
import { MultisigAddressType, P2SH, P2SH_P2WSH, P2WSH } from "@caravan/bitcoin";

// need to create a function that given a coin and a slice returns a utxo that can be used
// to create a new transcation. a utxo needs to have:
// - txid
// - vout
// - value
// - prevTxHex
// - nonWitnessUtxo
// - witnessUtxo (script, value if segwit)
// - bip32Derivations (array of objects with pubkey, masterFingerprint, path)
// - witnessScript (script if segwit)
// - redeemScript (script if p2sh)
// - sequence number (optional)
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
 * @description Given a pending transaction from the current wallet, returns an array
 * of UTXO objects that can be used in a fee bumping transaction.
 * @param txid - The transaction ID to fetch utxos from
 * @returns The utxos from the transaction
 */
export const usePendingUtxos = (txid: string) => {
  const { data, isLoading, error } = useTransactionCoins(txid);
  const walletSlices = useSelector(getWalletSlices);

  const utxos = useMemo(() => {
    if (!data || !data.coins || data.transaction.status?.confirmed) {
      return [];
    }

    // Build lookup map and process coins in one chain
    const addressToSlice = new Map<string, Slice>(
      walletSlices.map((slice) => [slice.multisig.address, slice]),
    );

    return Array.from(data.coins.values())
      .filter((coin) => addressToSlice.has(coin.address))
      .map((coin) => {
        coin.slice = addressToSlice.get(coin.address);
        return getUtxoFromCoin(coin);
      });
  }, [data, walletSlices]);

  return { utxos, isLoading, error };
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
