/**
 * This module provides functions and constants for the P2SH address type.
 */

/**
 * Address type constant for "pay-to-script-hash" (P2SH) addresses.
 */
export const P2SH = "P2SH";

/**
 * Estimate the transaction virtual size (vsize) when spending inputs
 * from the same multisig P2SH address.
 */
export function estimateMultisigP2SHTransactionVSize(config: {
  numInputs: number;
  numOutputs: number;
  m: number;
  n: number;
}) {
  const baseSize = 41 * config.numInputs + 32 * config.numOutputs + 30;
  const signatureLength = 72 + 1; // approx including push byte
  const scriptOverhead = 4;
  const keylength = 33 + 1; // push byte
  const sigSize =
    signatureLength * config.m * config.numInputs +
    keylength * config.n * config.numInputs +
    scriptOverhead * config.numInputs;
  const vsize = baseSize + sigSize;
  return vsize;
}
