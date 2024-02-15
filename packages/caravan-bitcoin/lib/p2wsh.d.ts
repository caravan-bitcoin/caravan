/**
 * This module provides functions and constants for the P2WSH address type.
 */
/**
 * Address type constant for "pay-to-witness-script-hash" or (P2WSH)
 * addresses.
 */
export declare const P2WSH = "P2WSH";
/**
 * calculates size of redeem script given n pubkeys.
 * Calculation looks like:
 * OP_M (1 byte) + size of each pubkey in redeem script (OP_DATA= 1 byte * N) +
 * pubkey size (33 bytes * N) + OP_N (1 byte) + OP_CHECKMULTISIG (1 byte)
 *  => 1 + (1 * N) + (33 * N) + 1 + 1
 */
export declare function getRedeemScriptSize(n: any): any;
/**
 * Calculates the value of a multisig witness given m-of-n values
 * Calculation is of the following form:
 * witness_items count (varint 1+) + null_data (1 byte) + size of each signature (1 byte * OP_M) + signatures (73 * M) +
 * redeem script length (1 byte) + redeem script size (4 + 34 * N bytes)
 */
export declare function getWitnessSize(m: any, n: any): any;
/**
 * Calculates the size of the fields in a transaction which DO NOT
 * get counted towards witness discount.
 * Calculated as: version bytes (4) + locktime bytes (4) + input_len (1+) + txins (41+) + output_len (1+) + outputs (9+)
 */
export declare function calculateBase(inputsCount: any, outputsCount: any): number;
export declare function calculateTotalWitnessSize({ numInputs, m, n }: {
    numInputs: any;
    m: any;
    n: any;
}): number;
/**
 * Estimate the transaction virtual size (vsize) when spending inputs
 * from the same multisig P2WSH address.
 */
export declare function estimateMultisigP2WSHTransactionVSize(config: any): number;
