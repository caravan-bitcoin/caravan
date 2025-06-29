import { bitcoinsToSatoshis } from "@caravan/bitcoin";
import { BigNumber } from "bignumber.js";

import { isWalletAddressNotFoundError, callBitcoind } from "./bitcoind";

export class BitcoindWalletClientError extends Error {
  constructor(message) {
    super(message);
    this.name = "BitcoindWalletClientError";
  }
}

export interface BitcoindWalletParams {
  baseUrl: string;
  walletName?: string;
  auth: {
    username: string;
    password: string;
  };
  method: string;
  params?: any[] | Record<string, any>;
}

export function callBitcoindWallet({
  baseUrl,
  walletName,
  auth,
  method,
  params,
}: BitcoindWalletParams) {
  const url = new URL(baseUrl);

  if (walletName)
    url.pathname = url.pathname.replace(/\/$/, "") + `/wallet/${walletName}`;
  //@ts-expect-error Will Fix this
  return callBitcoind(url.toString(), auth, method, params);
}

export interface BaseBitcoindParams {
  url: string;
  auth: {
    username: string;
    password: string;
  };
  walletName?: string;
}

export function bitcoindWalletInfo({
  url,
  auth,
  walletName,
}: BaseBitcoindParams) {
  return callBitcoindWallet({
    baseUrl: url,
    walletName,
    auth,
    method: "getwalletinfo",
  });
}

export function bitcoindImportDescriptors({
  url,
  auth,
  walletName,
  receive,
  change,
  rescan,
}: {
  url: string;
  auth: {
    username: string;
    password: string;
  };
  walletName?: string;
  receive: string;
  change: string;
  rescan: boolean;
}) {
  const descriptors = [
    {
      desc: receive,
      internal: false,
    },
    {
      desc: change,
      internal: true,
    },
  ].map((d) => {
    return {
      ...d,
      range: [0, 1005],
      timestamp: rescan ? 0 : "now",
      watchonly: true,
      active: true,
    };
  });

  return callBitcoindWallet({
    baseUrl: url,
    walletName,
    auth,
    method: "importdescriptors",
    params: [descriptors],
  });
}

export async function bitcoindGetAddressStatus({
  url,
  auth,
  walletName,
  address,
}: BaseBitcoindParams & { address: string }) {
  try {
    const resp: any = await callBitcoindWallet({
      baseUrl: url,
      walletName,
      auth,
      method: "getreceivedbyaddress",
      params: [address],
    });
    if (typeof resp?.result === "undefined") {
      throw new BitcoindWalletClientError(
        `Error: invalid response from ${url}`,
      );
    }
    return {
      used: resp?.result > 0,
    };
  } catch (e) {
    const error = e as Error;
    if (isWalletAddressNotFoundError(error))
      // eslint-disable-next-line no-console
      console.warn(
        `Address ${address} not found in bitcoind's wallet. Query failed.`,
      );
    else console.error(error.message); // eslint-disable-line no-console
    return e;
  }
}

export interface ListUnspentResponse {
  txid: string;
  amount: number;
  confirmations: number;
  vout: number;
}
/**
 * Fetch unspent outputs for a single or set of addresses
 *
 * This function queries Bitcoin Core's listunspent RPC method to get UTXOs for specified addresses.
 * By default, Bitcoin Core excludes "unsafe" UTXOs (those already spent in pending transactions),
 *
 * @param {Object} options - what is needed to communicate with the RPC
 * @param {string} options.url - where to connect
 * @param {AxiosBasicCredentials} options.auth - username and password
 * @param {string} options.address - The address from which to obtain the information
 * @param {string} options.walletName - Name of the wallet to query
 * @param {string} [options.address] - Single address to get UTXOs for
 * @param {string[]} [options.addresses] - Array of addresses to get UTXOs for (takes precedence over address)
 *
 * @returns {Promise<UTXO[]>} Array of UTXO objects suitable for signing transaction inputs
 *
 */
export async function bitcoindListUnspent({
  url,
  auth,
  walletName,
  address,
  addresses,
}: BaseBitcoindParams & {
  address?: string;
  addresses?: string[];
}): Promise<
  {
    txid: string;
    amount: string;
    amountSats: string;
    index: number;
    confirmed: boolean;
    transactionHex: string;
    time: string;
  }[]
> {
  try {
    const addressParam = addresses || [address];

    //@ts-expect-error Will Fix this
    const resp: {
      result: ListUnspentResponse[];
    } = await callBitcoindWallet({
      baseUrl: url,
      auth,
      walletName,
      method: "listunspent",
      params: { minconf: 0, maxconf: 9999999, addresses: addressParam },
    });
    const promises: Promise<any>[] = [];

    resp.result.forEach((utxo) => {
      promises.push(
        callBitcoindWallet({
          baseUrl: url,
          walletName: walletName,
          auth,
          method: "gettransaction",
          params: { txid: utxo.txid },
        }),
      );
    });
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
    console.error("There was a problem:", (e as Error).message);
    throw e;
  }
}

/**
 * Gets detailed information about a wallet transaction
 *
 * This function uses the "gettransaction" RPC call which includes fee information
 * for wallet transactions, unlike getrawtransaction which requires txindex=1 and
 * doesn't include fee data.
 *
 * @see https://developer.bitcoin.org/reference/rpc/gettransaction.html
 *
 * @param options - Connection details and transaction ID
 * @returns Detailed transaction data with fee information
 */
export async function bitcoindGetWalletTransaction({
  url,
  auth,
  walletName,
  txid,
  includeWatchonly = true,
  verbose = true,
}: BaseBitcoindParams & {
  txid: string;
  includeWatchonly?: boolean;
  verbose?: boolean;
}): Promise<any> {
  try {
    const response = await callBitcoindWallet({
      baseUrl: url,
      walletName,
      auth,
      method: "gettransaction",
      params: [txid, includeWatchonly, verbose],
    });

    if (typeof response?.result === "undefined") {
      throw new BitcoindWalletClientError(
        `Error: invalid response from ${url} for transaction ${txid}`,
      );
    }

    return response.result;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Error getting wallet transaction:", (e as Error).message);
    throw e;
  }
}
