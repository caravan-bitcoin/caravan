import updateState from "./utils";
import {
  SET_CLIENT_TYPE,
  SET_CLIENT_PROVIDER,
  SET_CLIENT_URL,
  SET_CLIENT_USERNAME,
  SET_CLIENT_PASSWORD,
  SET_CLIENT_URL_ERROR,
  SET_CLIENT_USERNAME_ERROR,
  SET_CLIENT_PASSWORD_ERROR,
  SET_BLOCKCHAIN_CLIENT,
  SET_CLIENT_WALLET_NAME,
} from "../actions/clientActions";

const initialState = {
  type: "public",
  provider: "mempool",
  url: "",
  username: "",
  password: "",
  urlError: "",
  walletName: "",
  usernameError: "",
  passwordError: "",
  status: "unknown",
  blockchainClient: null,
};

export default (state = initialState, action) => {
  switch (action.type) {
    case SET_CLIENT_TYPE:
      return updateState(state, { type: action.value });
    case SET_CLIENT_PROVIDER:
      return updateState(state, { provider: action.value });
    case SET_CLIENT_URL:
      return updateState(state, { url: action.value });
    case SET_CLIENT_USERNAME:
      return updateState(state, { username: action.value });
    case SET_CLIENT_PASSWORD:
      return updateState(state, { password: action.value });
    case SET_CLIENT_URL_ERROR:
      return updateState(state, { urlError: action.value });
    case SET_CLIENT_USERNAME_ERROR:
      return updateState(state, { usernameError: action.value });
    case SET_CLIENT_PASSWORD_ERROR:
      return updateState(state, { passwordError: action.value });
    case SET_CLIENT_WALLET_NAME:
      return updateState(state, { walletName: action.value });
    case SET_BLOCKCHAIN_CLIENT:
      return updateState(state, { blockchainClient: action.value });

    default:
      return state;
  }
};
