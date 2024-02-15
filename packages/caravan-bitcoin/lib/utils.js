"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ZERO = void 0;
exports.bitcoinsToSatoshis = bitcoinsToSatoshis;
exports.hash160 = hash160;
exports.satoshisToBitcoins = satoshisToBitcoins;
exports.toHexString = toHexString;
exports.validBase64 = validBase64;
exports.validateHex = validateHex;
require("core-js/modules/es6.regexp.to-string");
require("core-js/modules/es6.object.to-string");
require("core-js/modules/es6.array.slice");
require("core-js/modules/es6.array.map");
var _bignumber = _interopRequireDefault(require("bignumber.js"));
var _bitcoinjsLib = require("bitcoinjs-lib");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
/**
 * This module provides conversion and validation functions for units
 * (Satoshis, BTC) and hex strings.
 */

// Without this, BigNumber will report strings as exponentials. 16 places covers
// all possible values in satoshis.
_bignumber.default.config({
  EXPONENTIAL_AT: 16
});
var VALID_BASE64_REGEX = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/;
var VALID_HEX_REGEX = /^[0-9A-Fa-f]*$/;

/**
 * Converts a byte array to its hex representation.
 */
function toHexString(byteArray) {
  return Array.prototype.map.call(byteArray, function (byte) {
    return ("0" + (byte & 0xff).toString(16)).slice(-2);
  }).join("");
}

/**
 * Validate whether the given string is base64.
 *
 * - Valid base64 consists of whole groups of 4 characters containing `a-z`, `A-Z`, 0-9,
 *   `+`, or `/`. The end of the string may be padded with `==` or `=` to
 *   complete the four character group.
 */
function validBase64(inputString) {
  return VALID_BASE64_REGEX.test(inputString);
}

/**
 * Validate whether the given string is hex.
 *
 * - Valid hex consists of an even number of characters 'a-f`, `A-F`,
 *   or `0-9`.  This is case-insensitive.
 *
 * - The presence of the common prefix `0x` will make the input be
 *   considered invalid (because of the` `x`).
 */
function validateHex(inputString) {
  if (inputString.length % 2) {
    return "Invalid hex: odd-length string.";
  }
  if (!VALID_HEX_REGEX.test(inputString)) {
    return "Invalid hex: only characters a-f, A-F and 0-9 allowed.";
  }
  return "";
}

/**
 * Convert a value in Satoshis to BTC.
 *
 * - Accepts both positive and negative input values.
 * - Rounds down (towards zero) input value to the nearest Satoshi.
 */
function satoshisToBitcoins(satoshis) {
  var originalValue = new _bignumber.default(satoshis);
  var roundedValue = originalValue.integerValue(_bignumber.default.ROUND_DOWN);
  return roundedValue.shiftedBy(-8).toString();
}

/**
 * Convert a value in BTC to Satoshis.
 *
 * - Accepts both positive and negative input values.
 * - Rounds down output value to the nearest Satoshi.
 */
function bitcoinsToSatoshis(btc) {
  var btcAmount = new _bignumber.default(btc);
  return new _bignumber.default(btc).shiftedBy(8).integerValue(_bignumber.default.ROUND_DOWN).toString();
}
var ZERO = new _bignumber.default(0);

/**
 * Given a buffer as a digest, pass through sha256 and ripemd160
 * hash functions. Returns the result
 */
exports.ZERO = ZERO;
function hash160(buf) {
  return _bitcoinjsLib.crypto.ripemd160(_bitcoinjsLib.crypto.sha256(buf));
}