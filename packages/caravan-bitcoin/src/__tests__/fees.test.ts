import { describe, it, expect } from "vitest";
import BigNumber from "bignumber.js";
import { FeeValidationError } from "../types/fees";
import {
  validateFeeRate,
  validateFee,
  estimateMultisigTransactionFee,
  estimateMultisigTransactionFeeRate,
  checkFeeError,
  checkFeeRateError,
} from "../fees";
import { P2SH } from "../p2sh";
import { P2SH_P2WSH } from "../p2sh_p2wsh";
import { P2WSH } from "../p2wsh";

describe("fees", () => {
  describe("validateFeeRate", () => {
    it("should return an error and message for an unparseable fee rate", () => {
      BigNumber.DEBUG = true;
      const feeRateSatsPerVbyte = null;
      const result = validateFeeRate(feeRateSatsPerVbyte);
      expect(result).toBe("Invalid fee rate.");
      BigNumber.DEBUG = false;
    });

    it("should return an error and message for a negative fee rate", () => {
      const feeRateSatsPerVbyte = -1;
      const result = validateFeeRate(feeRateSatsPerVbyte);
      expect(result).toBe("Fee rate cannot be negative.");
    });

    it("should return an error and message for a zero fee rate", () => {
      const feeRateSatsPerVbyte = 0;
      const result = validateFeeRate(feeRateSatsPerVbyte);
      expect(result).toBe("");
    });

    it("should return an error and message for a fee rate above maximum", () => {
      const feeRateSatsPerVbyte = 1001;
      const result = validateFeeRate(feeRateSatsPerVbyte);
      expect(result).toBe("Fee rate is too high.");
    });

    it("should return empty string for a valid fee rate", () => {
      const feeRateSatsPerVbyte = 1;
      const result = validateFeeRate(feeRateSatsPerVbyte);
      expect(result).toBe("");
    });
  });

  describe("validateFee", () => {
    it("should return an error and message for an unparseable fee", () => {
      BigNumber.DEBUG = true;
      const feeSats = null;
      const inputsTotalSats = 1000000;
      const result = validateFee(feeSats, inputsTotalSats);
      expect(result).toBe("Invalid fee.");
      BigNumber.DEBUG = false;
    });

    it("should return an error and message for a negative fee", () => {
      const feeSats = -1;
      const inputsTotalSats = 1000000;
      const result = validateFee(feeSats, inputsTotalSats);
      expect(result).toBe("Fee cannot be negative.");
    });

    it("should return an error and message for a zero fee", () => {
      const feeSats = 0;
      const inputsTotalSats = 1000000;
      const result = validateFee(feeSats, inputsTotalSats);
      expect(result).toBe("");
    });

    it("should return empty string for a valid fee", () => {
      const feeSats = 1000;
      const inputsTotalSats = 1000000;
      const result = validateFee(feeSats, inputsTotalSats);
      expect(result).toBe("");
    });
  });

  describe("estimateMultisigTransactionFee", () => {
    it("should estimate fee for P2SH transaction", () => {
      const config = {
        addressType: P2SH,
        numInputs: 1,
        numOutputs: 2,
        m: 2,
        n: 3,
        feesPerByteInSatoshis: "10",
      };
      const result = estimateMultisigTransactionFee(config);
      expect(result).toBeDefined();
      expect(Number(result)).toBeGreaterThan(0);
    });

    it("should estimate fee for P2WSH transaction", () => {
      const config = {
        addressType: P2WSH,
        numInputs: 1,
        numOutputs: 2,
        m: 2,
        n: 3,
        feesPerByteInSatoshis: "10",
      };
      const result = estimateMultisigTransactionFee(config);
      expect(result).toBeDefined();
      expect(Number(result)).toBeGreaterThan(0);
    });

    it("should estimate fee for P2SH_P2WSH transaction", () => {
      const config = {
        addressType: P2SH_P2WSH,
        numInputs: 1,
        numOutputs: 2,
        m: 2,
        n: 3,
        feesPerByteInSatoshis: "10",
      };
      const result = estimateMultisigTransactionFee(config);
      expect(result).toBeDefined();
      expect(Number(result)).toBeGreaterThan(0);
    });
  });

  describe("estimateMultisigTransactionFeeRate", () => {
    it("should estimate fee rate for P2SH transaction", () => {
      const config = {
        addressType: P2SH,
        numInputs: 1,
        numOutputs: 2,
        m: 2,
        n: 3,
        feesInSatoshis: "1000",
      };
      const result = estimateMultisigTransactionFeeRate(config);
      expect(result).toBeDefined();
      expect(Number(result)).toBeGreaterThan(0);
    });

    it("should estimate fee rate for P2WSH transaction", () => {
      const config = {
        addressType: P2WSH,
        numInputs: 1,
        numOutputs: 2,
        m: 2,
        n: 3,
        feesInSatoshis: "1000",
      };
      const result = estimateMultisigTransactionFeeRate(config);
      expect(result).toBeDefined();
      expect(Number(result)).toBeGreaterThan(0);
    });

    it("should estimate fee rate for P2SH_P2WSH transaction", () => {
      const config = {
        addressType: P2SH_P2WSH,
        numInputs: 1,
        numOutputs: 2,
        m: 2,
        n: 3,
        feesInSatoshis: "1000",
      };
      const result = estimateMultisigTransactionFeeRate(config);
      expect(result).toBeDefined();
      expect(Number(result)).toBeGreaterThan(0);
    });
  });

  describe("checkFeeError", () => {
    it("should return null for valid fee", () => {
      const feeSats = 1000;
      const inputsTotalSats = 1000000;
      const result = checkFeeError(feeSats, inputsTotalSats);
      expect(result).toBeNull();
    });

    it("should return error for invalid fee", () => {
      const feeSats = -1;
      const inputsTotalSats = 1000000;
      const result = checkFeeError(feeSats, inputsTotalSats);
      expect(result).toBe(FeeValidationError.FEE_CANNOT_BE_NEGATIVE);
    });
  });

  describe("checkFeeRateError", () => {
    it("should return null for valid fee rate", () => {
      const feeRateSatsPerVbyte = 1;
      const result = checkFeeRateError(feeRateSatsPerVbyte);
      expect(result).toBeNull();
    });

    it("should return error for invalid fee rate", () => {
      const feeRateSatsPerVbyte = -1;
      const result = checkFeeRateError(feeRateSatsPerVbyte);
      expect(result).toBe(FeeValidationError.FEE_RATE_CANNOT_BE_NEGATIVE);
    });
  });
});
