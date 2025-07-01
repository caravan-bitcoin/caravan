import { compactSize } from "./utils";
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
  // Calculate input sizes using the modular function
  const inputSize = getP2SHInputSize(config.m, config.n);
  const totalInputSize = inputSize * config.numInputs;

  // Calculate output sizes (32 bytes per output + transaction overhead)
  const outputSize = getP2SHOutputSize();
  const totalOutputSize = outputSize * config.numOutputs;

  // Transaction overhead: version (4) + locktime (4) + input count (1) + output count (1)
  const transactionOverhead =
    4 + 4 + compactSize(config.numInputs) + compactSize(config.numOutputs);

  const vsize = totalInputSize + totalOutputSize + transactionOverhead;
  return vsize;
}

export function getP2SHOutputSize() {
  return 32; // value (8) + script length (1) + script (23)
}
/**
 * Calculates the input size for a P2SH input including script size.
 * Base input: prevhash (32) + prevIndex (4) + script length (varint) + script size + sequence (4)
 *
 * According to Bitcoin Optech calculator (https://bitcoinops.org/en/tools/calc-size/):
 * - P2SH 2-of-3 scriptSig: 254 bytes
 * - Format: OP_0 OP_PUSH72 <ecdsa_signature> OP_PUSH72 <ecdsa_signature> OP_PUSHDATA1 105 <OP_2 OP_PUSH33 <pubkey> OP_PUSH33 <pubkey> OP_PUSH33 <pubkey> OP_3 OP_CHECKMULTISIG>
 */
export function getP2SHInputSize(m: number, n: number): number {
  const PREVHASH_BYTES = 32;
  const PREV_INDEX_BYTES = 4;
  const SEQUENCE_BYTES = 4;

  // According to Optech: ECDSA signatures are 72 bytes (conservative estimate)
  const SIGNATURE_SIZE = 72;
  // According to Optech: ECDSA public keys are 33 bytes
  const PUBKEY_SIZE = 33;

  // Script structure: OP_0 + m signatures + redeem script
  // Redeem script: OP_M + n pubkeys + OP_N + OP_CHECKMULTISIG
  const OP_0_SIZE = 1;
  const OP_M_SIZE = 1;
  const OP_N_SIZE = 1;
  const OP_CHECKMULTISIG_SIZE = 1;

  // Each signature needs a push opcode (1 byte for 72-byte signature)
  const SIGNATURE_PUSH_SIZE = 1;
  // Each pubkey needs a push opcode (1 byte for 33-byte pubkey)
  const PUBKEY_PUSH_SIZE = 1;

  const redeemScriptSize =
    OP_M_SIZE +
    n * (PUBKEY_PUSH_SIZE + PUBKEY_SIZE) +
    OP_N_SIZE +
    OP_CHECKMULTISIG_SIZE;
  const redeemScriptPushSize =
    redeemScriptSize <= 75 ? 1 : redeemScriptSize <= 255 ? 2 : 3;

  const scriptSize =
    OP_0_SIZE +
    m * (SIGNATURE_PUSH_SIZE + SIGNATURE_SIZE) +
    redeemScriptPushSize +
    redeemScriptSize;

  // Script length field is a varint
  // For scripts <= 252 bytes: 1 byte
  // For scripts <= 65535 bytes: 3 bytes (0xfd + 2-byte length)
  const scriptLengthBytes = compactSize(scriptSize);

  return (
    PREVHASH_BYTES +
    PREV_INDEX_BYTES +
    scriptLengthBytes +
    scriptSize +
    SEQUENCE_BYTES
  );
}
