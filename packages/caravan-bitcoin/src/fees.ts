/**
 * This module provides functions for calculating & validating
 * transaction fees.
 */

import BigNumber from "bignumber.js";

import { FeeValidationError } from "./types";

import { P2SH, estimateMultisigP2SHTransactionVSize } from "./p2sh";
import {
  P2SH_P2WSH,
  estimateMultisigP2SH_P2WSHTransactionVSize,
} from "./p2sh_p2wsh";
import { P2WSH, estimateMultisigP2WSHTransactionVSize } from "./p2wsh";
import { ZERO } from "./utils";

// Without this, BigNumber will report strings as exponentials. 16 places covers
// all possible values in satoshis.
BigNumber.config({ EXPONENTIAL_AT: 16 });

/**
 * Maxmium acceptable transaction fee rate in Satoshis/vbyte.
 */
const MAX_FEE_RATE_SATS_PER_VBYTE = new BigNumber(1000); // 1000 Sats/vbyte

/**
 * Maxmium acceptable transaction fee in Satoshis.
 */
const MAX_FEE_SATS = new BigNumber(2500000); // ~ 0.025 BTC ~ $250 if 1 BTC = $10k

/**
 * Provide a readable message from a FeeValidationError for user display.
 */
export function getFeeErrorMessage(error: FeeValidationError | null) {
  let errorMessage = "";

  switch (error) {
    case FeeValidationError.FEE_CANNOT_BE_NEGATIVE:
      errorMessage = "Fee cannot be negative.";
      break;

    case FeeValidationError.FEE_RATE_CANNOT_BE_NEGATIVE:
      errorMessage = "Fee rate cannot be negative.";
      break;

    case FeeValidationError.FEE_TOO_HIGH:
      errorMessage = "Fee is too high.";
      break;

    case FeeValidationError.FEE_RATE_TOO_HIGH:
      errorMessage = "Fee rate is too high.";
      break;

    case FeeValidationError.INPUT_AMOUNT_MUST_BE_POSITIVE:
      errorMessage = "Total input amount must be positive.";
      break;

    case FeeValidationError.INVALID_FEE:
      errorMessage = "Invalid fee.";
      break;

    case FeeValidationError.INVALID_FEE_RATE:
      errorMessage = "Invalid fee rate.";
      break;

    case FeeValidationError.INVALID_INPUT_AMOUNT:
      errorMessage = "Invalid total input amount.";
      break;

    default:
      break;
  }

  return errorMessage;
}

/**
 * Validate the given transaction fee and input sats. Returns a fee
 * validation error type if invalid. Returns null if valid.
 */
export function checkFeeError(feeSats, inputsTotalSats) {
  let fs, its;
  try {
    fs = new BigNumber(feeSats);
  } catch (e) {
    return FeeValidationError.INVALID_FEE;
  }
  if (!fs.isFinite()) {
    return FeeValidationError.INVALID_FEE;
  }
  try {
    its = new BigNumber(inputsTotalSats);
  } catch (e) {
    return FeeValidationError.INVALID_INPUT_AMOUNT;
  }
  if (!its.isFinite()) {
    return FeeValidationError.INVALID_INPUT_AMOUNT;
  }
  if (fs.isLessThan(ZERO)) {
    return FeeValidationError.FEE_CANNOT_BE_NEGATIVE;
  }
  if (its.isLessThanOrEqualTo(ZERO)) {
    return FeeValidationError.INPUT_AMOUNT_MUST_BE_POSITIVE;
  }
  if (fs.isGreaterThan(its)) {
    return FeeValidationError.FEE_TOO_HIGH;
  }
  if (fs.isGreaterThan(MAX_FEE_SATS)) {
    return FeeValidationError.FEE_TOO_HIGH;
  }
  return null;
}

/**
 * Validate the given transaction fee rate (sats/vByte). Returns a fee
 * validation error type if invalid. Returns null if valid.
 */
export function checkFeeRateError(feeRateSatsPerVbyte) {
  let fr: BigNumber;

  try {
    fr = new BigNumber(feeRateSatsPerVbyte);
  } catch (e) {
    return FeeValidationError.INVALID_FEE_RATE;
  }
  if (!fr.isFinite()) {
    return FeeValidationError.INVALID_FEE_RATE;
  }
  if (fr.isLessThan(ZERO)) {
    return FeeValidationError.FEE_RATE_CANNOT_BE_NEGATIVE;
  }
  if (fr.isGreaterThan(MAX_FEE_RATE_SATS_PER_VBYTE)) {
    return FeeValidationError.FEE_RATE_TOO_HIGH;
  }

  return null;
}

/**
 * Validate the given transaction fee rate (in Satoshis/vbyte). Returns an
 * error message if invalid. Returns empty string if valid.
 *
 * - Must be parseable as a number.
 *
 * - Cannot be negative (zero is OK).
 *
 * - Cannot be greater than the limit set by
 *   `MAX_FEE_RATE_SATS_PER_VBYTE`.
 */
export function validateFeeRate(feeRateSatsPerVbyte) {
  return getFeeErrorMessage(checkFeeRateError(feeRateSatsPerVbyte));
}

/**
 * Validate the given transaction fee (in Satoshis).
 *
 * - Must be a parseable as a number.
 *
 * - Cannot be negative (zero is OK).
 *
 * - Cannot exceed the total input amount.
 *
 * - Cannot be higher than the limit set by `MAX_FEE_SATS`.
 */
export function validateFee(feeSats, inputsTotalSats) {
  return getFeeErrorMessage(checkFeeError(feeSats, inputsTotalSats));
}

/**
 * Estimate transaction fee rate based on actual fee and address type, number of inputs and number of outputs.
 */
export function estimateMultisigTransactionFeeRate(config) {
  const vSize = estimateMultisigTransactionVSize(config);

  if (vSize === null) {
    return null;
  }

  return new BigNumber(config.feesInSatoshis).dividedBy(vSize).toString();
}

/**
 * Estimate transaction fee based on fee rate, address type, number of inputs and outputs.
 */
export function estimateMultisigTransactionFee(config) {
  const vSize = estimateMultisigTransactionVSize(config);

  if (vSize === null) {
    return null;
  }

  const feeAsNumber = new BigNumber(config.feesPerByteInSatoshis)
    .multipliedBy(vSize)
    .toNumber();

  // In the case that feesPerByteInSatoshis is a float, feeAsNumber might be a
  // float. A fraction of a satoshi is not possible on-chain. Estimate worse
  // case fee and calculate ceil.
  return Math.ceil(feeAsNumber).toString();
}

function estimateMultisigTransactionVSize(config) {
  switch (config.addressType) {
    case P2SH:
      return estimateMultisigP2SHTransactionVSize(config);
    case P2SH_P2WSH:
      return estimateMultisigP2SH_P2WSHTransactionVSize(config);
    case P2WSH:
      return estimateMultisigP2WSHTransactionVSize(config);
    default:
      return null;
  }
}
