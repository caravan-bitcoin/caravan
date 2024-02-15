import { encoding } from "bufio";

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
function txinSize() {
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
function txoutSize(scriptPubkeySize = 34) {
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
 * Calculation is of the following form:
 * witness_items count (varint 1+) + null_data (1 byte) + size of each signature (1 byte * OP_M) + signatures (73 * M) +
 * redeem script length (1 byte) + redeem script size (4 + 34 * N bytes)
 */
export function getWitnessSize(m, n) {
  const OP_NULL_BYTES = 1; // needs to be added b/c of bug in multisig implementation
  const opDataBytes = m;
  // assumes largest possible signature size which could be 71, 72, or 73
  const signaturesSize = 73 * m;
  const REDEEM_SCRIPT_LENGTH = 1;
  const redeemScriptSize = getRedeemScriptSize(n);
  // total witness stack will be null bytes + each signature (m) + redeem script
  const WITNESS_ITEMS_COUNT = encoding.sizeVarint(1 + m + 1);

  return (
    WITNESS_ITEMS_COUNT +
    OP_NULL_BYTES +
    opDataBytes +
    signaturesSize +
    REDEEM_SCRIPT_LENGTH +
    redeemScriptSize
  );
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
  total += inputsCount * txinSize();
  total += encoding.sizeVarint(outputsCount);
  total += outputsCount * txoutSize();
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
