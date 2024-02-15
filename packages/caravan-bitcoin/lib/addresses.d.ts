/**
 * This module provides validation messages related to addresses.
 */
import { Network } from "./networks";
/**
 * Validate a given bitcoin address.
 *
 * Address must be a valid address on the given bitcoin network.
 */
export declare function validateAddress(address: string, network: Network): "" | "Address cannot be blank." | "Address must start with one of 'tb1', 'm', 'n', or '2' followed by letters or digits." | "Address must start with either of 'bc1', '1' or '3' followed by letters or digits." | "Address is invalid.";
