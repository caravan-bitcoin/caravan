import axios, { AxiosBasicCredentials } from "axios";
import BigNumber from "bignumber.js";
import { bitcoinsToSatoshis } from "@caravan/bitcoin";
import {
  RPCRequest,
  RPCResponse,
  BitcoindParams,
  UnspentOutput,
  ImportDescriptor,
  ImportMultiResponse,
  ListUnspentResponse,
  TransactionResponse,
} from "./types";

/**
 * Makes a JSON-RPC call to a Bitcoin node
 *
 * This is our main workhorse for talking to bitcoind. It handles authentication
 * and formats requests in the way bitcoind expects them.
 *
 * @param url - The URL of the Bitcoin node
 * @param auth - Basic auth credentials
 * @param method - The RPC method to call
 * @param params - Parameters for the RPC method (optional)
 * @returns Promise resolving to the RPC response
 */
export async function callBitcoind<T>(
  url: string,
  auth: AxiosBasicCredentials,
  method: string,
  params: unknown[] = [],
): Promise<RPCResponse<T>> {
  // Build our RPC request object
  const rpcRequest: RPCRequest = {
    jsonrpc: "2.0",
    id: 0, // We use a static ID since we're not batching requests
    method,
    params,
  };

  try {
    const response = await axios(url, {
      method: "post",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      auth,
      data: rpcRequest,
    });

    return response.data;
  } catch (error) {
    // Properly type our error before throwing it
    if (error instanceof Error) {
      throw error;
    }
    // If it's not an Error instance, wrap it in one
    throw new Error("Unknown error occurred during RPC call");
  }
}

/**
 * Checks if an error from bitcoind indicates an address wasn't found in the wallet
 *
 * This is useful for client-side error handling, especially when dealing with
 * watch-only wallets or addresses that might not be imported.
 *
 * @param error - The error object to check
 * @returns true if the error indicates address not found in wallet
 */
export function isWalletAddressNotFoundError(error: unknown): boolean {
  if (error && typeof error === "object" && "response" in error) {
    const response = error.response as { data?: { error?: { code: number } } };

    return response?.data?.error?.code === -4; // Bitcoin Core's code for address not found
  }
  return false;
}

/**
 * Extracts standard bitcoind connection parameters from a client config
 *
 * This helper function pulls out the common parameters we need for most
 * bitcoind RPC calls.
 *
 * @param client - The client configuration object
 * @returns Object containing url, auth credentials, and optional wallet name
 */
export function bitcoindParams(client: {
  url: string;
  username: string;
  password: string;
  walletName?: string;
}): BitcoindParams {
  const { url, username, password, walletName } = client;
  return {
    url,
    auth: { username, password },
    walletName,
  };
}

/**
 * Fetches unspent outputs (UTXOs) for an address or set of addresses
 *
 * This is crucial for building transactions - it tells us what coins we can spend.
 * It handles both confirmed and unconfirmed UTXOs, and includes all the data
 * needed to create a transaction.
 *
 * @param {Object} options - what is needed to communicate with the RPC
 * @param {string} options.url - where to connect
 * @param {AxiosBasicCredentials} options.auth - username and password
 * @param {string} options.address - The address from which to obtain the information
 * @returns {UTXO} object for signing transaction inputs
 */
export async function bitcoindListUnspent({
  url,
  auth,
  address,
  addresses,
}: {
  url: string;
  auth: AxiosBasicCredentials;
  address?: string;
  addresses?: string[];
}): Promise<UnspentOutput[]> {
  try {
    const addressParam = addresses || [address];

    // Get the list of unspent outputs
    const resp = await callBitcoind<ListUnspentResponse[]>(
      url,
      auth,
      "listunspent",
      [0, 9999999, addressParam],
    );

    // Now We'll get transaction details for each UTXO
    const txPromises = resp.result.map((utxo) =>
      callBitcoind<TransactionResponse>(url, auth, "gettransaction", [
        utxo.txid,
      ]),
    );

    const previousTransactions = await Promise.all(txPromises);

    return resp.result.map((utxo, mapindex) => {
      const amount = new BigNumber(utxo.amount);
      return {
        confirmed: (utxo.confirmations || 0) > 0,
        txid: utxo.txid,
        index: utxo.vout,
        amount: amount.toFixed(8),
        amountSats: bitcoinsToSatoshis(amount.toString()),
        transactionHex: previousTransactions[mapindex].result.hex,
        time: previousTransactions[mapindex].result.blocktime,
      };
    });
  } catch (error) {
    console.error(
      "Problem fetching UTXOs:",
      error instanceof Error ? error.message : "Unknown error",
    );
    throw error;
  }
}

