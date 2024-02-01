"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.validateOutput = validateOutput;
exports.validateOutputAmount = validateOutputAmount;
exports.validateOutputs = validateOutputs;
var _bignumber = _interopRequireDefault(require("bignumber.js"));
var _utils = require("./utils");
var _addresses = require("./addresses");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
/**
 * This module provides functions for validating transaction
 * output and amounts.
 */

/**
 * Represents an output in a transaction.
 */

/**
 * Validates the given transaction outputs.
 *
 * Returns an error message if there are no outputs.  Passes each output to [`validateOutput`]{@link module:transactions.validateOutput}.
 */
function validateOutputs(network, outputs, inputsTotalSats) {
  if (!outputs || outputs.length === 0) {
    return "At least one output is required.";
  }
  for (var outputIndex = 0; outputIndex < outputs.length; outputIndex++) {
    var output = outputs[outputIndex];
    var error = validateOutput(network, output, inputsTotalSats);
    if (error) {
      return error;
    }
  }
  return "";
}

/**
 * Validate the given transaction output.
 *
 * - Validates the presence and value of `address`.
 *
 * - Validates the presence and value of `amountSats`.  If `inputsTotalSats`
 *   is also passed, this will be taken into account when validating the
 *   amount.
 */
function validateOutput(network, output, inputsTotalSats) {
  if (output.amountSats !== 0 && !output.amountSats) {
    return "Does not have an 'amountSats' property.";
  }
  var error = validateOutputAmount(output.amountSats, inputsTotalSats);
  if (error) {
    return error;
  }
  if (!output.address) {
    return "Does not have an 'address' property.";
  }
  error = (0, _addresses.validateAddress)(output.address, network);
  if (error) {
    return "Has an invalid 'address' property: ".concat(error, ".");
  }
  return "";
}

/**
 * Lowest acceptable output amount in Satoshis.
 */
var DUST_LIMIT_SATS = "546";

/**
 * Validate the given output amount (in Satoshis).
 *
 * - Must be a parseable as a number.
 *
 * - Cannot be negative (zero is OK).
 *
 * - Cannot be smaller than the limit set by `DUST_LIMIT_SATS`.
 *
 * - Cannot exceed the total input amount (this check is only run if
 *   `inputsTotalSats` is passed.
 *
 *   TODO: minSats accepting a BigNumber is only to maintain some backward
 *   compatibility. Ideally, the arg would not expose this lib's dependencies to
 *   the caller. It should be made to only accept number or string.
 */
function validateOutputAmount(amountSats, maxSats) {
  var minSats = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : DUST_LIMIT_SATS;
  var a, its;
  try {
    a = new _bignumber.default(amountSats);
  } catch (e) {
    return "Invalid output amount.";
  }
  if (!a.isFinite()) {
    return "Invalid output amount.";
  }
  if (a.isLessThanOrEqualTo(_utils.ZERO)) {
    return "Output amount must be positive.";
  }
  if (a.isLessThanOrEqualTo(minSats)) {
    return "Output amount is too small.";
  }
  if (maxSats !== undefined) {
    try {
      its = new _bignumber.default(maxSats);
    } catch (e) {
      return "Invalid total input amount.";
    }
    if (!its.isFinite()) {
      return "Invalid total input amount.";
    }
    if (its.isLessThanOrEqualTo(_utils.ZERO)) {
      return "Total input amount must be positive.";
    }
    if (a.isGreaterThan(its)) {
      return "Output amount is too large.";
    }
  }
  return "";
}