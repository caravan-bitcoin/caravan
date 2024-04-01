import { Dispatch } from "redux";
import { BlockchainClient, ClientType } from "@caravan/clients";

export const SET_CLIENT_TYPE = "SET_CLIENT_TYPE";
export const SET_CLIENT_URL = "SET_CLIENT_URL";
export const SET_CLIENT_USERNAME = "SET_CLIENT_USERNAME";
export const SET_CLIENT_PASSWORD = "SET_CLIENT_PASSWORD";

export const SET_CLIENT_URL_ERROR = "SET_CLIENT_URL_ERROR";
export const SET_CLIENT_USERNAME_ERROR = "SET_CLIENT_USERNAME_ERROR";
export const SET_CLIENT_PASSWORD_ERROR = "SET_CLIENT_PASSWORD_ERROR";

export const SET_BLOCKCHAIN_CLIENT = "SET_BLOCKCHAIN_CLIENT";

export const getBlockchainClientFromStore = () => {
  return async (
    dispatch: Dispatch<any>,
    getState: () => { settings: any; client: any },
  ) => {
    const { network } = getState().settings;
    const { client } = getState();
    if (!client) return;
    if (client.blockchainClient?.type === client.type)
      return client.blockchainClient;
    let clientType: ClientType;

    switch (client.type) {
      case "public":
        clientType = ClientType.BLOCKSTREAM;
        break;
      case "private":
        clientType = ClientType.PRIVATE;
        break;
      default:
        clientType = client.type;
    }

    const blockchainClient = new BlockchainClient({
      client,
      type: clientType,
      network,
      throttled: client.type === ClientType.BLOCKSTREAM,
    });
    dispatch({ type: SET_BLOCKCHAIN_CLIENT, payload: blockchainClient });
    return blockchainClient;
  };
};