/**
 * Checks if an address has been used (received any funds)
 *
 * This is helpful for address management and wallet scanning.
 *
 * @param options - Connection details and address to check
 * @returns Status object indicating if address was used
 */
export async function bitcoindGetAddressStatus({
  url,
  auth,
  address,
}: {
  url: string;
  auth: AxiosBasicCredentials;
  address: string;
}): Promise<{ used: boolean } | Error> {
  try {
    const resp = await callBitcoind<number>(url, auth, "getreceivedbyaddress", [
      address,
    ]);
    if (typeof resp.result === "undefined") {
      throw new Error(`Error: invalid response from ${url}`);
    }
    return {
      used: resp.result > 0,
    };
  } catch (error) {
    // Handle different error cases appropriately
    if (isWalletAddressNotFoundError(error)) {
      console.warn(
        `Address ${address} not found in bitcoind's wallet. Query failed.`,
      );
    } else if (error instanceof Error) {
      console.error(error.message);
    }
    return error instanceof Error ? error : new Error("Unknown error");
  }
}

/**
 * Estimates the appropriate fee rate for a transaction
 *
 * Uses bitcoind's smart fee estimation algorithm to suggest an appropriate
 * fee rate based on recent network activity and desired confirmation time.
 *
 * @param options - Connection details and number of blocks target
 * @returns Estimated fee rate in satoshis per byte
 */
export async function bitcoindEstimateSmartFee({
  url,
  auth,
  numBlocks = 2, // Default to targeting inclusion within 2 blocks
}: {
  url: string;
  auth: AxiosBasicCredentials;
  numBlocks?: number;
}): Promise<number> {
  const resp = await callBitcoind<{ feerate: number }>(
    url,
    auth,
    "estimatesmartfee",
    [numBlocks],
  );
  return Math.ceil(resp.result.feerate * 100000); // Convert to sats/byte and round up
}

/**
 * Broadcasts a raw transaction to the Bitcoin network
 *
 * This is the final step in sending a transaction - it submits our signed
 * transaction to the network for inclusion in a block.
 *
 * @param options - Connection details and raw transaction hex
 * @returns Transaction ID of the broadcast transaction
 */
export async function bitcoindSendRawTransaction({
  url,
  auth,
  hex,
}: {
  url: string;
  auth: AxiosBasicCredentials;
  hex: string;
}): Promise<string> {
  try {
    const resp = await callBitcoind<string>(url, auth, "sendrawtransaction", [
      hex,
    ]);
    return resp.result;
  } catch (error) {
    console.log("Error broadcasting transaction:", error);
    if (error && typeof error === "object" && "response" in error) {
      const response = error.response as {
        data?: { error?: { message: string } };
      };
      throw response?.data?.error?.message || error;
    }
    throw error;
  }
}

/**
 * Imports multiple addresses into the wallet
 *
 * @param options - Import configuration
 * @param options.url - Bitcoin node URL
 * @param options.auth - Authentication credentials
 * @param options.addresses - List of addresses to import
 * @param options.label - Optional label for the addresses
 * @param options.rescan - Whether to rescan the blockchain for these addresses
 * @returns Promise resolving to import results
 */
export async function bitcoindImportMulti({
  url,
  auth,
  addresses,
  label,
  rescan,
}: {
  url: string;
  auth: AxiosBasicCredentials;
  addresses: string[];
  label?: string;
  rescan: boolean;
}): Promise<RPCResponse<ImportMultiResponse[]>> {
  const imports: ImportDescriptor[] = addresses.map((address) => ({
    scriptPubKey: {
      address,
    },
    label,
    timestamp: 0, // TODO: Consider making this configurable for better history management
  }));

  const params = [imports, { rescan }];

  if (rescan) {
    // Fire and forget for rescan operations
    void callBitcoind<ImportMultiResponse[]>(
      url,
      auth,
      "importmulti",
      params,
    ).catch((error) => {
      console.warn("Error during import rescan:", error);
    });

    // Return immediately for rescan operations
    return Promise.resolve({
      result: [],
      id: 0,
    });
  }

  // For non-rescan operations, wait for the result
  return callBitcoind<ImportMultiResponse[]>(url, auth, "importmulti", params);
}

/**
 * Gets detailed information about a specific transaction
 *
 * @param url - Bitcoin node URL
 * @param auth - Authentication credentials
 * @param txid - Transaction ID to look up
 * @returns Detailed transaction data
 */
export async function bitcoindRawTxData(
  url: string,
  auth: AxiosBasicCredentials,
  txid: string,
): Promise<any> {
  // TODO: Add proper type for transaction data
  try {
    const response = await callBitcoind(url, auth, "getrawtransaction", [
      txid,
      true,
    ]);
    return response;
  } catch (error) {
    throw new Error(
      `Failed to get raw transaction data: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
