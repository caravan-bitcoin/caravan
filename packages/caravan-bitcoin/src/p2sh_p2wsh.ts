/**
 * This module provides functions and constants for the P2SH-wrapped
 * P2WSH address type, sometimes written P2SH-P2WSH.
 */

import { getP2SHOutputSize } from "./p2sh";
import { getWitnessSize } from "./p2wsh";

/**
 * Address type constant for "pay-to-script-hash" wrapped
 * "pay-to-witness-script-hash" (P2SH-P2WSH) addresses.
 */
export const P2SH_P2WSH = "P2SH-P2WSH";

/**
 * Estimate the transaction virtual size (vsize) when spending inputs
 * from the same multisig P2SH-P2WSH address.
 *
 * According to Bitcoin Optech calculator:
 * - P2SH-P2WSH has the same witness structure as P2WSH
 * - Base input size is different: includes P2SH redeem script (22 bytes) instead of empty script
 * - Weight calculation: (baseSize * 3 + witnessSize) / 4
 */
export function estimateMultisigP2SH_P2WSHTransactionVSize(config) {
  // Base input size: prevhash (32) + prevIndex (4) + script length (1) + P2SH redeem script (22) + sequence (4)
  const baseInputSize = getP2SH_P2WSHInputSize();

  // Output size: value (8) + script length (1) + script (23)
  const outputSize = getP2SH_P2WSHOutputSize();

  // Transaction overhead: version (4) + locktime (4) + input count (1) + output count (1)
  const transactionOverhead = 4 + 4 + 1 + 1;

  // Base size (non-witness data)
  const baseSize =
    baseInputSize * config.numInputs +
    outputSize * config.numOutputs +
    transactionOverhead;

  // Witness size (same as P2WSH)
  const witnessSize = getWitnessSize(config.m, config.n) * config.numInputs;

  // Virtual size calculation: (baseSize * 3 + witnessSize) / 4
  const vsize = Math.ceil((baseSize * 3 + witnessSize) / 4);

  return vsize;
}

export function getP2SH_P2WSHOutputSize() {
  return getP2SHOutputSize();
}

/**
 * Calculates the base input size for a P2SH-P2WSH input (without witness discount).
 * Base input: prevhash (32) + prevIndex (4) + script length (1) + P2SH redeem script (22) + sequence (4)
 * Note: Signatures are in witness data, not in the base input
 */
export function getP2SH_P2WSHInputSize(): number {
  const PREVHASH_BYTES = 32;
  const PREV_INDEX_BYTES = 4;
  const SCRIPT_LENGTH_BYTES = 1;
  const P2SH_P2WSH_SCRIPT_SIG_SIZE = 34; // This is the P2SH redeem script (hash of witness script)
  const SEQUENCE_BYTES = 4;

  return (
    PREVHASH_BYTES +
    PREV_INDEX_BYTES +
    SCRIPT_LENGTH_BYTES +
    P2SH_P2WSH_SCRIPT_SIG_SIZE +
    SEQUENCE_BYTES
  );
}
