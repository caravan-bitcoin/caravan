/**
 * This module provides functions for validating & deriving public
 * keys and extended public keys.
 *
 * @module keys
 */
/// <reference types="node" />
import { Struct, BufferWriter, BufferReader } from "bufio";
import { BitcoinNetwork, KeyPrefix, KeyVersion } from "./types";
export declare const EXTENDED_PUBLIC_KEY_VERSIONS: {
    readonly xpub: "0488b21e";
    readonly ypub: "049d7cb2";
    readonly zpub: "04b24746";
    readonly Ypub: "0295b43f";
    readonly Zpub: "02aa7ed3";
    readonly tpub: "043587cf";
    readonly upub: "044a5262";
    readonly vpub: "045f1cf6";
    readonly Upub: "024289ef";
    readonly Vpub: "02575483";
};
/**
 * Validate whether or not a string is a valid extended public key prefix
 * @param {string} prefix string to be tested
 * @returns {null} returns null if valid
 * @throws Error with message indicating the invalid prefix.
 */
export declare function validatePrefix(prefix: KeyPrefix): never | null;
/**
 * checks length, is string, and valid hex
 * @param {string} rootFingerprint - fingerprint to validate
 * @return {void}
 */
export declare function validateRootFingerprint(rootFingerprint: string): void;
/**
 * Struct object for encoding and decoding extended public keys.
 * base58 encoded serialization of the following information:
 * [ version ][ depth ][ parent fingerprint ][ key index ][ chain code ][ pubkey ]
 * @param {string} options.bip32Path e.g. m/45'/0'/0
 * @param {string} options.pubkey pubkey found at bip32Path
 * @param {string} options.chaincode chaincode corresponding to pubkey and path
 * @param {string} options.parentFingerprint - fingerprint of parent public key
 * @param {string} [options.network = mainnet] - mainnet or testnet
 * @param {string} [options.rootFingerprint] - the root fingerprint of the device, e.g. 'ca2ab33f'
 * @example
 * import { ExtendedPublicKey } from "unchained-bitcoin"
 * const xpub = ExtendedPublicKey.fromBase58("xpub6CCHViYn5VzKSmKD9cK9LBDPz9wBLV7owXJcNDioETNvhqhVtj3ABnVUERN9aV1RGTX9YpyPHnC4Ekzjnr7TZthsJRBiXA4QCeXNHEwxLab")
 * console.log(xpub.encode()) // returns raw Buffer of xpub encoded as per BIP32
 * console.log(xpub.toBase58()) // returns base58 check encoded xpub
 */
export declare class ExtendedPublicKey extends Struct {
    path?: string;
    sequence?: number[];
    index?: number;
    depth?: number;
    chaincode?: string;
    pubkey?: string;
    parentFingerprint?: number;
    network?: BitcoinNetwork;
    version?: KeyVersion;
    rootFingerprint?: string;
    base58String?: string;
    constructor(options: Partial<ExtendedPublicKey>);
    /**
     * A Buffer Writer used to encode an xpub. This is called
     * by the `encode` and `toBase58` methods
     * @param {BufferWriter} bw bufio.BufferWriter
     * @returns {void} doesn't have a return, only updates given buffer writer
     */
    write(bw: BufferWriter): void;
    /**
     * Given a network string, will update the network and matching
     * version magic bytes used for generating xpub
     * @param {string} network - one of "mainnet" or "testnet"
     * @returns {void}
     */
    setNetwork(network: BitcoinNetwork): void;
    /**
     * @param {string} bip32Path set this xpub's path
     * @returns {void}
     */
    setBip32Path(bip32Path: string): void;
    /**
     * @param {string} rootFingerprint fingerprint of pubkey at m/
     * @returns {void}
     */
    setRootFingerprint(rootFingerprint: string): void;
    encode(extra?: any): Buffer;
    /**
     * Return the base58 encoded xpub, adding the
     * @returns {string} base58check encoded xpub, prefixed by network
     */
    toBase58(): string;
    /**
     * Return a new Extended Public Key class given
     * an xpub string
     * @param {string} data base58 check encoded xpub
     * @returns {ExtendedPublicKey} new ExtendedPublicKey instance
     */
    static fromBase58(data: string): ExtendedPublicKey;
    /**
     * Sometimes we hop back and forth between a "Rich ExtendedPublicKey"
     * (a Struct with a couple extra parameters set) and the minimal
     * Struct - let's keep the actual string of the Struct around
     * for easy usage in other functions
     * @returns {void}
     */
    addBase58String(): void;
    /**
     * Used by the decoder to convert a raw xpub Buffer into
     * an ExtendedPublicKey class
     * @param {BufferReader} br - A bufio.BufferReader
     * @returns {ExtendedPublicKey} new instance of Extended Public Key
     */
    read(br: BufferReader): ExtendedPublicKey;
    static decode(data: Buffer, extra?: any): ExtendedPublicKey;
}
/**
 * Convert an extended public key between formats
 * @param {string} extendedPublicKey - the extended public key to convert
 * @param {string} targetPrefix - the target format to convert to
 * @example
 * import {convertExtendedPublicKey} from "unchained-bitcoin";
 * const tpub = convertExtendedPublicKey("xpub6CCH...", "tpub");
 * console.log(tpub.extendedPublicKey, tpub.message)
 * // tpubDCZv...
 * @returns {(string|Record<string, unknown>)} converted extended public key or error object
 * with the failed key and error message
 */
