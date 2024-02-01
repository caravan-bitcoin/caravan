/**
 * This module provides functions for creating URLs for Blockstream's
 * [block explorer]{@link https://mempool.space}.
 *
 * This module does NOT provide implementations of HTTP requests which
 * fetch data from these URLs.
 */
import { Network } from "./networks";
/**
 * Returns the block explorer URL for the given path and network.
 */
export declare function blockExplorerURL(path: string, network: Network): string;
/**
 * Returns the block explorer API URL for the given path and network.
 */
export declare function blockExplorerAPIURL(path: string, network: Network): string;
/**
 * Return the block explorer URL for the given transaction ID and network.
 */
export declare function blockExplorerTransactionURL(txid: string, network: Network): string;
/**
 * Return the block explorer URL for the given address and network.
 */
export declare function blockExplorerAddressURL(address: string, network: Network): string;
