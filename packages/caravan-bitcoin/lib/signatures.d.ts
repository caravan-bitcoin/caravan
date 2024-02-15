/**
 * This module provides functions for validating and handling
 * multisig transaction signatures.
 */
/**
 * Validate a multisig signature for given input and public key.
 */
export declare function validateMultisigSignature(network: any, inputs: any, outputs: any, inputIndex: any, inputSignature: any): any;
/**
 * This function takes a DER encoded signature and returns it without the SIGHASH_BYTE
 */
export declare function signatureNoSighashType(signature: any): any;
