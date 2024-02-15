"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.estimateMultisigTransactionFee = estimateMultisigTransactionFee;
exports.estimateMultisigTransactionFeeRate = estimateMultisigTransactionFeeRate;
exports.validateFee = validateFee;
exports.validateFeeRate = validateFeeRate;
require("core-js/modules/es6.regexp.to-string");
require("core-js/modules/es6.object.to-string");
var _bignumber = _interopRequireDefault(require("bignumber.js"));
var _p2sh = require("./p2sh");
var _p2sh_p2wsh = require("./p2sh_p2wsh");
var _p2wsh = require("./p2wsh");
var _utils = require("./utils");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
/**
 * This module provides functions for calculating & validating
 * transaction fees.
 */

// Without this, BigNumber will report strings as exponentials. 16 places covers
// all possible values in satoshis.
_bignumber.default.config({
  EXPONENTIAL_AT: 16
});

/**
 * Maxmium acceptable transaction fee rate in Satoshis/vbyte.
 */
var MAX_FEE_RATE_SATS_PER_VBYTE = new _bignumber.default(1000); // 1000 Sats/vbyte

/**
 * Maxmium acceptable transaction fee in Satoshis.
 */
var MAX_FEE_SATS = new _bignumber.default(2500000); // ~ 0.025 BTC ~ $250 if 1 BTC = $10k

/**
 * Validate the given transaction fee rate (in Satoshis/vbyte).
 *
 * - Must be a parseable as a number.
 *
 * - Cannot be negative (zero is OK).
 *
 * - Cannot be greater than the limit set by
 *   `MAX_FEE_RATE_SATS_PER_VBYTE`.
 */
function validateFeeRate(feeRateSatsPerVbyte) {
  var fr;
  try {
    fr = new _bignumber.default(feeRateSatsPerVbyte);
  } catch (e) {
    return "Invalid fee rate.";
  }
  if (!fr.isFinite()) {
    return "Invalid fee rate.";
  }
  if (fr.isLessThan(_utils.ZERO)) {
    return "Fee rate cannot be negative.";
  }
  if (fr.isGreaterThan(MAX_FEE_RATE_SATS_PER_VBYTE)) {
    return "Fee rate is too high.";
  }
  return "";
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
function validateFee(feeSats, inputsTotalSats) {
  var fs, its;
  try {
    fs = new _bignumber.default(feeSats);
  } catch (e) {
    return "Invalid fee.";
  }
  if (!fs.isFinite()) {
    return "Invalid fee.";
  }
  try {
    its = new _bignumber.default(inputsTotalSats);
  } catch (e) {
    return "Invalid total input amount.";
  }
  if (!its.isFinite()) {
    return "Invalid total input amount.";
  }
  if (fs.isLessThan(_utils.ZERO)) {
    return "Fee cannot be negative.";
  }
  if (its.isLessThanOrEqualTo(_utils.ZERO)) {
    return "Total input amount must be positive.";
  }
  if (fs.isGreaterThan(its)) {
    return "Fee is too high.";
  }
  if (fs.isGreaterThan(MAX_FEE_SATS)) {
    return "Fee is too high.";
  }
  return "";
}

/**
 * Estimate transaction fee rate based on actual fee and address type, number of inputs and number of outputs.
 */
function estimateMultisigTransactionFeeRate(config) {
  var vSize = estimateMultisigTransactionVSize(config);
  if (vSize === null) {
    return null;
  }
  return new _bignumber.default(config.feesInSatoshis).dividedBy(vSize).toString();
}

/**
 * Estimate transaction fee based on fee rate, address type, number of inputs and outputs.
 */
function estimateMultisigTransactionFee(config) {
  var vSize = estimateMultisigTransactionVSize(config);
  if (vSize === null) {
    return null;
  }
  var feeAsNumber = new _bignumber.default(config.feesPerByteInSatoshis).multipliedBy(vSize).toNumber();

  // In the case that feesPerByteInSatoshis is a float, feeAsNumber might be a
  // float. A fraction of a satoshi is not possible on-chain. Estimate worse
  // case fee and calculate ceil.
  return Math.ceil(feeAsNumber).toString();
}
function estimateMultisigTransactionVSize(config) {
  switch (config.addressType) {
    case _p2sh.P2SH:
      return (0, _p2sh.estimateMultisigP2SHTransactionVSize)(config);
    case _p2sh_p2wsh.P2SH_P2WSH:
      return (0, _p2sh_p2wsh.estimateMultisigP2SH_P2WSHTransactionVSize)(config);
    case _p2wsh.P2WSH:
      return (0, _p2wsh.estimateMultisigP2WSHTransactionVSize)(config);
    default:
      return null;
  }
}