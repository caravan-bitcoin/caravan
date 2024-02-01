import {
  sortInputs,
  validateMultisigInputs,
  validateMultisigInput,
  validateTransactionID,
  validateTransactionIndex,
} from "./inputs";

const VALID_TXID =
  "65e7ef764030dabfb46e3ae1c357b0666d0dda722c9809fb73245d6d68665284";

describe("inputs", () => {
  describe("sortInputs", () => {
    it("sorts inputs in ascending lexicographic order by txid and index", () => {
      const unsortedInputs = [
        {
          txid: "def123",
          index: 0,
        },
        {
          txid: "0123",
          index: 2,
        },
        {
          txid: "abc123",
          index: 1,
        },
        {
          txid: "abc123",
          index: 0,
        },
        {
          txid: "abc123",
          index: 2,
        },
      ];
      const sortedInputs = sortInputs(unsortedInputs);
      expect(sortedInputs[0].txid).toEqual("0123");
      expect(sortedInputs[0].index).toEqual(2);
      expect(sortedInputs[1].txid).toEqual("abc123");
      expect(sortedInputs[1].index).toEqual(0);
      expect(sortedInputs[2].txid).toEqual("abc123");
      expect(sortedInputs[2].index).toEqual(1);
      expect(sortedInputs[3].txid).toEqual("abc123");
      expect(sortedInputs[3].index).toEqual(2);
      expect(sortedInputs[4].txid).toEqual("def123");
      expect(sortedInputs[4].index).toEqual(0);
    });
  });

  describe("validateMultisigInputs", () => {
    it("should return an error message with no inputs", () => {
      expect(validateMultisigInputs([])).toMatch(
        /At least one input.+required/i
      );
    });

    it("should return an error message if one of the inputs is invalid", () => {
      expect(
        validateMultisigInputs([
          { txid: VALID_TXID, index: 0 },
          { txid: VALID_TXID, index: 1, multisig: true },
        ])
      ).toMatch(/not have a multisig.+property/i);
    });

    it("should return an error message the UTXOs are duplicative", () => {
      expect(
        validateMultisigInputs([
          { txid: VALID_TXID, index: 0, multisig: true },
          { txid: VALID_TXID, index: 0, multisig: true },
        ])
      ).toMatch(/duplicate input/i);
    });

    it("should return an empty string if all inputs are valid", () => {
      expect(
        validateMultisigInputs([
          { txid: VALID_TXID, index: 0, multisig: true },
          { txid: VALID_TXID, index: 1, multisig: true },
        ])
      ).toEqual("");
    });
  });

  describe("validateMultisigInput", () => {
    it("should return an error message for a missing txid", () => {
      expect(validateMultisigInput({ index: 0, multisig: true })).toMatch(
        /does not have.+txid/i
      );
    });

    it("should return an error message for an invalid txid", () => {
      expect(
        validateMultisigInput({ index: 0, multisig: true, txid: "hi there" })
      ).toMatch(/txid is invalid/i);
    });

    it("should return an error message for a missing index", () => {
      expect(
        validateMultisigInput({ txid: VALID_TXID, multisig: true })
      ).toMatch(/does not have.+index/i);
    });

    it("should return an error message for an invalid index", () => {
      expect(
        validateMultisigInput({ txid: VALID_TXID, index: -1, multisig: true })
      ).toMatch(/index cannot be negative/i);
    });

    it("should return an error message for a missing multisig", () => {
      expect(validateMultisigInput({ txid: VALID_TXID, index: 0 })).toMatch(
        /does not have.+multisig/i
      );
    });
  });

  describe("validateBraidAwareMultisigInputs", () => {
    it("should return an error message with no inputs", () => {
      expect(validateMultisigInputs([], true)).toMatch(
        /At least one input.+required/i
      );
    });

    it("should return an error message if one of the inputs is invalid", () => {
      expect(
        validateMultisigInputs(
          [
            { txid: VALID_TXID, index: 0 },
            {
              txid: VALID_TXID,
              index: 1,
              multisig: { braidDetails: true, bip32Derivation: [] },
            },
          ],
          true
        )
      ).toMatch(/not have a multisig.+property/i);
    });

    it("should return an error message the UTXOs are duplicative", () => {
      expect(
        validateMultisigInputs(
          [
            { txid: VALID_TXID, index: 0, multisig: { braidDetails: true } },
            { txid: VALID_TXID, index: 0, multisig: { braidDetails: true } },
          ],
          true
        )
      ).toMatch(/duplicate input/i);
    });

    it("should return an error message if multisig object has no multisigBraidDetails", () => {
      expect(
        validateMultisigInputs(
          [{ txid: VALID_TXID, index: 0, multisig: true }],
          true
        )
      ).toMatch(
        /input cannot be traced back to its set of extended public keys/i
      );
    });

    it("should return an empty string if all inputs are valid", () => {
      expect(
        validateMultisigInputs(
          [
            { txid: VALID_TXID, index: 0, multisig: { braidDetails: true } },
            { txid: VALID_TXID, index: 1, multisig: { braidDetails: true } },
          ],
          true
        )
      ).toEqual("");
    });
  });

  describe("validateBraidAwareMultisigInputs", () => {
    it("should return an error message for a missing txid", () => {
      expect(
        validateMultisigInputs(
          [{ index: 0, multisig: { braidDetails: true } }],
          true
        )
      ).toMatch(/does not have.+txid/i);
    });

    it("should return an error message for an invalid txid", () => {
      expect(
        validateMultisigInputs([
          { index: 0, multisig: { braidDetails: true }, txid: "hi there" },
        ])
      ).toMatch(/txid is invalid/i);
    });

    it("should return an error message for a missing index", () => {
      expect(
        validateMultisigInputs(
          [{ txid: VALID_TXID, multisig: { braidDetails: true } }],
          true
        )
      ).toMatch(/does not have.+index/i);
    });

    it("should return an error message for an invalid index", () => {
      expect(
        validateMultisigInputs(
          [{ txid: VALID_TXID, index: -1, multisig: { braidDetails: true } }],
          true
        )
      ).toMatch(/index cannot be negative/i);
    });

    it("should return an error message for a missing multisig", () => {
      expect(
        validateMultisigInputs([{ txid: VALID_TXID, index: 0 }], true)
      ).toMatch(/does not have.+multisig/i);
    });
  });

  describe("validateTransactionID", () => {
    it("should return an error message for invalid TXIDs", () => {
      expect(validateTransactionID()).toMatch(/cannot be blank/i);
      expect(validateTransactionID("")).toMatch(/cannot be blank/i);
      expect(validateTransactionID("hi there")).toMatch(/invalid hex/i);
      expect(validateTransactionID("deadbeef")).toMatch(/invalid.+64/);
    });

    it("should return an empty string for a valid TXID", () => {
      expect(validateTransactionID(VALID_TXID)).toEqual("");
    });
  });

  describe("validateTransactionIndex", () => {
    it("should return an error message for invalid TXIDs", () => {
      expect(validateTransactionIndex()).toMatch(/cannot be blank/i);
      expect(validateTransactionIndex("")).toMatch(/cannot be blank/i);
      expect(validateTransactionIndex("foo")).toMatch(/index is invalid/i);
      expect(validateTransactionIndex("-1")).toMatch(/cannot be negative/i);
    });

    it("should return an empty string for a valid index", () => {
      expect(validateTransactionIndex(1)).toEqual("");
      expect(validateTransactionIndex(0)).toEqual("");
    });
  });
});
