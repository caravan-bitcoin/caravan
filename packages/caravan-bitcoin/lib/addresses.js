"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.validateAddress = validateAddress;
require("core-js/modules/es6.regexp.match");
var _bitcoinAddressValidation = require("bitcoin-address-validation");
var _networks = require("./networks");
/**
 * This module provides validation messages related to addresses.
 */

var MAINNET_ADDRESS_MAGIC_BYTE_PATTERN = "^(bc1|[13])";
var TESTNET_ADDRESS_MAGIC_BYTE_PATTERN = "^(tb1|bcrt1|[mn2])";
var ADDRESS_BODY_PATTERN = "[A-HJ-NP-Za-km-z1-9]+$";
var BECH32_ADDRESS_MAGIC_BYTE_REGEX = /^(tb|bc)/;
var BECH32_ADDRESS_BODY_PATTERN = "[ac-hj-np-z02-9]+$";

/**
 * Validate a given bitcoin address.
 *
 * Address must be a valid address on the given bitcoin network.
 */
function validateAddress(address, network) {
  if (!address || address.trim() === "") {
    return "Address cannot be blank.";
  }
  var magic_byte_regex = network === _networks.Network.TESTNET ? TESTNET_ADDRESS_MAGIC_BYTE_PATTERN : MAINNET_ADDRESS_MAGIC_BYTE_PATTERN;
  var isBech32 = address.match(BECH32_ADDRESS_MAGIC_BYTE_REGEX);
  var address_body_regex = isBech32 ? BECH32_ADDRESS_BODY_PATTERN : ADDRESS_BODY_PATTERN;
  var address_regex = magic_byte_regex + address_body_regex;
  // This tests whether you've got the network lined up with address type or not
  if (!address.match(address_regex)) {
    if (network === _networks.Network.TESTNET) {
      return "Address must start with one of 'tb1', 'm', 'n', or '2' followed by letters or digits.";
    } else {
      return "Address must start with either of 'bc1', '1' or '3' followed by letters or digits.";
    }
  }
  return (0, _bitcoinAddressValidation.validate)(address) ? "" : "Address is invalid.";
}