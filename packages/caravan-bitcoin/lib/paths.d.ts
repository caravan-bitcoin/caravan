/**
 * This module contains various utility functions for converting and
 * validating BIP32 derivation paths.
 *
 * @module paths
 */
import { Network } from "./networks";
/**
 * Return the hardened version of the given BIP32 index.
 *
 * Hardening is equivalent to adding 2^31.
 *
 * @param {string|number} index - BIP32 index
 * @returns {number} the hardened index
 * @example
 * import {hardenedBIP32Index} from "unchained-bitcoin";
 * console.log(hardenedBIP32Index(44); // 2147483692
 */
export declare function hardenedBIP32Index(index: any): number;
/**
 * Convert BIP32 derivation path to an array of integer values
 * representing the corresponding derivation indices.
 *
 * Hardened path segments will have the [hardening offset]{@link module:paths.HARDENING_OFFSET} added to the index.
 *
 * @param {string} pathString - BIP32 derivation path string
 * @returns {number[]} the derivation indices
 * @example
 * import {bip32PathToSequence} from "unchained-bitcoin";
 * console.log(bip32PathToSequence("m/45'/1/99")); // [2147483693, 1, 99]
 */
export declare function bip32PathToSequence(pathString: any): number[];
/**
 * Convert a sequence of derivation indices into the corresponding
 * BIP32 derivation path.
 *
 * Indices above the [hardening offset]{@link * module:paths.HARDENING_OFFSET} will be represented wiith hardened * path segments (using a trailing single-quote).
 *
 * @param {number[]} sequence - the derivation indices
 * @returns {string} BIP32 derivation path
 * @example
 * import {bip32SequenceToPath} from "unchained-bitcoin";
 * console.log(bip32SequenceToPath([2147483693, 1, 99])); // m/45'/1/99
 */
export declare function bip32SequenceToPath(sequence: any): string;
/**
 * Validate a given BIP32 derivation path string.
 *
 * - Path segments are validated numerically as well as statically
 *   (the value of 2^33 is an invalid path segment).
 *
 * - The `mode` option can be pass to validate fully `hardened` or
 *   `unhardened` paths.
 *
 * @param {string} pathString - BIP32 derivation path string
 * @param {Object} [options] - additional options
 * @param {string} [options.mode] - "hardened" or "unhardened"
 * @returns {string} empty if valid or corresponding validation message if not
 * @example
 * import {validateBIP32Path} from "unchained-bitcoin";
 * console.log(validateBIP32Path("")); // "BIP32 path cannot be blank."
 * console.log(validateBIP32Path("foo")); // "BIP32 path is invalid."
 * console.log(validateBIP32Path("//45")); // "BIP32 path is invalid."
 * console.log(validateBIP32Path("/45/")); // "BIP32 path is invalid."
 * console.log(validateBIP32Path("/45''")); // "BIP32 path is invalid."
 * console.log(validateBIP32Path('/45"')); // "BIP32 path is invalid."
 * console.log(validateBIP32Path("/-45")); // "BIP32 path is invalid."
 * console.log(validateBIP32Path("/8589934592")); // "BIP32 index is too high."
 * console.log(validateBIP32Path("/45")); // ""
 * console.log(validateBIP32Path("/45/0'")); // ""
 * console.log(validateBIP32Path("/45/0'", {mode: "hardened")); // "BIP32 path must be fully-hardened."
 * console.log(validateBIP32Path("/45'/0'", {mode: "hardened")); // ""
 * console.log(validateBIP32Path("/0'/0", {mode: "unhardened")); // "BIP32 path cannot include hardened segments."
 * console.log(validateBIP32Path("/0/0", {mode: "unhardened")); // ""
 */
