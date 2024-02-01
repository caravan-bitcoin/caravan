/**
 * This module provides conversion and validation functions for units
 * (Satoshis, BTC) and hex strings.
 */
/// <reference types="node" />
import BigNumber from "bignumber.js";
/**
 * Converts a byte array to its hex representation.
 */
export declare function toHexString(byteArray: number[] | Buffer): string;
/**
 * Validate whether the given string is base64.
 *
 * - Valid base64 consists of whole groups of 4 characters containing `a-z`, `A-Z`, 0-9,
 *   `+`, or `/`. The end of the string may be padded with `==` or `=` to
 *   complete the four character group.
 */
export declare function validBase64(inputString: string): boolean;
/**
 * Validate whether the given string is hex.
 *
 * - Valid hex consists of an even number of characters 'a-f`, `A-F`,
 *   or `0-9`.  This is case-insensitive.
 *
 * - The presence of the common prefix `0x` will make the input be
 *   considered invalid (because of the` `x`).
 */
export declare function validateHex(inputString: string): "" | "Invalid hex: odd-length string." | "Invalid hex: only characters a-f, A-F and 0-9 allowed.";
/**
 * Convert a value in Satoshis to BTC.
 *
 * - Accepts both positive and negative input values.
 * - Rounds down (towards zero) input value to the nearest Satoshi.
 */
export declare function satoshisToBitcoins(satoshis: string | number): string;
/**
 * Convert a value in BTC to Satoshis.
 *
 * - Accepts both positive and negative input values.
 * - Rounds down output value to the nearest Satoshi.
 */
export declare function bitcoinsToSatoshis(btc: string | number): string;
export declare const ZERO: BigNumber;
/**
 * Given a buffer as a digest, pass through sha256 and ripemd160
 * hash functions. Returns the result
 */
export declare function hash160(buf: Buffer): Buffer;
