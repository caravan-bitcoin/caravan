/**
 * This module provides functions for constructing and validating
 * multisig transactions.
 */
import { Transaction } from "bitcoinjs-lib";
/**
 * Create an unsigned bitcoin transaction based on the network, inputs
 * and outputs.
 *
 * Returns a [`Transaction`]{@link https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/types/transaction.d.ts|Transaction} object from bitcoinjs-lib.
 */
export declare function unsignedMultisigTransaction(network: any, inputs: any, outputs: any): Transaction;
/**
 * Create an unsigned bitcoin transaction based on the network, inputs
 * and outputs stored as a PSBT object
 *
 * Returns a [`PSBT`]{@link https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/types/psbt.d.ts|PSBT} object from bitcoinjs-lib.
 */
export declare function unsignedMultisigPSBT(network: any, inputs: any, outputs: any, includeGlobalXpubs?: boolean): {
    txn: string;
    data: import("bip174").Psbt;
    inputCount: number;
    version: number;
    locktime: number;
    txInputs: import("bip174/src/lib/interfaces").TransactionInput[];
    txOutputs: import("bip174/src/lib/interfaces").TransactionOutput[];
};
/**
 * Returns an unsigned Transaction object from bitcoinjs-lib that is not
 * generated via the TransactionBuilder (deprecating soon)
 *
 * FIXME: try squat out old implementation with the new PSBT one and see if
 *   everything works (the tx is the same)
 */
export declare function unsignedTransactionObjectFromPSBT(psbt: any): Transaction;
/**
 * Create a fully signed multisig transaction based on the unsigned
 * transaction, inputs, and their signatures.
 */
export declare function signedMultisigTransaction(network: any, inputs: any[], outputs: any[], transactionSignatures?: string[][]): Transaction;
