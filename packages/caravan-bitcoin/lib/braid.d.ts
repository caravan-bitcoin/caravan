/**
 * This module provides functions for braids, which is how we define
 * a group of xpubs with some additional multisig information to define
 * a multisig setup. Sometimes, the word `wallet` is used here, but we
 * view the traditional use of the word 'wallet' as a collection of Braids.
 */
import { Struct } from "bufio";
/**
 * Struct object for encoding and decoding braids.
 */
export declare class Braid extends Struct {
    addressType: any;
    network: any;
    extendedPublicKeys: any;
    requiredSigners: any;
    index: any;
    sequence: any;
    constructor(options?: any);
    toJSON(): string;
    static fromData(data: any): Braid;
    static fromJSON(string: any): Braid;
}
export declare function braidConfig(braid: any): string;
/**
 * Returns the braid's network
 */
export declare function braidNetwork(braid: any): any;
/**
 * Returns the braid's addressType
 */
export declare function braidAddressType(braid: any): any;
/**
 * Returns the braid's extendedPublicKeys
 */
export declare function braidExtendedPublicKeys(braid: any): any;
/**
 * Returns the braid's requiredSigners
 */
export declare function braidRequiredSigners(braid: any): any;
/**
 * Returns the braid's index
 */
export declare function braidIndex(braid: any): any;
/**
 * Validate that a requested path is derivable from a particular braid
 * e.g. it's both a valid bip32path *and* its first index is the same as the index
 */
export declare function validateBip32PathForBraid(braid: any, path: any): void;
/**
 * Returns the braid's pubkeys at particular path (respects the index)
 */
export declare function generatePublicKeysAtPath(braid: any, path: any): string[];
/**
 * Returns the braid's pubkeys at particular index under the index
 */
export declare function generatePublicKeysAtIndex(braid: any, index: any): string[];
/**
 * Returns the braid's bip32PathDerivation (array of bip32 infos)
 * @param {Braid} braid the braid to interrogate
 * @param {string} path what suffix to generate bip32PathDerivation at
 * @returns {Object[]} array of getBip32Derivation objects
 */
export declare function generateBip32DerivationByPath(braid: any, path: any): unknown[];
/**
 * Returns the braid's bip32PathDerivation at a particular index (array of bip32 info)
 */
export declare function generateBip32DerivationByIndex(braid: any, index: any): unknown[];
/**
 * Returns a braid-aware Multisig object at particular path (respects index)
 */
export declare function deriveMultisigByPath(braid: any, path: any): any;
/**
 * Returns a braid-aware Multisig object at particular index
 */
export declare function deriveMultisigByIndex(braid: any, index: any): any;
/**
 * Generate a braid from its parts
 */
export declare function generateBraid(network: any, addressType: any, extendedPublicKeys: any, requiredSigners: any, index: any): Braid;
