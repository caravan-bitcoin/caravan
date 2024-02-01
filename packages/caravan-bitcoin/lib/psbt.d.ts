/// <reference types="node" />
import { Psbt } from "bitcoinjs-lib";
/**
 * This module provides functions for interacting with PSBTs, see BIP174
 * https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki
 */
/**
 * Represents a transaction PSBT input.
 *
 * The [`Multisig`]{@link module:multisig.MULTISIG} object represents
 * the address the corresponding UTXO belongs to.
 */
/**
 * Represents an output in a PSBT transaction.
 */
export declare const PSBT_MAGIC_HEX = "70736274ff";
export declare const PSBT_MAGIC_B64 = "cHNidP8";
export declare const PSBT_MAGIC_BYTES: Buffer;
/**
 * Given a string, try to create a Psbt object based on MAGIC (hex or Base64)
 */
export declare function autoLoadPSBT(psbtFromFile: any, options?: any): Psbt | null;
/**
 * Take a MultisigTransactionInput and turn it into a MultisigTransactionPSBTInput
 */
export declare function psbtInputFormatter(input: any): any;
/**
 * Take a MultisigTransactionOutput and turn it into a MultisigTransactionPSBTOutput
 */
export declare function psbtOutputFormatter(output: any): any;
/**
 * Translates a PSBT into inputs/outputs consumable by supported non-PSBT devices in the
 * `unchained-wallets` library.
 *
 * FIXME - Have only confirmed this is working for P2SH addresses on Ledger on regtest
 */
export declare function translatePSBT(network: any, addressType: any, psbt: any, signingKeyDetails: any): {
    unchainedInputs: any;
    unchainedOutputs: any;
    bip32Derivations: any;
} | null;
/**
 * Given an unsigned PSBT, an array of signing public key(s) (one per input),
 * an array of signature(s) (one per input) in the same order as the pubkey(s),
 * adds partial signature object(s) to each input and returns the PSBT with
 * partial signature(s) included.
 *
 * FIXME - maybe we add functionality of sending in a single pubkey as well,
 *         which would assume all of the signature(s) are for that pubkey.
 */
export declare function addSignaturesToPSBT(network: any, psbt: any, pubkeys: any, signatures: any): string | null;
/**
 * Extracts the signature(s) from a PSBT.
 * NOTE: there should be one signature per input, per signer.
 *
 * ADDITIONAL NOTE: because of the restrictions we place on braids to march their
 * multisig addresses (slices) forward at the *same* index across each chain of the
 * braid, we do not run into a possible collision with this data structure.
 * BUT - to have this method accommodate the *most* general form of signature parsing,
 * it would be wise to wrap this one level deeper like:
 *
 *                     address: [pubkey : [signature(s)]]
 *
 * that way if your braid only advanced one chain's (member's) index so that a pubkey
 * could be used in more than one address, everything would still function properly.
 */
export declare function parseSignaturesFromPSBT(psbtFromFile: any): {} | null;
/**
 * Extracts signatures in order of inputs and returns as array (or array of arrays if multiple signature sets)
 */
export declare function parseSignatureArrayFromPSBT(psbtFromFile: any): string[] | string[][] | null;
