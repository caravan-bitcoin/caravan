import { networks, Network as BitcoinJSNetwork } from "bitcoinjs-lib-v5";

/**
 * This module exports network constants and provide some utility
 * functions for displaying the network name and passing the network
 * value to bitcoinjs.
 */
/* eslint-disable no-shadow */
export enum Network {
  MAINNET = "mainnet",
  TESTNET = "testnet",
  TESTNET4 = "testnet4",
  REGTEST = "regtest",
  SIGNET = "signet",
}

/**
 * Custom network configuration for Signet.
 * Signet is a test network with centralized signing.
 */
const signet: BitcoinJSNetwork = {
  messagePrefix: "\x18Bitcoin Signed Message:\n",
  bech32: "tb",
  bip32: {
    public: 0x043587cf,
    private: 0x04358394,
  },
  pubKeyHash: 0x6f,
  scriptHash: 0xc4,
  wif: 0xef,
};

/**
 * Custom network configuration for Testnet4.
 * Testnet4 is the latest Bitcoin testnet, replacing Testnet3.
 */
const testnet4: BitcoinJSNetwork = {
  messagePrefix: "\x18Bitcoin Signed Message:\n",
  bech32: "tb",
  bip32: {
    public: 0x043587cf,
    private: 0x04358394,
  },
  pubKeyHash: 0x6f,
  scriptHash: 0xc4,
  wif: 0xef,
}

/**
 * Returns bitcoinjs-lib network object corresponding to the given
 * network.
 *
 * This function is for internal use by this library.
 */
export function networkData(network: Network) {
  switch (network) {
    case Network.MAINNET:
      return networks.bitcoin;
    case Network.TESTNET:
      return networks.testnet;
    case Network.TESTNET4:
      return testnet4;
    case Network.REGTEST:
      return networks.regtest;
    case Network.SIGNET:
      return signet;
    default:
      return networks.testnet;
  }
}

/**
 * Returns human-readable network label for the specified network.
 */
export function networkLabel(network: Network) {
  switch (network) {
    case Network.MAINNET:
      return "Mainnet";
    case Network.TESTNET:
      return "Testnet3";
    case Network.TESTNET4:
      return "Testnet4";
    case Network.REGTEST:
      return "Regtest";
    case Network.SIGNET:
      return "Signet";
    default:
      return "Testnet";
  }
}

/**
 * given a prefix determine the network it indicates
 */
export function getNetworkFromPrefix(prefix: string) {
  switch (prefix.toLowerCase()) {
    case "xpub":
    case "ypub":
    case "zpub":
      return Network.MAINNET;

    case "tpub":
    case "upub":
    case "vpub":
      return Network.TESTNET;

    default:
      throw new Error(`Unrecognized extended public key prefix ${prefix}`);
  }
}
