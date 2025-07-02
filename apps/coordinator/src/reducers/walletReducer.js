import {
  UPDATE_WALLET_NAME,
  UPDATE_WALLET_UUID,
  RESET_WALLET_VIEW,
  WALLET_MODES,
  UPDATE_WALLET_MODE,
  INITIAL_LOAD_COMPLETE,
  UPDATE_POLICY_REGISTRATIONS,
  UPDATE_PENDING_TRANSACTIONS,
  RESET_PENDING_TRANSACTIONS,
} from "../actions/walletActions";
import updateState from "./utils";

const initialState = {
  walletMode: WALLET_MODES.VIEW,
  walletName: "My Multisig Wallet",
  walletUuid: "",
  nodesLoaded: false,
  ledgerPolicyHmacs: [],
  pendingTransactions: [],
};

function resetWalletViews(state) {
  return updateState(state, {
    walletMode: WALLET_MODES.VIEW,
  });
}

export default (state = initialState, action) => {
  switch (action.type) {
    case UPDATE_WALLET_MODE:
      return updateState(state, { walletMode: action.value });
    case UPDATE_WALLET_NAME:
      return updateState(state, { walletName: action.value });
    case UPDATE_WALLET_UUID:
      return updateState(state, { walletUuid: action.value });
    case RESET_WALLET_VIEW:
      return resetWalletViews(state);
    case UPDATE_POLICY_REGISTRATIONS:
      return updateState(state, {
        ledgerPolicyHmacs: [...state.ledgerPolicyHmacs, action.value],
      });
    case INITIAL_LOAD_COMPLETE:
      return updateState(state, { nodesLoaded: true });
    case UPDATE_PENDING_TRANSACTIONS:
      return updateState(state, { pendingTransactions: action.value });
    case RESET_PENDING_TRANSACTIONS:
      return updateState(state, { pendingTransactions: [] });
    default:
      return state;
  }
};
