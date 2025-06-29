import { encoding } from "bufio";

import { compactSize } from "./utils";

/**
 * This module provides functions and constants for the P2WSH address type.
 */

/**
 * Address type constant for "pay-to-witness-script-hash" or (P2WSH)
 * addresses.
 */
export const P2WSH = "P2WSH";

/**
 * provides the size of single tx input for a segwit tx (i.e. empty script)
 * Each input field will look like:
 * prevhash (32 bytes) + prevIndex (4) + scriptsig (1) + sequence bytes (4)
 */
export function getP2WSHInputSize() {
  const PREVHASH_BYTES = 32;
  const PREV_INDEX_BYTES = 4;
  const SCRIPT_LENGTH_BYTES = 1;
  const SEQUENCE_BYTES = 4;

  return (
    PREVHASH_BYTES + PREV_INDEX_BYTES + SEQUENCE_BYTES + SCRIPT_LENGTH_BYTES
  );
}

/**
 * Returns the approximate size of outputs in tx.
 * Calculated by adding value field (8 bytes), field providing length
 * scriptPubkey and the script pubkey itself
 */
export function getP2WSHOutputSize(scriptPubkeySize = 34) {
  // per_output: value (8) + script length (1) +
  const VAL_BYTES = 8;
  const scriptLengthBytes = encoding.sizeVarint(scriptPubkeySize);
  // for P2WSH Locking script which is largest possible(34)
  return VAL_BYTES + scriptLengthBytes + scriptPubkeySize;
}

/**
 * calculates size of redeem script given n pubkeys.
 * Calculation looks like:
 * OP_M (1 byte) + size of each pubkey in redeem script (OP_DATA= 1 byte * N) +
 * pubkey size (33 bytes * N) + OP_N (1 byte) + OP_CHECKMULTISIG (1 byte)
 *  => 1 + (1 * N) + (33 * N) + 1 + 1
 */
export function getRedeemScriptSize(n) {
  const OP_M_BYTES = 1;
  const OP_N_BYTES = 1;
  const opDataBytes = n; // 1 byte per pubkey in redeem script
  const pubkeyBytes = 33 * n;
  const OP_CHECKMULTISIG_BYTES = 1;
  return (
    OP_M_BYTES + opDataBytes + pubkeyBytes + OP_N_BYTES + OP_CHECKMULTISIG_BYTES
  );
}

/**
 * Calculates the value of a multisig witness given m-of-n values
 *
 * According to Bitcoin Optech calculator (https://bitcoinops.org/en/tools/calc-size/):
 * - P2WSH 2-of-3 witness: 63.5 vbytes (254 bytes / 4)
 * - Format: (1) size(0) (empty) + (73) size(72) ecdsa_signature + (73) size(72) ecdsa_signature + (106) size(105) redeem_script
 *
 * Witness structure:
 * - Witness item count (varint)
 * - Size
 * - m signatures, each with size prefix
 * - Redeem script with size prefix
 */
export function getWitnessSize(m, n) {
  const WITNESS_ITEMS_COUNT = encoding.sizeVarint(1 + m + 1);
  const SIZE_PREFIX = 1;

  // Each signature: size prefix (1 byte for 72-byte signature) + signature (72 bytes)
  const SIGNATURE_SIZE_PREFIX = 1;
  const SIGNATURE_SIZE = 72; // Conservative estimate per Optech
  const SIGNATURES_SIZE = m * (SIGNATURE_SIZE_PREFIX + SIGNATURE_SIZE);

  // Redeem script: size prefix + script content
  const redeemScriptSize = getRedeemScriptSize(n);
  // https://btcinformation.org/en/developer-reference#compactsize-unsigned-integers
  const redeemScriptSizePrefix = compactSize(redeemScriptSize);
  const REDEEM_SCRIPT_SIZE = redeemScriptSizePrefix + redeemScriptSize;

  return (
    WITNESS_ITEMS_COUNT + SIZE_PREFIX + SIGNATURES_SIZE + REDEEM_SCRIPT_SIZE
  );
}

export function getWitnessWeight(m, n) {
  return getWitnessSize(m, n) / 4;
}

/**
 * Calculates the size of the fields in a transaction which DO NOT
 * get counted towards witness discount.
 * Calculated as: version bytes (4) + locktime bytes (4) + input_len (1+) + txins (41+) + output_len (1+) + outputs (9+)
 */
export function calculateBase(inputsCount, outputsCount) {
  let total = 0;
  total += 4; // version
  total += 4; // locktime

  total += encoding.sizeVarint(inputsCount); // inputs length
  total += inputsCount * getP2WSHInputSize();
  total += encoding.sizeVarint(outputsCount);
  total += outputsCount * getP2WSHOutputSize();
  return total;
}

export function calculateTotalWitnessSize({ numInputs, m, n }) {
  let total = 0;

  total += 1; // segwit marker
  total += 1; // segwit flag

  total += encoding.sizeVarint(numInputs); // bytes for number of witnesses
  total += numInputs * getWitnessSize(m, n); // add witness for each input

  return total;
}

/**
 * Calculate virtual bytes or "vsize".
 * vsize is equal three times "base size" of a tx w/o witness data, plus the
 * total size of all data, with the final result divided by scaling factor
 * of 4 and round up to the next integer. For example, if a transaction is
 * 200 bytes with new serialization, and becomes 99 bytes with marker, flag,
 * and witness removed, the vsize is (99 * 3 + 200) / 4 = 125 with round up.
 */
function calculateVSize(baseSize, witnessSize) {
  const WITNESS_SCALE_FACTOR = 4;
  const totalSize = baseSize + witnessSize;
  const txWeight = baseSize * 3 + totalSize;
  return Math.ceil(txWeight / WITNESS_SCALE_FACTOR);
}

/**
 * Estimate the transaction virtual size (vsize) when spending inputs
 * from the same multisig P2WSH address.
 */
export function estimateMultisigP2WSHTransactionVSize(config) {
  // non-segwit discount fields
  const baseSize = calculateBase(config.numInputs, config.numOutputs);
  // these are the values that benefit from the segwit discount
  const witnessSize = calculateTotalWitnessSize(config);
  return calculateVSize(baseSize, witnessSize);
}
