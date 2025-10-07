import BigNumber from "bignumber.js";

import {
  getConfirmedBalance,
  getTotalBalance,
  getPendingBalance,
  getSpendableSlices,
} from "./wallet";

import { getMockState } from "../utils/fixtures";

function calculatePendingBalance(state, braid = "deposits") {
  return state.wallet[braid].nodes
    .reduce((utxos, slice) => {
      utxos.push(...slice.utxos);
      return utxos;
    }, [])
    .filter((utxo) => !utxo.confirmed)
    .reduce((total, utxo) => total.plus(utxo.amountSats), new BigNumber(0));
}

describe("wallet selectors", () => {
  let state;
  let confirmedBalance;
  let pendingBalance;
  let pendingDeposits;
  let pendingChange;
  beforeEach(() => {
    confirmedBalance = 5000;
    pendingBalance = 1000;
    state = getMockState({ confirmedBalance, pendingBalance });
    pendingDeposits = calculatePendingBalance(state);
    pendingChange = calculatePendingBalance(state, "change");
  });

  describe("getPendingBalance", () => {
    it("should return total balance of unconfirmed deposit UTXOs", () => {
      const actualPending = getPendingBalance(state);
      // expected pending are only the pending deposits from
      // the deposit braid
      expect(actualPending.toFixed()).toEqual(pendingDeposits.toFixed());
    });
  });
  describe("getTotalBalance", () => {
    it("should return total balance of confirmed and unconfirmed UTXOs", () => {
      const actualTotal = getTotalBalance(state);
      expect(actualTotal).toEqual(pendingBalance + confirmedBalance);
    });
  });
  describe("getConfirmedBalance", () => {
    it("should return balance excluding pending utxos in satoshis", () => {
      const actualConfirmed = getConfirmedBalance(state);
      // confirmed deposit and all change count towards confirmed balance
      expect(actualConfirmed.toFixed()).toEqual(
        pendingChange.plus(confirmedBalance).toFixed(),
      );
    });
  });
  describe("getSpendableSlices", () => {
    it("should return slices that spendable", () => {
      // add unused slice to make sure it's not included
      state.wallet.deposits.nodes.push({
        utxos: [],
        balanceSats: new BigNumber(0),
      });
      const actuallySpendable = getSpendableSlices(state);
      const actualSpendableTotal = actuallySpendable.reduce(
        (total, slice) => total.plus(slice.balanceSats),
        new BigNumber(0),
      );
      const expectedSpendableTotal = pendingDeposits.plus(
        pendingChange.plus(confirmedBalance),
      );
      expect(actualSpendableTotal).toEqual(expectedSpendableTotal);
      actuallySpendable.forEach((slice) => {
        expect(slice.utxos.length).toBeGreaterThan(0);
        slice.utxos.forEach(() => {
          // Note : To consider CPFP, any UTXO in a spendable slice is spendable
          // No need to check if it's confirmed or in a change slice
          expect(slice.lastUsed !== "Spent").toBeTruthy();
        });
      });
    });
  });
});
