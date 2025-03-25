import { bitcoinsToSatoshis } from "@caravan/bitcoin";
import { isWalletAddressNotFoundError } from "./bitcoind";
import { callBitcoind } from "./bitcoind";
import BigNumber from "bignumber.js";
import { BitcoindWalletParams, BitcoindParams, ListUnspentResponseSubset } from "./types";

export class BitcoindWalletClientError extends Error {
  constructor(message) {
    super(message);
    this.name = "BitcoindWalletClientError";
  }
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

export function bitcoindWalletInfo({
  url,
  auth,
  walletName,
}: BitcoindParams) {
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
}: BitcoindParams & { address: string }) {
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


/**
 * Fetch unspent outputs for a single or set of addresses
 * @param {Object} options - what is needed to communicate with the RPC
 * @param {string} options.url - where to connect
 * @param {AxiosBasicCredentials} options.auth - username and password
 * @param {string} options.address - The address from which to obtain the information
 * @returns {UTXO} object for signing transaction inputs
 */
export async function bitcoindListUnspent({
  url,
  auth,
  walletName,
  address,
  addresses,
}: BitcoindParams & {
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
      result: ListUnspentResponseSubset[];
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
