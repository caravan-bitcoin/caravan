"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.P2SH = void 0;
exports.estimateMultisigP2SHTransactionVSize = estimateMultisigP2SHTransactionVSize;
/**
 * This module provides functions and constants for the P2SH address type.
 */

/**
 * Address type constant for "pay-to-script-hash" (P2SH) addresses.
 */
var P2SH = "P2SH";

/**
 * Estimate the transaction virtual size (vsize) when spending inputs
 * from the same multisig P2SH address.
 */
exports.P2SH = P2SH;
function estimateMultisigP2SHTransactionVSize(config) {
  var baseSize = 41 * config.numInputs + 34 * config.numOutputs + 30;
  var signatureLength = 72 + 1; // approx including push byte
  var scriptOverhead = 4;
  var keylength = 33 + 1; // push byte
  var sigSize = signatureLength * config.m * config.numInputs + keylength * config.n * config.numInputs + scriptOverhead * config.numInputs;
  var vsize = baseSize + sigSize;
  return vsize;
}