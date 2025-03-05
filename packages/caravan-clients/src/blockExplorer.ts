/* eslint-disable @typescript-eslint/no-explicit-any */
/*
TODO: cleanup the no explicit any. added to quickly type error catches
*/
import axios from "axios";
import BigNumber from "bignumber.js";
import {
  satoshisToBitcoins,
  blockExplorerAPIURL,
  Network,
} from "@caravan/bitcoin";
import {
  BlockExplorerUTXOResponse,
  BlockExplorerAddressResponse,
  FormattedUTXO,
} from "./types";

// FIXME: hack
/**
 * Delay helper function to prevent API throttling
 * @returns {Promise<void>} A promise that resolves after a delay
 * @private
 */
const delay = (): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, 500));
};

/**
 * Fetch information for signing transactions from block explorer API
 * @param {string} address - The address from which to obtain the information
 * @param {Network} network - The network for the transaction to sign (mainnet|testnet)
 * @returns {Promise<FormattedUTXO[]>}} object for signing transaction inputs
 */
export async function blockExplorerGetAddresesUTXOs(
  address: string,
  network: Network,
): Promise<FormattedUTXO[]> {
  try {
    const utxosResult = await axios.get<BlockExplorerUTXOResponse[]>(
      blockExplorerAPIURL(`/address/${address}/utxo`, network),
    );

    const utxos = utxosResult.data;

    return await Promise.all(
      utxos.map(async (utxo) => {
        // FIXME: inefficient, need to cache here by utxo.txid
        // FIXME: delay hack to prevent throttling
        await delay();

        const transactionResult = await axios.get(
          blockExplorerAPIURL(`/tx/${utxo.txid}/hex`, network),
        );
        const transactionHex = transactionResult.data;
        const amount = new BigNumber(utxo.value);
        return {
          confirmed: utxo.status.confirmed,
          txid: utxo.txid,
          index: utxo.vout,
          amount: satoshisToBitcoins(amount.toString()),
          amountSats: amount,
          transactionHex,
          time: utxo.status.block_time,
        };
      }),
    );
  } catch (e: any) {
    throw (e.response && e.response.data) || e;
  }
}

/**
 * Check if an address has been used by querying a block explorer API
 * @param {string} address - The address to check
 * @param {Network} network - The network to check on (mainnet|testnet)
 * @returns {Promise<{used: boolean}>} Object with used status
 */
export async function blockExplorerGetAddressStatus(
  address: string,
  network: Network,
): Promise<{ used: boolean }> {
  try {
    // FIXME: delay hack to prevent throttling
    await delay();

    const addressResult = await axios.get<BlockExplorerAddressResponse>(
      blockExplorerAPIURL(`/address/${address}`, network),
    );

    const addressData = addressResult.data;

    return {
      used:
        addressData.chain_stats.funded_txo_count > 0 ||
        addressData.mempool_stats.funded_txo_count > 0,
    };
  } catch (e: any) {
    throw (e.response && e.response.data) || e;
  }
}

/**
 * Fetch fee estimates from a block explorer API
 * @param {Network} network - The network to get fee estimates for (mainnet|testnet)
 * @returns {Promise<number>} The estimated fee rate in satoshis per byte
 */
export async function blockExplorerGetFeeEstimate(
  network: Network,
): Promise<number> {
  try {
    const feeEstimatesResult = await axios.get<Record<Network, number>>(
      blockExplorerAPIURL("/fee-estimates", network),
    );

    const feeEstimates = feeEstimatesResult.data;

    // Return fee estimate for 2 blocks confirmation
    return Math.ceil(feeEstimates[2]);
  } catch (e: any) {
    throw (e.response && e.response.data) || e;
  }
}

/**
 * Broadcast a raw transaction to the network via a block explorer API
 * @param {string} transactionHex - The hexadecimal string of the transaction to broadcast
 * @param {Network} network - The network to broadcast to (mainnet|testnet)
 * @returns {Promise<string>} The transaction ID of the broadcast transaction
 */
export async function blockExplorerBroadcastTransaction(
  transactionHex: string,
  network: Network,
): Promise<string> {
  try {
    const broadcastResult = await axios.post(
      blockExplorerAPIURL("/tx", network),
      transactionHex,
    );
    return broadcastResult.data;
  } catch (e: any) {
    throw (e.response && e.response.data) || e;
  }
}

/**
 * @module block_explorer
 */
