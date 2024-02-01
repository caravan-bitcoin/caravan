import {
  estimateMultisigP2WSHTransactionVSize,
  getRedeemScriptSize,
  getWitnessSize,
  calculateBase,
} from "./p2wsh";

describe("p2wsh", () => {
  describe("estimateMultisigP2WSHTransactionVSize", () => {
    it("estimates the transaction size in vbytes", () => {
      expect(
        estimateMultisigP2WSHTransactionVSize({
          numInputs: 1,
          numOutputs: 2,
          m: 2,
          n: 3,
        })
      ).toBe(202); // actual value from bitcoin core for P2PKH out
    });
    const vsize = estimateMultisigP2WSHTransactionVSize({
      numInputs: 2,
      numOutputs: 2,
      m: 2,
      n: 3,
    });
    // from actual p2wsh payment with vsize 306
    // e6147766e23d57933968c1a5600f7e10ab91ea85ed1f033fa344519e78996846
    expect(vsize).toBeGreaterThanOrEqual(306);
    expect(vsize).toBeLessThanOrEqual(307);
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
