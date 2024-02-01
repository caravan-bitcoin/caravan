/**
 * This module provides functions and constants for the P2SH-wrapped
 * P2WSH address type, sometimes written P2SH-P2WSH.
 */

/**
 * Address type constant for "pay-to-script-hash" wrapped
 * "pay-to-witness-script-hash" (P2SH-P2WSH) addresses.
 */
export const P2SH_P2WSH = "P2SH-P2WSH";

/**
 * Estimate the transaction virtual size (vsize) when spending inputs
 * from the same multisig P2SH-P2WSH address.
 */
export function estimateMultisigP2SH_P2WSHTransactionVSize(config) {
  const baseSize = 76 * config.numInputs + 34 * config.numOutputs + 30;
  const signatureLength = 72;
  const overhead = 6;
  const keylength = 33;
  const witnessSize =
    signatureLength * config.m * config.numInputs +
    keylength * config.n * config.numInputs +
    overhead * config.numInputs;
  const vsize = Math.ceil(0.75 * baseSize + 0.25 * (baseSize + witnessSize));
  return vsize;
}
