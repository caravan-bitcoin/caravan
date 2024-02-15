"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.P2SH_P2WSH = void 0;
exports.estimateMultisigP2SH_P2WSHTransactionVSize = estimateMultisigP2SH_P2WSHTransactionVSize;
/**
 * This module provides functions and constants for the P2SH-wrapped
 * P2WSH address type, sometimes written P2SH-P2WSH.
 */

/**
 * Address type constant for "pay-to-script-hash" wrapped
 * "pay-to-witness-script-hash" (P2SH-P2WSH) addresses.
 */
var P2SH_P2WSH = "P2SH-P2WSH";

/**
 * Estimate the transaction virtual size (vsize) when spending inputs
 * from the same multisig P2SH-P2WSH address.
 */
exports.P2SH_P2WSH = P2SH_P2WSH;
function estimateMultisigP2SH_P2WSHTransactionVSize(config) {
  var baseSize = 76 * config.numInputs + 34 * config.numOutputs + 30;
  var signatureLength = 72;
  var overhead = 6;
  var keylength = 33;
  var witnessSize = signatureLength * config.m * config.numInputs + keylength * config.n * config.numInputs + overhead * config.numInputs;
  var vsize = Math.ceil(0.75 * baseSize + 0.25 * (baseSize + witnessSize));
  return vsize;
}