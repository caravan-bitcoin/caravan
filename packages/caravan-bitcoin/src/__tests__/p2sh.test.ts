import { describe, it, expect } from "vitest";
import { estimateMultisigP2SHTransactionVSize } from "../p2sh";

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
      ).toEqual(391);
    });
  });
});
