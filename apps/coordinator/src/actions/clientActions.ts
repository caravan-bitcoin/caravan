import { Dispatch } from "react";
import { BlockchainClient, ClientType } from "@caravan/clients";
import { BitcoinNetwork } from "@caravan/bitcoin";

export const SET_CLIENT_TYPE = "SET_CLIENT_TYPE";
export const SET_CLIENT_URL = "SET_CLIENT_URL";
export const SET_CLIENT_USERNAME = "SET_CLIENT_USERNAME";
export const SET_CLIENT_PASSWORD = "SET_CLIENT_PASSWORD";

export const SET_CLIENT_URL_ERROR = "SET_CLIENT_URL_ERROR";
export const SET_CLIENT_USERNAME_ERROR = "SET_CLIENT_USERNAME_ERROR";
export const SET_CLIENT_PASSWORD_ERROR = "SET_CLIENT_PASSWORD_ERROR";

export const SET_BLOCKCHAIN_CLIENT = "SET_BLOCKCHAIN_CLIENT";

export const SET_CLIENT_WALLET_NAME = "SET_CLIENT_WALLET_NAME";

export const setClientWalletName = (walletName: string) => {
  return { type: SET_CLIENT_WALLET_NAME, value: walletName };
};

export interface ClientSettings {
  type: string;
  url: string;
  username: string;
  password: string;
  walletName?: string;
}
// Ideally we'd just use the hook to get the client
// and do the comparisons. Because the action creators for the
// other pieces of the client store are not implemented and we
// can't hook into those to update the blockchain client, and
// many components that need the client aren't able to use hooks yet
// we have to do this here.
const matchesClient = (
  blockchainClient: BlockchainClient,
  client: ClientSettings,
  network: BitcoinNetwork,
) => {
  return (
    blockchainClient &&
    blockchainClient.network === network &&
    blockchainClient.type === client.type &&
    (client.type === "private"
      ? blockchainClient.bitcoindParams.url === client.url &&
        blockchainClient.bitcoindParams.auth.username === client.username &&
        blockchainClient.bitcoindParams.auth.password === client.password
      : true)
  );
};

const getClientType = (client: ClientSettings): ClientType => {
  switch (client.type) {
    case "public":
      return ClientType.BLOCKSTREAM;
    case "private":
      return ClientType.PRIVATE;
    default:
      return client.type as ClientType;
  }
};

export const updateBlockchainClient = () => {
  return (
    dispatch: Dispatch<any>,
    getState: () => { settings: any; client: any },
  ) => {
    const { network } = getState().settings;
    const { client } = getState();
    const { blockchainClient } = client;

    if (matchesClient(blockchainClient, client, network)) {
      return blockchainClient;
    }
    return dispatch(setBlockchainClient());
  };
};

export const setBlockchainClient = () => {
  return (
    dispatch: Dispatch<any>,
    getState: () => { settings: any; client: ClientSettings },
  ) => {
    const { network } = getState().settings;
    const { client } = getState();

    const clientType = getClientType(client);
    const newClient = new BlockchainClient({
      client,
      type: clientType,
      network,
      throttled: client.type === ClientType.BLOCKSTREAM,
    });

    dispatch({ type: SET_BLOCKCHAIN_CLIENT, value: newClient });
    return newClient;
  };
};
