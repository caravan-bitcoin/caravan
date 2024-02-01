/**
 * This module provides functions and constants for the P2SH address type.
 */
/**
 * Address type constant for "pay-to-script-hash" (P2SH) addresses.
 */
export declare const P2SH = "P2SH";
/**
 * Estimate the transaction virtual size (vsize) when spending inputs
 * from the same multisig P2SH address.
 */
export declare function estimateMultisigP2SHTransactionVSize(config: any): number;
