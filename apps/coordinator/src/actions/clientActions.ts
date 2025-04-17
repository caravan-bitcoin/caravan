import { Dispatch } from "react";
import {
  BlockchainClient,
  ClientType,
  PublicBitcoinProvider,
} from "@caravan/clients";
import { BitcoinNetwork } from "@caravan/bitcoin";

export const SET_CLIENT_TYPE = "SET_CLIENT_TYPE";
export const SET_CLIENT_URL = "SET_CLIENT_URL";
export const SET_CLIENT_USERNAME = "SET_CLIENT_USERNAME";
export const SET_CLIENT_PASSWORD = "SET_CLIENT_PASSWORD";
export const SET_CLIENT_PROVIDER = "SET_CLIENT_PROVIDER";

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
  provider?: string;
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
  const translatedType = getClientType(client);
  const translatedProvider = getClientProvider(client);
  console.log("Matching client:", {
    original: client,
    translatedType,
    translatedProvider,
    blockchainClient: {
      type: blockchainClient?.type,
      provider: blockchainClient?.provider,
      network: blockchainClient?.network,
    },
  });
  return (
    blockchainClient &&
    blockchainClient.network === network &&
    blockchainClient.type === translatedType &&
    (translatedType === ClientType.PRIVATE
      ? blockchainClient.bitcoindParams.url === client.url &&
        blockchainClient.bitcoindParams.auth.username === client.username &&
        blockchainClient.bitcoindParams.auth.password === client.password
      : blockchainClient.provider === translatedProvider)
  );
};

const getClientType = (client: ClientSettings): ClientType => {
  console.log("Getting client type for:", client.type);
  switch (client.type) {
    case "public":
    case "mempool":
    case "blockstream":
      return ClientType.PUBLIC;
    case "private":
      return ClientType.PRIVATE;
    default:
      return client.type as ClientType;
  }
};

export const getClientProvider = (client: ClientSettings) => {
  console.log("Getting provider for:", client);
  if (
    client.type === "public" ||
    client.type === "mempool" ||
    client.type === "blockstream"
  ) {
    // For public clients, we need to determine which provider to use
    if (client.provider === "blockstream" || client.type === "blockstream") {
      return PublicBitcoinProvider.BLOCKSTREAM;
    } else if (client.provider === "mempool" || client.type === "mempool") {
      return PublicBitcoinProvider.MEMPOOL;
    }
    return PublicBitcoinProvider.BLOCKSTREAM; // Default to Blockstream if not specified
  }
  return undefined;
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
    console.log("Setting blockchain client:", { network, client });

    const clientType = getClientType(client);
    const provider = getClientProvider(client);
    console.log("Creating new client with:", { clientType, provider });
    const newClient = new BlockchainClient({
      client,
      type: clientType,
      provider,
      network,
      throttled: provider === PublicBitcoinProvider.BLOCKSTREAM,
    });

    dispatch({ type: SET_BLOCKCHAIN_CLIENT, value: newClient });
    return newClient;
  };
};