export declare function convertExtendedPublicKey(extendedPublicKey: string, targetPrefix: KeyPrefix): string | Record<string, unknown>;
/**
 * Check to see if an extended public key is of the correct prefix for the network
 * this can be used in conjunction with convertExtendedPublicKey to attempt to automatically convert
 * @param {string} extendedPublicKey - the extended public key to check
 * @param {string} network - the bitcoin network
 * @example
 * import {validateExtendedPublicKeyForNetwork} from "unchained-bitcoin";
 * console.log(validateExtendedPublicKeyForNetwork('xpub...', MAINNET)) // empty
 * console.log(validateExtendedPublicKeyForNetwork('tpub...', MAINNET)) // "Extended public key must begin with ...."
 * @returns {string} a validation message or empty if valid
 */
export declare function validateExtendedPublicKeyForNetwork(extendedPublicKey: string, network: string): string;
/**
 * Validate the given extended public key.
 *
 * - Must start with the appropriate (network-dependent) prefix.
 * - Must be a valid BIP32 extended public key
 *
 * @param {string} xpubString - base58 encoded extended public key (`xpub...`)
 * @param {module:networks.Networks} network  - bitcoin network
 * @returns {string} empty if valid or corresponding validation message if not
 * @example
 * import {validateExtendedPublicKey} from "unchained-bitcoin";
 * console.log(validateExtendedPublicKey("", MAINNET)); // "Extended public key cannot be blank."
 * console.log(validateExtendedPublicKey("foo", MAINNET)); // "Extended public key must begin with ..."
 * console.log(validateExtendedPublicKey("xpub123", MAINNET)); // "Extended public key is too short."
 * console.log(validateExtendedPublicKey("tpub123...", MAINNET)); // "Extended public key must begin with ...."
 * console.log(validateExtendedPublicKey("xpub123%%!~~...", MAINNET)); // "Invalid extended public key"
 * console.log(validateExtendedPublicKey("xpub123...", MAINNET)); // ""
 */
