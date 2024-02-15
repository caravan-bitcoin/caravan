/**
 * This module provides an API around the multisig capabilities of the
 * bitcoinjs-lib library.  The API is functional but requires you
 * creating and passing around a [`Multisig`]{@link module:multisig.MULTISIG} object.
 *
 * This `Multisig` object represents the combination of:
 *
 * 1) a sequence of N public keys
 * 2) the number of required signers (M)
 * 3) the address type  (P2SH, P2SH-P2WSH, P2WSH)
 * 4) the bitcoin network
 *
 * This corresponds to a unique bitcoin multisig address.  Note that
 * since (3) & (4) can change without changing (1) & (2), different
 * `Multisig` objects (and their corresponding bitcoin addresses) can
 * have different representations but the same security rules as to
 * who can sign.
 *
 * You can create `Multisig` objects yourself using the following
 * functions:
 *
 * - `generateMultisigFromPublicKeys` which takes public keys as input
 * - `generateMultisigFromHex` which takes a redeem/witness script as input
 *
 * Once you have a `Multisig` object you can pass it around in your
 * code and then ask questions about it using the other functions
 * defined in this module.
 *
 * You can manipulate `Multisig` objects directly but it's better to
 * use the functions from API provided by this module.
 */
import { payments } from "bitcoinjs-lib";
/**
 * Describes the return type of several functions in the
 * `payments` module of bitcoinjs-lib.
 *
 * The following functions in this module will return objects of this
 * type:
 *
 * - `generateMultisigFromPublicKeys` which takes public keys as input
 * - `generateMultisigFromHex` which takes a redeem/witness script as input
 *
 * The remaining functions accept these objects as arguments.
 */
/**
 * Enumeration of possible multisig address types ([P2SH]{@link module:p2sh.P2SH}|[P2SH_P2WSH]{@link module:p2sh_p2wsh.P2SH_P2WSH}|[P2WSH]{@link module:p2wsh.P2WSH}).
 */
export declare const MULTISIG_ADDRESS_TYPES: {
    P2SH: string;
    P2SH_P2WSH: string;
    P2WSH: string;
};
/**
 * Return an M-of-N [`Multisig`]{@link module:multisig.MULTISIG}
 * object by specifying the total number of signers (M) and the public
 * keys (N total).
 */
export declare function generateMultisigFromPublicKeys(network: any, addressType: any, requiredSigners: any, ...publicKeys: any[]): payments.Payment | null;
/**
 * Return an M-of-N [`Multisig`]{@link module.multisig:Multisig}
 * object by passing a script in hex.
 *
 * If the `addressType` is `P2SH` then the script hex being passed is
 * the redeem script.  If the `addressType` is P2SH-wrapped SegWit
 * (`P2SH_P2WSH`) or native SegWit (`P2WSH`) then the script hex being
 * passed is the witness script.
 *
 * In practice, the same script hex can be thought of as any of
 * several address types, depending on context.
 */
export declare function generateMultisigFromHex(network: any, addressType: any, multisigScriptHex: any): payments.Payment | null;
/**
 * Return an M-of-N [`Multisig`]{@link module.multisig:Multisig}
 * object by passing in a raw P2MS multisig object (from bitcoinjs-lib).
 *
 * This function is only used internally, do not call it directly.
 */
export declare function generateMultisigFromRaw(addressType: any, multisig: any): payments.Payment | null;
/**
 * Return the [address type]{@link module:multisig.MULTISIG_ADDRESS_TYPES} of the given `Multisig` object.
 */
export declare function multisigAddressType(multisig: any): "P2SH" | "P2SH-P2WSH" | "P2WSH";
/**
 * Return the number of required signers of the given `Multisig`
 * object.
 */
export declare function multisigRequiredSigners(multisig: any): any;
/**
 * Return the number of total signers (public keys) of the given
 * `Multisig` object.
 */
export declare function multisigTotalSigners(multisig: any): any;
/**
 * Return the multisig script for the given `Multisig` object.
 *
 * If the address type of the given multisig object is P2SH, the
 * redeem script will be returned.  Otherwise, the witness script will
 * be returned.
 */
export declare function multisigScript(multisig: any): any;
/**
 * Return the redeem script for the given `Multisig` object.
 *
 * If the address type of the given multisig object is P2WSH, this
 * will return null.
 */
export declare function multisigRedeemScript(multisig: any): any;
/**
 * Return the witness script for the given `Multisig` object.
 *
 * If the address type of the given multisig object is P2SH, this will
 * return null.
 */
export declare function multisigWitnessScript(multisig: any): any;
/**
 * Return the (compressed) public keys in hex for the given `Multisig`
 * object.
 *
 * The public keys are in the order used in the corresponding
 * redeem/witness script.
 */
export declare function multisigPublicKeys(multisig: any): any;
/**
 * Return the address for a given `Multisig` object.
 */
export declare function multisigAddress(multisig: any): any;
/**
 * Return the braid details (if known) for a given `Multisig` object.
 */
export declare function multisigBraidDetails(multisig: any): any;
