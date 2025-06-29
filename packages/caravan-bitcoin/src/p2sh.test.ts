import { estimateMultisigP2SHTransactionVSize } from "./p2sh";

describe("p2sh", () => {
  describe("estimateMultisigP2SHTransactionVSize", () => {
    it("estimates the transaction size in vbytes", () => {
      expect(
        estimateMultisigP2SHTransactionVSize({
          numInputs: 1,
          numOutputs: 2,
          m: 2,
          n: 3,
        }),
      ).toBe(371); // from bitcoin optech calculator
    });
    it("estimates the transaction size in vbytes for 253 inputs", () => {
      expect(
        estimateMultisigP2SHTransactionVSize({
          numInputs: 254,
          numOutputs: 2,
          m: 2,
          n: 3,
        }),
      ).toBe(75514);
    });
    it("estimates the transaction size in vbytes for 253 outputs", () => {
      expect(
        estimateMultisigP2SHTransactionVSize({
          numInputs: 1,
          numOutputs: 253,
          m: 2,
          n: 3,
        }),
      ).toBe(8405);
    });
  });
});