export declare function validateExtendedPublicKey(xpubString: string | null | undefined, network: BitcoinNetwork): string;
/**
 * Validate the given public key.
 *
 * - Must be valid hex.
 * - Must be a valid BIP32 public key.
 *
 * @param {string} pubkeyHex - (compressed) public key in hex
 * @param {string} [addressType] - one of P2SH, P2SH-P2WSH, P2WSH
 * @returns {string} empty if valid or corresponding validation message if not
 * @example
 * import {validatePublicKey} from "unchained-bitcoin";
 * console.log(validatePublicKey("")); // "Public key cannot be blank."
 * console.log(validatePublicKey("zzzz")); // "Invalid hex..."
 * console.log(validatePublicKey("deadbeef")); // "Invalid public key."
 * console.log(validatePublicKey("03b32dc780fba98db25b4b72cf2b69da228f5e10ca6aa8f46eabe7f9fe22c994ee")); // ""
 * console.log(validatePublicKey("04a17f3ad2ecde2fff2abd1b9ca77f35d5449a3b50a8b2dc9a0b5432d6596afd01ee884006f7e7191f430c7881626b95ae1bcacf9b54d7073519673edaea71ee53")); // ""
 * console.log(validatePublicKey("04a17f3ad2ecde2fff2abd1b9ca77f35d5449a3b50a8b2dc9a0b5432d6596afd01ee884006f7e7191f430c7881626b95ae1bcacf9b54d7073519673edaea71ee53", "P2SH")); // ""
 * console.log(validatePublicKey("04a17f3ad2ecde2fff2abd1b9ca77f35d5449a3b50a8b2dc9a0b5432d6596afd01ee884006f7e7191f430c7881626b95ae1bcacf9b54d7073519673edaea71ee53", "P2WSH")); // "P2WSH does not support uncompressed public keys."
 */
export declare function validatePublicKey(pubkeyHex: string | null | undefined, addressType?: string): string;
/**
 * Compresses the given public key.
 *
 * @param {string} publicKey - (uncompressed) public key in hex
 * @returns {string} compressed public key in hex
 * @example
 * import {compressPublicKey} from "unchained-bitcoin";
 * console.log(compressPublicKey("04b32dc780fba98db25b4b72cf2b69da228f5e10ca6aa8f46eabe7f9fe22c994ee6e43c09d025c2ad322382347ec0f69b4e78d8e23c8ff9aa0dd0cb93665ae83d5"));
 * // "03b32dc780fba98db25b4b72cf2b69da228f5e10ca6aa8f46eabe7f9fe22c994ee"
 */
export declare function compressPublicKey(publicKey: string): string;
/**
 * Return the public key at the given BIP32 path below the given
 * extended public key.
 *
 * @param {string} extendedPublicKey - base58 encoded extended public key (`xpub...`)
 * @param {string} bip32Path - BIP32 derivation path string (with or without initial `m/`)
 * @param {module:networks.Networks} network - bitcoin network
 * @returns {string} (compressed) child public key in hex
 * @example
 * import {deriveChildPublicKey, MAINNET} from "unchained-bitcoin";
 * const xpub = "xpub6CCHViYn5VzKSmKD9cK9LBDPz9wBLV7owXJcNDioETNvhqhVtj3ABnVUERN9aV1RGTX9YpyPHnC4Ekzjnr7TZthsJRBiXA4QCeXNHEwxLab";
 * console.log(deriveChildPublicKey(xpub, "m/0/0", MAINNET));
 * // "021a0b6eb37bd9d2767a364601e41635a11c1dbbbb601efab8406281e210336ace"
 * console.log(deriveChildPublicKey(xpub, "0/0", MAINNET)); // w/o leading `m/`
 * // "021a0b6eb37bd9d2767a364601e41635a11c1dbbbb601efab8406281e210336ace"
 *
 */
export declare function deriveChildPublicKey(extendedPublicKey: string, bip32Path: string, network: BitcoinNetwork): string;
/**
 * Return the extended public key at the given BIP32 path below the
 * given extended public key.
 *
 * @param {string} extendedPublicKey - base58 encoded extended public key (`xpub...`)
 * @param {string} bip32Path - BIP32 derivation path string (with or without initial `m/`)
 * @param {module:networks.Networks} network - bitcoin network
 * @returns {string} child extended public key in base58
 * @example
 * import {deriveChildExtendedPublicKey, MAINNET} from "unchained-bitcoin";
 * const xpub = "xpub6CCHViYn5VzKSmKD9cK9LBDPz9wBLV7owXJcNDioETNvhqhVtj3ABnVUERN9aV1RGTX9YpyPHnC4Ekzjnr7TZthsJRBiXA4QCeXNHEwxLab";
 * console.log(deriveChildExtendedPublicKey(xpub, "m/0/0", MAINNET));
 * // "xpub6GYTTMaaN8bSEhicdKq7ji9H7B2SL4un33obThv9aekop4J7L7B3snYMnJUuwXJiUmsbSVSyZydbqLC97JMWnj3R4MHz6JNunMJhjEBKovS"
 * console.log(deriveChildExtendedPublicKey(xpub, "0/0", MAINNET)); // without initial `m/`
 * // "xpub6GYTTMaaN8bSEhicdKq7ji9H7B2SL4un33obThv9aekop4J7L7B3snYMnJUuwXJiUmsbSVSyZydbqLC97JMWnj3R4MHz6JNunMJhjEBKovS"

 */
