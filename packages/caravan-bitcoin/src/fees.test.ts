import { BigNumber } from "bignumber.js";

import {
  validateFeeRate,
  validateFee,
  estimateMultisigTransactionFee,
  estimateMultisigTransactionFeeRate,
  checkFeeError,
  checkFeeRateError,
} from "./fees";
import { P2SH } from "./p2sh";
import { P2SH_P2WSH } from "./p2sh_p2wsh";
import { P2WSH } from "./p2wsh";
import { FeeValidationError } from "./types";

describe("fees", () => {
  describe("validateFeeRate", () => {
    it("should return an error and message for an unparseable fee rate", () => {
      BigNumber.DEBUG = true;
      const feeRateSatsPerVbyte = null;
      expect(checkFeeRateError(feeRateSatsPerVbyte)).toBe(
        FeeValidationError.INVALID_FEE_RATE,
      );
      expect(validateFeeRate(feeRateSatsPerVbyte)).toMatch(/invalid fee rate/i);
      BigNumber.DEBUG = false;
    });

    it("should return an error and message for an unparseable fee rate", () => {
      const feeRateSatsPerVbyte = "foo";
      expect(checkFeeRateError(feeRateSatsPerVbyte)).toBe(
        FeeValidationError.INVALID_FEE_RATE,
      );
      expect(validateFeeRate(feeRateSatsPerVbyte)).toMatch(/invalid fee rate/i);
    });

    it("should return an error and message for a negative fee rate", () => {
      const feeRateSatsPerVbyte = -1;
      expect(checkFeeRateError(feeRateSatsPerVbyte)).toBe(
        FeeValidationError.FEE_RATE_CANNOT_BE_NEGATIVE,
      );
      expect(validateFeeRate(feeRateSatsPerVbyte)).toMatch(
        /cannot be negative/i,
      );
    });

    it("should return an empty string for a zero fee rate", () => {
      const feeRateSatsPerVbyte = 0;
      expect(checkFeeRateError(feeRateSatsPerVbyte)).toBe(null);
      expect(validateFeeRate(feeRateSatsPerVbyte)).toBe("");
    });

    it("should return an error and message when the fee rate is too high", () => {
      const feeRateSatsPerVbyte = 10000;
      expect(checkFeeRateError(feeRateSatsPerVbyte)).toBe(
        FeeValidationError.FEE_RATE_TOO_HIGH,
      );
      expect(validateFeeRate(feeRateSatsPerVbyte)).toMatch(/too high/i);
    });

    it("return an empty string and no error for an acceptable fee rate", () => {
      const feeRateSatsPerVbyte = 100;
      expect(checkFeeRateError(feeRateSatsPerVbyte)).toBe(null);
      expect(validateFeeRate(feeRateSatsPerVbyte)).toBe("");
    });
  });

  describe("validateFee", () => {
    it("should return an error and message for an unparseable fee", () => {
      // If BigNumber.DEBUG is set true then an error will be thrown if this BigNumber constructor receives an invalid value
      // see https://mikemcl.github.io/bignumber.js/#debug
      BigNumber.DEBUG = true;
      const feeSats = null;
      const inputsTotalSats = 1000000;
      expect(checkFeeError(feeSats, inputsTotalSats)).toBe(
        FeeValidationError.INVALID_FEE,
      );
      expect(validateFee(feeSats, inputsTotalSats)).toMatch(/invalid fee/i);
      BigNumber.DEBUG = false;
    });

    it("should return an error and message for an unparseable inputTotalSats", () => {
      BigNumber.DEBUG = true;
      const feeSats = 10000;
      const inputsTotalSats = null;
      expect(checkFeeError(feeSats, inputsTotalSats)).toBe(
        FeeValidationError.INVALID_INPUT_AMOUNT,
      );
      expect(validateFee(feeSats, inputsTotalSats)).toMatch(
        /invalid total input amount/i,
      );
      BigNumber.DEBUG = false;
    });

    it("should return an error and message for an unparseable fee", () => {
      const feeSats = "foo";
      const inputsTotalSats = 1000000;
      expect(checkFeeError(feeSats, inputsTotalSats)).toBe(
        FeeValidationError.INVALID_FEE,
      );
      expect(validateFee(feeSats, inputsTotalSats)).toMatch(/invalid fee/i);
    });

    it("should return an error and message for an unparseable total input amount", () => {
      const feeSats = 10000;
      const inputsTotalSats = "foo";
      expect(checkFeeError(feeSats, inputsTotalSats)).toBe(
        FeeValidationError.INVALID_INPUT_AMOUNT,
      );
      expect(validateFee(feeSats, inputsTotalSats)).toMatch(
        /invalid total input amount/i,
      );
    });

    it("should return an error and message for a negative fee", () => {
      const feeSats = -1;
      const inputsTotalSats = 1000000;
      expect(checkFeeError(feeSats, inputsTotalSats)).toBe(
        FeeValidationError.FEE_CANNOT_BE_NEGATIVE,
      );
      expect(validateFee(feeSats, inputsTotalSats)).toMatch(
        /cannot be negative/i,
      );
    });

    it("should return an error and message for a negative total input amount", () => {
      const feeSats = 10000;
      const inputsTotalSats = -1;
      expect(checkFeeError(feeSats, inputsTotalSats)).toBe(
        FeeValidationError.INPUT_AMOUNT_MUST_BE_POSITIVE,
      );
      expect(validateFee(feeSats, inputsTotalSats)).toMatch(
        /must be positive/i,
      );
    });

    it("should return an error and message for a zero total linput amount", () => {
      const feeSats = 10000;
      const inputsTotalSats = 0;
      expect(checkFeeError(feeSats, inputsTotalSats)).toBe(
        FeeValidationError.INPUT_AMOUNT_MUST_BE_POSITIVE,
      );
      expect(validateFee(feeSats, inputsTotalSats)).toMatch(
        /must be positive/i,
      );
    });

    it("should return an empty string and not error for a zero fee", () => {
      const feeSats = 0;
      const inputsTotalSats = 1000000;
      expect(checkFeeError(feeSats, inputsTotalSats)).toBe(null);
      expect(validateFee(feeSats, inputsTotalSats)).toBe("");
    });

    it("should return an error and message when the fee is too high", () => {
      const feeSats = 2500001;
      const inputsTotalSats = 10000000;
      expect(checkFeeError(feeSats, inputsTotalSats)).toBe(
        FeeValidationError.FEE_TOO_HIGH,
      );
      expect(validateFee(feeSats, inputsTotalSats)).toMatch(/too high/i);
    });

    it("should return an error and message when the fee higher than the total input amount", () => {
      const feeSats = 100001;
      const inputsTotalSats = 100000;
      expect(checkFeeError(feeSats, inputsTotalSats)).toBe(
        FeeValidationError.FEE_TOO_HIGH,
      );
      expect(validateFee(feeSats, inputsTotalSats)).toMatch(/too high/i);
    });

    it("should return an empty string and no error for an acceptable fee", () => {
      const feeSats = 10000;
      const inputsTotalSats = 1000000;
      expect(checkFeeError(feeSats, inputsTotalSats)).toBe(null);
      expect(validateFee(feeSats, inputsTotalSats)).toBe("");
    });
  });

  describe("estimating multisig transaction fees and fee rates", () => {
    it("should estimate null for bad addressType", () => {
      const params = {
        addressType: "foo",
        feesPerByteInSatoshis: "10",
      };
      const fee = estimateMultisigTransactionFee(params);
      expect(fee).toBe(null);
    });

    it("should estimate for P2SH transactions", () => {
      const params = {
        addressType: P2SH,
        numInputs: 2,
        numOutputs: 3,
        m: 2,
        n: 3,
        feesInSatoshis: "7000",
        feesPerByteInSatoshis: "10",
      };
      const fee = estimateMultisigTransactionFee(params);
      const feeRate = estimateMultisigTransactionFeeRate(params);
      expect(fee).toEqual(String(params.feesInSatoshis));
      expect(feeRate).toEqual(String(params.feesPerByteInSatoshis));
    });

    it("should estimate for P2SH-P2WSH transactions", () => {
      const params = {
        addressType: P2SH_P2WSH,
        numInputs: 2,
        numOutputs: 3,
        m: 2,
        n: 3,
        feesInSatoshis: "3190",
        feesPerByteInSatoshis: "10",
      };
      const fee = estimateMultisigTransactionFee(params);
      const feeRate = estimateMultisigTransactionFeeRate(params);
      expect(fee).toEqual(String(params.feesInSatoshis));
      expect(feeRate).toEqual(String(params.feesPerByteInSatoshis));
    });

    it("should estimate for P2WSH transactions", () => {
      // fee amounts from real tbtc tx
      // 0c18cb0ac72a3bd610bc3cd9c79a6fc5d3786a8d9777c26a3a264a3181862db2
      const params = {
        addressType: P2WSH,
        numInputs: 3,
        numOutputs: 3,
        m: 2,
        n: 3,
        feesInSatoshis: "4540",
        feesPerByteInSatoshis: "10",
      };
      const fee = estimateMultisigTransactionFee(params);
      const feeRate = estimateMultisigTransactionFeeRate(params);
      expect(fee).toEqual(String(params.feesInSatoshis));
      expect(feeRate).toEqual(String(params.feesPerByteInSatoshis));
    });
  });
});
