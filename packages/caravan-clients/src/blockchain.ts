import { sortInputs, Network } from "@caravan/bitcoin";
import BigNumber from "bignumber.js";
import {
  blockExplorerGetAddresesUTXOs,
  blockExplorerGetFeeEstimate,
  blockExplorerBroadcastTransaction,
  blockExplorerGetAddressStatus,
} from "./block_explorer";
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
 * @param address - Bitcoin address to fetch UTXOs for
 * @param network - Bitcoin network (mainnet, testnet, etc)
 * @param client - Client configuration
 * @returns Promise resolving to array of unsorted UTXOs
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
    address,
  });
}

/**
 * Fetch utxos for an address, calculate total balances
 * and return an object describing the addresses state
 * @param {string} address
 * @param {string} network
 * @param {object} client
 * @returns {object} slice object with information gathered for that address
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
    balanceSats: new BigNumber(0),
    fetchedUTXOs: false,
    fetchUTXOsError: "",
  };

  try {
    unsortedUTXOs = await fetchAddressUTXOsUnsorted(address, network, client);
  } catch (e) {
    if (client.type === BITCOIND && isWalletAddressNotFoundError(e)) {
      updates = {
        utxos: [],
        balanceSats: new BigNumber(0),
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

  // Return updates if no UTXOs found
  if (!unsortedUTXOs) return updates;

  // Sort UTXOs and calculate total balance
  const utxos = sortInputs(unsortedUTXOs);
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
 * @param address - Bitcoin address to check
 * @param network - Bitcoin network (mainnet, testnet, etc)
 * @param client - Client configuration
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
    address,
  });
}

/**
 * Get fee estimate for transaction
 * @param network - Bitcoin network (mainnet, testnet, etc)
 * @param client - Client configuration
 * @returns Promise resolving to fee estimate in satoshis/vbyte
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
    numBlocks: 1,
  });
}

/**
 * Broadcast a raw transaction to the Bitcoin network
 * @param transactionHex - Raw transaction in hexadecimal format
 * @param network - Bitcoin network (mainnet, testnet, etc)
 * @param client - Client configuration
 * @returns Promise resolving to transaction ID if successful
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
    hex: transactionHex,
  });
}