export declare function deriveChildExtendedPublicKey(extendedPublicKey: string, bip32Path: string, network: BitcoinNetwork): string;
/**
 * Check if a given pubkey is compressed or not by checking its length
 * and the possible prefixes
 * @param {string | Buffer} _pubkey pubkey to check
 * @returns {boolean} true if compressed, otherwise false
 * @example
 * import {isKeyCompressed} from "unchained-bitcoin"
 * const uncompressed = "0487cb4929c287665fbda011b1afbebb0e691a5ee11ee9a561fcd6adba266afe03f7c55f784242305cfd8252076d038b0f3c92836754308d06b097d11e37bc0907"
 * const compressed = "0387cb4929c287665fbda011b1afbebb0e691a5ee11ee9a561fcd6adba266afe03"
 * console.log(isKeyCompressed(uncompressed)) // false
 * console.log(isKeyCompressed(compressed)) // true
 */
export declare function isKeyCompressed(_pubkey: string | Buffer): boolean;
/**
 * Get fingerprint for a given pubkey. This is useful for generating xpubs
 * which need the fingerprint of the parent pubkey. If not a compressed key
 * then this function will attempt to compress it.
 * @param {string} _pubkey - pubkey to derive fingerprint from
 * @returns {number} fingerprint
 * @example
 * import {getFingerprintFromPublicKey} from "unchained-bitcoin"
 * const pubkey = "03b32dc780fba98db25b4b72cf2b69da228f5e10ca6aa8f46eabe7f9fe22c994ee"
 * console.log(getFingerprintFromPublicKey(pubkey)) // 724365675
 *
 * const uncompressedPubkey = "04dccdc7fc599ed379c415fc2bb398b1217f0142af23692359057094ce306cd3930e6634c71788b9ed283219ca2fea102aaf137cd74e025cce97b94478a02029cf"
 * console.log(getFingerprintFromPublicKey(uncompressedPubkey)) // 247110101
 */
export declare function getFingerprintFromPublicKey(_pubkey: string): number;
/**
 * Take a fingerprint and return a zero-padded, hex-formatted string
 * that is exactly eight characters long.
 *
 * @param {number} xfp the fingerprint
 * @returns {string} zero-padded, fixed-length hex xfp
 *
 * @example
 * import {fingerprintToFixedLengthHex} from "unchained-bitcoin"
 * const pubkeyFingerprint = 724365675
 * console.log(fingerprintToFixedLengthHex(pubkeyFingerprint)) // 2b2cf16b
 *
 * const uncompressedPubkeyFingerprint = 247110101
 * console.log(fingerprintToFixedLengthHex(uncompressedPubkeyFingerprint)) // 0eba99d5
 */
export declare function fingerprintToFixedLengthHex(xfp: number): string;
/**
 * Returns the root fingerprint of the extendedPublicKey
 */
export declare function extendedPublicKeyRootFingerprint(extendedPublicKey: Struct): string | null;
/**
 * Derive base58 encoded xpub given known information about
 * BIP32 Wallet Node.
 */
export declare function deriveExtendedPublicKey(bip32Path: string, pubkey: string, chaincode: string, parentFingerprint: number, network?: BitcoinNetwork): string;
export declare function getMaskedDerivation({ xpub, bip32Path }: {
    xpub: string;
    bip32Path: string;
}, toMask?: string): string;
