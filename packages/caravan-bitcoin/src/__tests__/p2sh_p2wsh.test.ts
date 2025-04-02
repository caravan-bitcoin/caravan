import { describe, it, expect } from "vitest";
import { estimateMultisigP2SH_P2WSHTransactionVSize } from "../p2sh_p2wsh";

describe("p2sh_p2wsh", () => {
  describe("estimateMultisigP2SH_P2WSHTransactionVSize", () => {
    it("estimates the transaction size in vbytes", () => {
      expect(
        estimateMultisigP2SH_P2WSHTransactionVSize({
          numInputs: 1,
          numOutputs: 2,
          m: 2,
          n: 3,
        }),
      ).toEqual(237);
    });
  });
});
