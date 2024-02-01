"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.sortInputs = sortInputs;
exports.validateMultisigInput = validateMultisigInput;
exports.validateMultisigInputs = validateMultisigInputs;
exports.validateTransactionID = validateTransactionID;
exports.validateTransactionIndex = validateTransactionIndex;
require("core-js/modules/es7.array.includes");
require("core-js/modules/es6.array.sort");
var _utils = require("./utils");
var _multisig = require("./multisig");
/**
 * This module provides functions for sorting & validating multisig
 * transaction inputs.
 */

/**
 * Represents a transaction input.
 *
 * The [`Multisig`]{@link module:multisig.MULTISIG} object represents
 * the address the corresponding UTXO belongs to.
 */

/**
 * Sorts the given inputs according to the [BIP69 standard]{@link https://github.com/bitcoin/bips/blob/master/bip-0069.mediawiki#transaction-inputs}: ascending lexicographic order.
 */
function sortInputs(inputs) {
  return inputs.sort(function (input1, input2) {
    if (input1.txid > input2.txid) {
      return 1;
    } else {
      if (input1.txid < input2.txid) {
        return -1;
      } else {
        return input1.index < input2.index ? -1 : 1;
      }
    }
  });
}

/**
 * Validates the given transaction inputs.
 *
 * Returns an error message if there are no inputs.  Passes each output to [`validateMultisigInput`]{@link module:transactions.validateOutput}.
 */
function validateMultisigInputs(inputs) {
  var braidRequired = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  if (!inputs || inputs.length === 0) {
    return "At least one input is required.";
  }
  var utxoIDs = [];
  for (var inputIndex = 0; inputIndex < inputs.length; inputIndex++) {
    var input = inputs[inputIndex];
    if (braidRequired && input.multisig && !(0, _multisig.multisigBraidDetails)(input.multisig)) {
      return "At least one input cannot be traced back to its set of extended public keys.";
    }
    var error = validateMultisigInput(input);
    if (error) {
      return error;
    }
    var utxoID = "".concat(input.txid, ":").concat(input.index);
    if (utxoIDs.includes(utxoID)) {
      return "Duplicate input: ".concat(utxoID);
    }
    utxoIDs.push(utxoID);
  }
  return "";
}

/**
 * Validates the given transaction input.
 *
 * - Validates the presence and value of the transaction ID (`txid`) property.
 *
 * - Validates the presence and value of the transaction index (`index`) property.
 *
 * - Validates the presence of the `multisig` property.
 */
function validateMultisigInput(input) {
  if (!input.txid) {
    return "Does not have a transaction ID ('txid') property.";
  }
  var error = validateTransactionID(input.txid);
  if (error) {
    return error;
  }
  if (input.index !== 0 && !input.index) {
    return "Does not have a transaction index ('index') property.";
  }
  error = validateTransactionIndex(input.index);
  if (error) {
    return error;
  }
  if (!input.multisig) {
    return "Does not have a multisig object ('multisig') property.";
  }
  return "";
}
var TXID_LENGTH = 64;

/**
 * Validates the given transaction ID.
 */
function validateTransactionID(txid) {
  if (txid === null || txid === undefined || txid === "") {
    return "TXID cannot be blank.";
  }
  var error = (0, _utils.validateHex)(txid);
  if (error) {
    return "TXID is invalid (".concat(error, ")");
  }
  if (txid.length !== TXID_LENGTH) {
    return "TXID is invalid (must be ".concat(TXID_LENGTH, "-characters)");
  }
  return "";
}

/**
 * Validates the given transaction index.
 */
function validateTransactionIndex(indexString) {
  if (indexString === null || indexString === undefined || indexString === "") {
    return "Index cannot be blank.";
  }
  var index = parseInt(indexString, 10);
  if (!isFinite(index)) {
    return "Index is invalid";
  }
  if (index < 0) {
    return "Index cannot be negative.";
  }
  return "";
}