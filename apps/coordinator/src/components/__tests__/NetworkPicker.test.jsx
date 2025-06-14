import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { createStore, combineReducers } from "redux";
import { vi, describe, test, expect } from "vitest";
import NetworkPicker from "../NetworkPicker";
import React from "react";
import { Network } from "@caravan/bitcoin";
import { userEvent } from "@testing-library/user-event";

const mockSetNetwork = vi.fn();

vi.mock("../../actions/settingsActions", () => ({
  setNetwork: (network) => {
    mockSetNetwork(network);
    return {
      type: "SET_NETWORK",
      payload: network,
    };
  },
}));

const createMockStore = (initialState = {}) => {
  const defaultState = {
    settings: {
      network: Network.MAINNET,
      frozen: false,
    },
  };

  const rootReducer = combineReducers({
    settings: (state = defaultState.settings, action) => {
      if (action.type === "SET_NETWORK") {
        return { ...state, network: action.payload };
      }
      return state;
    },
  });

  return createStore(rootReducer, { ...defaultState, ...initialState });
};

const renderNetworkPicker = (initialState = {}) => {
  const store = createMockStore(initialState);

  return {
    ...render(
      <Provider store={store}>
        <NetworkPicker />
      </Provider>,
      store,
    ),
  };
};

describe("NetworkPicker Component", () => {
  test("renders correctly with default state", () => {
    renderNetworkPicker();

    expect(screen.getByText("Network")).toBeInTheDocument();
    expect(screen.getByLabelText(/Mainnet/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Testnet/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mainnet/i)).toBeChecked();
  });

  test("changes network when radio button is clicked", async () => {
    renderNetworkPicker();

    await userEvent.click(screen.getByLabelText(/Testnet/i));
    expect(mockSetNetwork).toHaveBeenCalledWith("testnet");

    expect(screen.getByLabelText(/Testnet/i)).toBeChecked();
    expect(screen.getByLabelText(/Mainnet/i)).not.toBeChecked();
  });

  test("disables radio buttons when frozen is true", () => {
    renderNetworkPicker({
      settings: {
        network: Network.MAINNET,
        frozen: true,
      },
    });

    expect(screen.getByLabelText(/Mainnet/i)).toBeDisabled();
    expect(screen.getByLabelText(/Testnet/i)).toBeDisabled();
  });
});
