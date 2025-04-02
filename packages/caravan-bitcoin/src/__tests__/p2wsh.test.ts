import { describe, it, expect } from "vitest";
import {
  estimateMultisigP2WSHTransactionVSize,
  getRedeemScriptSize,
  getWitnessSize,
  calculateBase,
} from "../p2wsh";

describe("p2wsh", () => {
  describe("estimateMultisigP2WSHTransactionVSize", () => {
    it("estimates the transaction size in vbytes", () => {
      expect(
        estimateMultisigP2WSHTransactionVSize({
          numInputs: 1,
          numOutputs: 2,
          m: 2,
          n: 3,
        }),
      ).toEqual(202);
    });
    const vsize = estimateMultisigP2WSHTransactionVSize({
      numInputs: 1,
      numOutputs: 2,
      m: 2,
      n: 3,
    });
    expect(vsize).toBeGreaterThan(0);
  });

  describe("calculateBase", () => {
    it("should correctly calculate tx base size without witness", () => {
      expect(calculateBase(2, 2)).toBe(178);
    });
  });

  describe("getRedeemScriptSize", () => {
    it("should return the correct estimated size of a multisig script", () => {
      expect(getRedeemScriptSize(3)).toBe(105);
    });
  });

  describe("getScriptSigSize", () => {
    it("should return the correct estimated size of a 2-of-3 multisig scriptSig", () => {
      const witnessSize = getWitnessSize(2, 3);
      // assumes largest possible signature size of 73
      expect(witnessSize).toBe(256);
    });
  });
});
