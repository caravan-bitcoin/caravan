import axios, { AxiosBasicCredentials } from "axios";
import BigNumber from "bignumber.js";
import { bitcoinsToSatoshis } from "@caravan/bitcoin";
import {
  RPCResponse,
  ListUnspentResponse,
  TransactionResponse,
  ImportMultiResponse,
  ImportDescriptor,
  RPCRequest,
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
  if (!params) params = [];

  // Build our RPC request object
  const rpcRequest: RPCRequest = {
    jsonrpc: "2.0",
    id: 0, // We use a static ID since we're not batching requests
    method: `${method}`,
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
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Unknown error occurred during RPC call");
  }
}

/**
 * check if error from bitcoind is address not found in wallet
 * this allows client side interpretation of the error
 * @param {Error} e - the error object to check
 * @returns {boolean} true if the desired error
 */
export function isWalletAddressNotFoundError(e) {
  return (
    e.response &&
    e.response.data &&
    e.response.data.error &&
    e.response.data.error.code === -4
  );
}

export function bitcoindParams(client) {
  const { url, username, password, walletName } = client;
  const auth = { username, password };
  return { url, auth, walletName };
}

/**
 * Fetch unspent outputs for a single or set of addresses
 * @param {Object} options - what is needed to communicate with the RPC
 * @param {string} options.url - where to connect
 * @param {AxiosBasicCredentials} options.auth - username and password
 * @param {string} options.address - The address from which to obtain the information
 * @returns {UTXO} object for signing transaction inputs
 */
export async function bitcoindListUnspent({ url, auth, address, addresses }) {
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
    const promises = resp.result.map((utxo) =>
      callBitcoind<TransactionResponse>(url, auth, "gettransaction", [
        utxo.txid,
      ]),
    );

    const previousTransactions = await Promise.all(promises);
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
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(
      "There was a problem:",
      e instanceof Error ? e.message : "Unknown Error",
    );
    throw e;
  }
}

export async function bitcoindGetAddressStatus({ url, auth, address }) {
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
  } catch (e) {
    if (isWalletAddressNotFoundError(e))
      // eslint-disable-next-line no-console
      console.warn(
        `Address ${address} not found in bitcoind's wallet. Query failed.`,
      );
    else console.error(e instanceof Error ? e.message : "Unknown Error"); // eslint-disable-line no-console
    return e;
  }
}

export async function bitcoindEstimateSmartFee({ url, auth, numBlocks = 2 }) {
  const resp = await callBitcoind<{ feerate: number }>(
    url,
    auth,
    "estimatesmartfee",
    [numBlocks],
  );
  const feeRate = resp.result.feerate;
  return Math.ceil(feeRate * 100000);
}

export async function bitcoindSendRawTransaction({ url, auth, hex }) {
  try {
    const resp = await callBitcoind<string>(url, auth, "sendrawtransaction", [
      hex,
    ]);
    return resp.result;
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.log("send tx error", e);
    throw (e.response && e.response.data.error.message) || e;
  }
}

export function bitcoindImportMulti({
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
  const imports: ImportDescriptor[] = addresses.map((address) => {
    return {
      scriptPubKey: {
        address,
      },
      label,
      timestamp: 0, // TODO: better option to ensure address history is picked up?
    };
  });
  const params = [url, auth, "importmulti", [imports, { rescan }]];
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

export async function bitcoindRawTxData(url, auth, txid) {
  try {
    const response = await callBitcoind(url, auth, "getrawtransaction", [
      txid,
      true,
    ]);
    return response.result;
  } catch (error) {
    throw new Error(
      `Failed to get raw transaction data :  ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
