import { Network, sortInputs } from "@caravan/bitcoin";
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

export function getAddressStatus(address, network, client) {
  if (client.type === BLOCK_EXPLORER) {
    return blockExplorerGetAddressStatus(address, network);
  }
  return bitcoindGetAddressStatus({
    ...bitcoindParams(client),
    ...{ address },
  });
}

export function fetchFeeEstimate(network, client) {
  if (client.type === BLOCK_EXPLORER) {
    return blockExplorerGetFeeEstimate(network);
  }
  return bitcoindEstimateSmartFee({
    ...bitcoindParams(client),
    ...{ numBlocks: 1 },
  });
}

export function broadcastTransaction(transactionHex, network, client) {
  if (client.type === BLOCK_EXPLORER) {
    return blockExplorerBroadcastTransaction(transactionHex, network);
  }
  return bitcoindSendRawTransaction({
    ...bitcoindParams(client),
    ...{ hex: transactionHex },
  });
}
