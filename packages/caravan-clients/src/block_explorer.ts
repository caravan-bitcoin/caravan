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

/**
 * Configuration for rate limiting API requests
 */
const RATE_LIMIT_CONFIG = {
  /**
   * Delay in milliseconds between API requests to prevent rate limiting
   * This is a reasonable default based on common API rate limits
   * Can be adjusted based on specific API requirements
   */
  REQUEST_DELAY: 500,
} as const;

/**
 * Interface for address status response
 */
interface AddressStatusResponse {
  used: boolean;
}

/**
 * Creates a delay between API requests to prevent rate limiting
 * Uses a more predictable setTimeout with Promise approach
 * @returns Promise that resolves after the configured delay
 */
const throttleRequest = () =>
  new Promise<void>((resolve) =>
    setTimeout(resolve, RATE_LIMIT_CONFIG.REQUEST_DELAY),
  );

/**
 * Fetch information for signing transactions from block explorer API
 * @param {string} address - The address from which to obtain the information
 * @param {Network} network - The network for the transaction to sign (mainnet|testnet)
 * @returns {multisig.UTXO} object for signing transaction inputs
 * @throws Will throw if the API request fails or if data is invalid
 */
export async function blockExplorerGetAddresesUTXOs(
  address: string,
  network: Network,
): Promise<FormattedUTXO[]> {
  try {
    // Fetch initial UTXO data
    const utxosResult = await axios.get<BlockExplorerUTXOResponse[]>(
      blockExplorerAPIURL(`/address/${address}/utxo`, network),
    );
    const utxos = utxosResult.data;

    // Process each UTXO with proper throttling
    return await Promise.all(
      utxos.map(async (utxo) => {
        // Add delay to prevent rate limiting
        await throttleRequest();

        // Fetch transaction details
        const transactionResult = await axios.get<string>(
          blockExplorerAPIURL(`/tx/${utxo.txid}/hex`, network),
        );

        const amount = new BigNumber(utxo.value);

        return {
          confirmed: utxo.status.confirmed,
          txid: utxo.txid,
          index: utxo.vout,
          amount: satoshisToBitcoins(amount.toString()),
          amountSats: amount,
          transactionHex: transactionResult.data,
          time: utxo.status.block_time,
        };
      }),
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw error.response?.data || error;
    }
    throw error;
  }
}

/**
 * Checks if a given address has been used (received any transactions)
 * @param address - The Bitcoin address to check
 * @param network - The Bitcoin network to use (mainnet|testnet)
 * @returns Promise resolving to an object containing the address usage status
 * @throws Will throw if the API request fails
 */
export async function blockExplorerGetAddressStatus(
  address: string,
  network: Network,
): Promise<AddressStatusResponse> {
  try {
    await throttleRequest();

    const addressResult = await axios.get<BlockExplorerAddressResponse>(
      blockExplorerAPIURL(`/address/${address}`, network),
    );
    const addressData = addressResult.data;

    return {
      used:
        addressData.chain_stats.funded_txo_count > 0 ||
        addressData.mempool_stats.funded_txo_count > 0,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw error.response?.data || error;
    }
    throw error;
  }
}

/**
 * Fetches the estimated fee rate for transactions
 * @param network - The Bitcoin network to use (mainnet|testnet)
 * @returns Promise resolving to the estimated fee rate in satoshis/vbyte
 * @throws Will throw if the API request fails
 */
export async function blockExplorerGetFeeEstimate(
  network: Network,
): Promise<number> {
  try {
    const feeEstimatesResult = await axios.get<Record<string, number>>(
      blockExplorerAPIURL("/fee-estimates", network),
    );

    // We use the 2-block target fee estimate
    return Math.ceil(feeEstimatesResult.data[2]);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw error.response?.data || error;
    }
    throw error;
  }
}

/**
 * Broadcasts a raw transaction to the Bitcoin network
 * @param transactionHex - The raw transaction in hexadecimal format
 * @param network - The Bitcoin network to use (mainnet|testnet)
 * @returns Promise resolving to the transaction ID if successful
 * @throws Will throw if the broadcast fails or if the transaction is invalid
 */
export async function blockExplorerBroadcastTransaction(
  transactionHex: string,
  network: Network,
): Promise<string> {
  try {
    const broadcastResult = await axios.post<string>(
      blockExplorerAPIURL("/tx", network),
      transactionHex,
    );
    return broadcastResult.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw error.response?.data || error;
    }
    throw error;
  }
}

/**
 * @module block_explorer
 */
