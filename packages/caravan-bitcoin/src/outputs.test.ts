import BigNumber from "bignumber.js";

import { Network } from "./networks";
import {
  validateOutputs,
  validateOutput,
  validateOutputAmount,
} from "./outputs";

describe("outputs", () => {
  const validAddress = "2NE1LH35XT4YrdnEebk5oKMmRpGiYcUvpNR";

  describe("validateOutputs", () => {
    it("should return an error message if no outputs", () => {
      expect(validateOutputs(Network.TESTNET, [])).toMatch(
        /At least one output is required/i,
      );
    });

    it("should return an error message if one of the outputs is invalid", () => {
      expect(
        validateOutputs(Network.TESTNET, [
          { address: validAddress, amountSats: 1000 },
          { address: "foo", amountSats: 1000 },
        ]),
      ).toMatch(/invalid.+address/i);
    });

    it("should return an empty string if all outputs are valid", () => {
      expect(
        validateOutputs(Network.TESTNET, [
          { address: validAddress, amountSats: 1000 },
        ]),
      ).toEqual("");
    });
  });

  describe("validateOutput", () => {
    it("should return an error message for a missing amount", () => {
      expect(
        validateOutput(Network.TESTNET, { address: validAddress }),
      ).toMatch(/does not have.+amountSats/i);
    });

    it("should return an error message for an invalid amount", () => {
      BigNumber.DEBUG = true;
      expect(
        validateOutput(Network.TESTNET, {
          address: validAddress,
          amountSats: "foo",
        }),
      ).toMatch(/invalid output amount/i);
      BigNumber.DEBUG = false;
    });

    it("should return an error message for an invalid amount", () => {
      expect(
        validateOutput(Network.TESTNET, {
          address: validAddress,
          amountSats: "foo",
        }),
      ).toMatch(/invalid output amount/i);
    });

    it("should return an error message for a missing address", () => {
      expect(validateOutput(Network.TESTNET, { amountSats: 10000 })).toMatch(
        /does not have.+address/i,
      );
    });

    it("should return an error message for an invalid address", () => {
      expect(
        validateOutput(Network.TESTNET, { amountSats: 10000, address: "foo" }),
      ).toMatch(/invalid.+address/i);
    });

    it("returns an empty string on a valid output", () => {
      expect(
        validateOutput(Network.TESTNET, {
          amountSats: 10000,
          address: validAddress,
        }),
      ).toEqual("");
    });
  });

  describe("validateOutputAmount", () => {
    it("should return an error message for an unparseable output amount", () => {
      expect(validateOutputAmount("foo")).toMatch(/invalid output amount/i);
    });

    it("should return an error message for a negative output amount", () => {
      expect(validateOutputAmount(-10000)).toMatch(
        /output amount must be positive/i,
      );
    });

    it("should return an error message for a zero output amount", () => {
      expect(validateOutputAmount(0)).toMatch(
        /output amount must be positive/i,
      );
    });

    it("should return an error message when the output is too small", () => {
      expect(validateOutputAmount(100)).toMatch(/output amount is too small/i);
      expect(validateOutputAmount(800, undefined, new BigNumber(1000))).toMatch(
        /output amount is too small/i,
      );
    });

    it("should return an empty string on an acceptable amount", () => {
      expect(validateOutputAmount(100000)).toBe("");
    });

    describe("when also passing `inputTotalSats`", () => {
      it("should return an error message for an unparseable inputTotalSats amount", () => {
        BigNumber.DEBUG = true;
        expect(validateOutputAmount(1000, "foo")).toMatch(
          /invalid total input amount/i,
        );

        BigNumber.DEBUG = false;
      });

      it("should return an error message for an unparseable output amount", () => {
        expect(validateOutputAmount("foo", 100000)).toMatch(
          /invalid output amount/i,
        );
      });

      it("should return an error message for a negative output amount", () => {
        expect(validateOutputAmount(-10000, 100000)).toMatch(
          /output amount must be positive/i,
        );
      });

      it("should return an error message for a zero output amount", () => {
        expect(validateOutputAmount(0, 100000)).toMatch(
          /output amount must be positive/i,
        );
      });

      it("should return an error message when the output is too small", () => {
        expect(validateOutputAmount(100, 100000)).toMatch(
          /output amount is too small/i,
        );
        expect(validateOutputAmount(800, 100000, new BigNumber(1000))).toMatch(
          /output amount is too small/i,
        );
      });

      it("should return an error message for an unparseable total input amount", () => {
        expect(validateOutputAmount(100000, "foo")).toMatch(
          /invalid total input amount/i,
        );
      });

      it("should return an error message for a negative total input amount", () => {
        expect(validateOutputAmount(100000, -1000000)).toMatch(
          /total input amount must be positive/i,
        );
      });

      it("should return an error message for a zero total input amount", () => {
        expect(validateOutputAmount(100000, 0)).toMatch(
          /total input amount must be positive/i,
        );
      });

      it("should return an error message when the output is larger than the total input amount", () => {
        expect(validateOutputAmount(100001, 100000)).toMatch(
          /output amount is too large/i,
        );
      });

      it("should return an empty string on an acceptable amount", () => {
        expect(validateOutputAmount(100000, 1000000)).toBe("");
      });
    });
  });
});
