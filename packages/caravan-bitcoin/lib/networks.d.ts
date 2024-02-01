import { networks } from "bitcoinjs-lib";
/**
 * This module exports network constants and provide some utility
 * functions for displaying the network name and passing the network
 * value to bitcoinjs.
 */
export declare enum Network {
    MAINNET = "mainnet",
    TESTNET = "testnet",
    REGTEST = "regtest",
    SIGNET = "signet"
}
/**
 * Returns bitcoinjs-lib network object corresponding to the given
 * network.
 *
 * This function is for internal use by this library.
 */
export declare function networkData(network: Network): networks.Network;
/**
 * Returns human-readable network label for the specified network.
 */
export declare function networkLabel(network: Network): "Mainnet" | "Testnet";
/**
 * given a prefix determine the network it indicates
 */
export declare function getNetworkFromPrefix(prefix: string): Network.MAINNET | Network.TESTNET;
