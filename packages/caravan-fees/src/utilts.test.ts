import {
  isRBFSignaled,
  calculateEffectiveFeeRate,
  estimateVirtualSize,
} from "./utils";
import { Transaction } from "bitcoinjs-lib-v5";
import { P2SH, P2SH_P2WSH, P2WSH } from "@caravan/bitcoin";
import BigNumber from "bignumber.js";

describe("Utils", () => {
  describe("isRBFSignaled", () => {
    it("should return true for RBF signaled transaction", () => {
      const tx = {
        ins: [{ sequence: 0xfffffffd }],
      } as Transaction;
      expect(isRBFSignaled(tx)).toBe(true);
    });

    it("should return false for non-RBF transaction", () => {
      const tx = {
        ins: [{ sequence: 0xffffffff }],
      } as Transaction;
      expect(isRBFSignaled(tx)).toBe(false);
    });
  });

  describe("calculateEffectiveFeeRate", () => {
    it("should calculate correct fee rate", () => {
      const tx = {
        virtualSize: () => 200,
        outs: [{ value: 90000 }],
      } as Transaction;
      const utxos = [{ value: new BigNumber(100000) }];
      const feeRate = calculateEffectiveFeeRate(tx, utxos);
      expect(feeRate.satoshisPerByte).toBe(50); // (100000 - 90000) / 200 = 50
    });
  });

  describe("estimateVirtualSize", () => {
    it("should estimate correct size for P2SH", () => {
      const size = estimateVirtualSize(P2SH, 2, 2, 2, 3);
      expect(size).toBeGreaterThan(0);
    });

    it("should estimate correct size for P2SH_P2WSH", () => {
      const size = estimateVirtualSize(P2SH_P2WSH, 2, 2, 2, 3);
      expect(size).toBeGreaterThan(0);
    });

    it("should estimate correct size for P2WSH", () => {
      const size = estimateVirtualSize(P2WSH, 2, 2, 2, 3);
      expect(size).toBeGreaterThan(0);
    });

    it("should throw error for unsupported address type", () => {
      expect(() => estimateVirtualSize("UNSUPPORTED", 2, 2, 2, 3)).toThrow(
        "Unsupported address type"
      );
    });
  });
});
