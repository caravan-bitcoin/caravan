/**
 * This module provides functions for sorting & validating multisig
 * transaction inputs.
 */
/**
 * Represents a transaction input.
 *
 * The [`Multisig`]{@link module:multisig.MULTISIG} object represents
 * the address the corresponding UTXO belongs to.
 */
/**
 * Sorts the given inputs according to the [BIP69 standard]{@link https://github.com/bitcoin/bips/blob/master/bip-0069.mediawiki#transaction-inputs}: ascending lexicographic order.
 */
export declare function sortInputs(inputs: any): any;
/**
 * Validates the given transaction inputs.
 *
 * Returns an error message if there are no inputs.  Passes each output to [`validateMultisigInput`]{@link module:transactions.validateOutput}.
 */
export declare function validateMultisigInputs(inputs: any, braidRequired?: boolean): string;
/**
 * Validates the given transaction input.
 *
 * - Validates the presence and value of the transaction ID (`txid`) property.
 *
 * - Validates the presence and value of the transaction index (`index`) property.
 *
 * - Validates the presence of the `multisig` property.
 */
export declare function validateMultisigInput(input: any): string;
/**
 * Validates the given transaction ID.
 */
export declare function validateTransactionID(txid?: any): string;
/**
 * Validates the given transaction index.
 */
export declare function validateTransactionIndex(indexString?: any): "" | "Index cannot be blank." | "Index is invalid" | "Index cannot be negative.";
