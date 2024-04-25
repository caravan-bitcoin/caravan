import { isWalletAddressNotFoundError } from "./bitcoind";
import { callBitcoind } from "./bitcoind";

export interface BitcoindWalletParams {
  baseUrl: string;
  walletName?: string;
  auth: {
    username: string;
    password: string;
  };
  method: string;
  params?: any[];
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
}: {
  url: string;
  auth: {
    username: string;
    password: string;
  };
  walletName?: string;
  receive: string;
  change: string;
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
      timestamp: "now",
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
      throw new Error(`Error: invalid response from ${url}`);
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
