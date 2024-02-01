import { estimateMultisigP2SH_P2WSHTransactionVSize } from "./p2sh_p2wsh";

describe("p2sh_p2wsh", () => {
  describe("estimateMultisigP2SH_P2WSHTransactionVSize", () => {
    it("estimates the transaction size in vbytes", () => {
      expect(
        estimateMultisigP2SH_P2WSHTransactionVSize({
          numInputs: 2,
          numOutputs: 2,
          m: 3,
          n: 5,
        })
      ).toBe(444); // actual value from bitcoin core for P2PKH out
    });
  });
});
