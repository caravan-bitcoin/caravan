/* eslint-disable @typescript-eslint/no-explicit-any */
/*
TODO: cleanup the no explicit any. added to quickly type error catches
*/
import { Network, sortInputs } from "@caravan/bitcoin";
import BigNumber from "bignumber.js";
import {
  blockExplorerGetAddresesUTXOs,
  blockExplorerGetFeeEstimate,
  blockExplorerBroadcastTransaction,
  blockExplorerGetAddressStatus,
} from "./blockExplorer";
import { bitcoindListUnspent, bitcoindGetAddressStatus } from "./wallet";
import {
  bitcoindEstimateSmartFee,
  bitcoindSendRawTransaction,
  bitcoindParams,
  isWalletAddressNotFoundError,
} from "./bitcoind";

import { BLOCK_EXPLORER, BITCOIND, ClientConfig, UTXOUpdates } from "./types";

/**
 * Type guard to check if client has required bitcoind parameters
 */
function isBitcoindClient(
  client: ClientConfig,
): client is Required<Omit<ClientConfig, "walletName">> {
  return (
    client.type === BITCOIND &&
    typeof client.url === "string" &&
    typeof client.username === "string" &&
    typeof client.password === "string"
  );
}

/**
 * Internal function to fetch unsorted UTXOs from either block explorer or bitcoind
 * @param {string} address - Bitcoin address to fetch UTXOs for
 * @param {Network} network - Bitcoin network (mainnet, testnet, etc)
 * @param {ClientConfig} client - Client configuration
 * @returns {Promise<any[]>} Promise resolving to array of unsorted UTXOs
 */
function fetchAddressUTXOsUnsorted(
  address: string,
  network: Network,
  client: ClientConfig,
): Promise<any[]> {
  if (client.type === BLOCK_EXPLORER) {
    return blockExplorerGetAddresesUTXOs(address, network);
  }

  if (!isBitcoindClient(client)) {
    throw new Error("Invalid bitcoind client configuration");
  }

  return bitcoindListUnspent({
    ...bitcoindParams(client),
    ...{ address },
  });
}

/**
 * Fetch utxos for an address, calculate total balances
 * and return an object describing the addresses state
 * @param {string} address
 * @param {Network} network
 * @param {ClientConfig}} client
 * @returns {Promise<UTXOUpdates> } slice object with information gathered for that address
 */
export async function fetchAddressUTXOs(
  address: string,
  network: Network,
  client: ClientConfig,
): Promise<UTXOUpdates> {
  let unsortedUTXOs: any[] | undefined;

  // Initialize updates object with default values
  let updates: UTXOUpdates = {
    utxos: [],
    balanceSats: BigNumber(0),
    fetchedUTXOs: false,
    fetchUTXOsError: "",
  };
  try {
    unsortedUTXOs = await fetchAddressUTXOsUnsorted(address, network, client);
  } catch (e) {
    if (client.type === "private" && isWalletAddressNotFoundError(e)) {
      updates = {
        utxos: [],
        balanceSats: BigNumber(0),
        addressKnown: false,
        fetchedUTXOs: true,
        fetchUTXOsError: "",
      };
    } else {
      updates = {
        ...updates,
        fetchUTXOsError: e instanceof Error ? e.toString() : "Unknown error",
      };
    }
  }

  // if no utxos then return updates object as is
  if (!unsortedUTXOs) return updates;

  // sort utxos
  const utxos = sortInputs(unsortedUTXOs);

  // calculate the total balance from all utxos
  const balanceSats = utxos
    .map((utxo) => utxo.amountSats)
    .reduce(
      (accumulator, currentValue) => accumulator.plus(currentValue),
      new BigNumber(0),
    );

  return {
    ...updates,
    balanceSats,
    utxos,
    fetchedUTXOs: true,
    fetchUTXOsError: "",
  };
}

/**
 * Get status information for a Bitcoin address
 * @param {string} address - Bitcoin address to check
 * @param {Network} network - Bitcoin network (mainnet, testnet, etc)
 * @param {ClientConfig} client - Client configuration
 * @returns Promise resolving to address status
 */
export function getAddressStatus(
  address: string,
  network: Network,
  client: ClientConfig,
) {
  if (client.type === BLOCK_EXPLORER) {
    return blockExplorerGetAddressStatus(address, network);
  }

  if (!isBitcoindClient(client)) {
    throw new Error("Invalid bitcoind client configuration");
  }

  return bitcoindGetAddressStatus({
    ...bitcoindParams(client),
    ...{ address },
  });
}

/**
 * Get fee estimate for transaction
 * @param {Network} network - Bitcoin network (mainnet, testnet, etc)
 * @param {ClientConfig} client - Client configuration
 * @returns {Promise<number>} Promise resolving to fee estimate in satoshis/vbyte
 */
export function fetchFeeEstimate(
  network: Network,
  client: ClientConfig,
): Promise<number> {
  if (client.type === BLOCK_EXPLORER) {
    return blockExplorerGetFeeEstimate(network);
  }

  if (!isBitcoindClient(client)) {
    throw new Error("Invalid bitcoind client configuration");
  }

  return bitcoindEstimateSmartFee({
    ...bitcoindParams(client),
    ...{ numBlocks: 1 },
  });
}

/**
 * Broadcast a raw transaction to the Bitcoin network
 * @param {string} transactionHex - Raw transaction in hexadecimal format
 * @param {Network} network - Bitcoin network (mainnet, testnet, etc)
 * @param {ClientConfig} client - Client configuration
 * @returns {Promise<string>} Promise resolving to transaction ID if successful
 */
export function broadcastTransaction(
  transactionHex: string,
  network: Network,
  client: ClientConfig,
): Promise<string> {
  if (client.type === BLOCK_EXPLORER) {
    return blockExplorerBroadcastTransaction(transactionHex, network);
  }

  if (!isBitcoindClient(client)) {
    throw new Error("Invalid bitcoind client configuration");
  }

  return bitcoindSendRawTransaction({
    ...bitcoindParams(client),
    ...{ hex: transactionHex },
  });
}