export declare function validateBIP32Path(pathString: any, options?: any): "" | "BIP32 path cannot be blank." | "BIP32 path is invalid." | "BIP32 path must be fully-hardened." | "BIP32 path cannot include hardened segments." | "BIP32 index cannot be blank." | "BIP32 index is invalid." | "Invalid BIP32 index." | "BIP32 index is too high." | "BIP32 index must be hardened." | "BIP32 index cannot be hardened.";
/**
 * Validate a given BIP32 index string.
 *
 * - Path segments are validated numerically as well as statically
 *   (the value of 2^33 is an invalid path segment).
 *
 * - By default, 0-4294967295 and 0'-2147483647' are valid.
 *
 * - The `mode` option can be pass to validate index is hardened
 *   `unhardened` paths.
 *
 * - `hardened` paths include 0'-2147483647' and 2147483648-4294967295
 *
 * - `unharded` paths include 0-2147483647
 *
 * @param {string} indexString - BIP32 index string
 * @param {Object} [options] - additional options
 * @param {string} [options.mode] - "hardened" or "unhardened"
 * @returns {string} empty if valid or corresponding validation message if not
 * @example
 * import {validateBIP32Path} from "unchained-bitcoin";
 * console.log(validateBIP32Path("")); // "BIP32 index cannot be blank."
 * console.log(validateBIP32Path("foo")); // "BIP32 index is invalid."
 * console.log(validateBIP32Path("//45")); // "BIP32 index is invalid."
 * console.log(validateBIP32Path("/45/")); // "BIP32 index is invalid."
 * console.log(validateBIP32Index("4294967296")); // "BIP32 index is too high."
 * console.log(validateBIP32Index("2147483648'")); // "BIP32 index is too high."
 * console.log(validateBIP32Index("45", { mode: "hardened" })); // "BIP32 index must be hardened."
 * console.log(validateBIP32Index("45'", { mode: "unhardened" })); // "BIP32 index cannot be hardened."
 * console.log(validateBIP32Index("2147483648", {mode: "unhardened"})); // "BIP32 index cannot be hardened."
 * console.log(validateBIP32Index("45")); // ""
 * console.log(validateBIP32Index("45'")); // ""
 * console.log(validateBIP32Index("0")); // ""
 * console.log(validateBIP32Index("0'")); // ""
 * console.log(validateBIP32Index("4294967295")); // ""
 * console.log(validateBIP32Index("2147483647")); // ""
 * console.log(validateBIP32Index("2147483647'")); // ""
 */
export declare function validateBIP32Index(indexString: any, options?: any): "" | "BIP32 index cannot be blank." | "BIP32 index is invalid." | "Invalid BIP32 index." | "BIP32 index is too high." | "BIP32 index must be hardened." | "BIP32 index cannot be hardened.";
/**
 * Return the default BIP32 root derivation path for the given
 * `addressType` and `network`.
 *
 * - Mainnet:
 *   - P2SH: m/45'/0'/0'
 *   - P2SH-P2WSH: m/48'/0'/0'/1'
 *   - P2WSH: m/48'/0'/0'/2'
 * - Testnet:
 *   - P2SH: m/45'/1'/0'
 *   - P2SH-P2WSH: m/48'/1'/0'/1'
 *   - P2WSH: m/48'/1'/0'/2'
 *
 * @param {module:multisig.MULTISIG_ADDRESS_TYPES} addressType - address type
 * @param {module:networks.NETWORKS} network - bitcoin network
 * @returns {string} derivation path
 * @example
 * import {multisigBIP32Root} from "unchained-bitcoin";
 * console.log(multisigBIP32Root(P2SH, MAINNET)); // m/45'/0'/0'
 * console.log(multisigBIP32Root(P2SH_P2WSH, TESTNET); // m/48'/1'/0'/1'
 */
export declare function multisigBIP32Root(addressType: any, network: Network): string | null;
/**
 * Returns a BIP32 path at the given `relativePath` under the default
 * BIP32 root path for the given `addressType` and `network`.
 *
 * @param {module:multisig.MULTISIG_ADDRESS_TYPES} addressType - type from which to calculate BIP32 root path
 * @param {module:networks.NETWORKS} network - bitcoin network from which to calculate BIP32 root path
 * @param {number|string} relativePath - the relative BIP32 path (no leading `/`)
 * @returns {string} child BIP32 path
 * @example
 * import {multisigBIP32Path} from "unchained-bitcoin";
 * console.log(multisigBIP32Path(P2SH, MAINNET, 0); // m/45'/0'/0'/0
 * console.log(multisigBIP32Path(P2SH_P2WSH, TESTNET, "3'/4"); // m/48'/1'/0'/1'/3'/4"
 */
export declare function multisigBIP32Path(addressType: any, network: Network, relativePath?: string): string | null;
/**
 * Get the path of the parent of the given path
 * @param {string} bip32Path e.g. "m/45'/0'/0'/0"
 * @returns {string} parent path
 * @example
 * import {getParentBIP32Path} from "unchained-bitcoin";
 * console.log(getParentBIP32Path("m/45'/0'/0'/0"); // m/45'/0'/0'
 */
export declare function getParentBIP32Path(bip32Path: any): any;
/**
 * Get the path of under the parentBIP32Path of the given path
 * @param {string} parentBIP32Path e.g. "m/45'/0'/0'"
 * @param {string} childBIP32Path e.g. "m/45'/0'/0'/0/1/2"
 * @returns {string} relative path below path
 * @example
 * import {getRelativeBIP32Path} from "unchained-bitcoin";
 * console.log(getRelativeBIP32Path("m/45'/0'/0'", "m/45'/0'/0'/0/1/2"); // 0/1/2
 */
export declare function getRelativeBIP32Path(parentBIP32Path: any, childBIP32Path: any): any;
