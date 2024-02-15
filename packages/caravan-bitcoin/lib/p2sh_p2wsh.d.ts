/**
 * This module provides functions and constants for the P2SH-wrapped
 * P2WSH address type, sometimes written P2SH-P2WSH.
 */
/**
 * Address type constant for "pay-to-script-hash" wrapped
 * "pay-to-witness-script-hash" (P2SH-P2WSH) addresses.
 */
export declare const P2SH_P2WSH = "P2SH-P2WSH";
/**
 * Estimate the transaction virtual size (vsize) when spending inputs
 * from the same multisig P2SH-P2WSH address.
 */
export declare function estimateMultisigP2SH_P2WSHTransactionVSize(config: any): number;
