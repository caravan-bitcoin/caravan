"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Network = void 0;
exports.getNetworkFromPrefix = getNetworkFromPrefix;
exports.networkData = networkData;
exports.networkLabel = networkLabel;
var _bitcoinjsLib = require("bitcoinjs-lib");
/**
 * This module exports network constants and provide some utility
 * functions for displaying the network name and passing the network
 * value to bitcoinjs.
 */
/* eslint-disable no-shadow */
var Network;
/**
 * Returns bitcoinjs-lib network object corresponding to the given
 * network.
 *
 * This function is for internal use by this library.
 */
exports.Network = Network;
(function (Network) {
  Network["MAINNET"] = "mainnet";
  Network["TESTNET"] = "testnet";
  Network["REGTEST"] = "regtest";
  Network["SIGNET"] = "signet";
})(Network || (exports.Network = Network = {}));
function networkData(network) {
  switch (network) {
    case Network.MAINNET:
      return _bitcoinjsLib.networks.bitcoin;
    case Network.TESTNET:
      return _bitcoinjsLib.networks.testnet;
    default:
      return _bitcoinjsLib.networks.testnet;
  }
}

/**
 * Returns human-readable network label for the specified network.
 */
function networkLabel(network) {
  switch (network) {
    case Network.MAINNET:
      return "Mainnet";
    case Network.TESTNET:
      return "Testnet";
    default:
      return "Testnet";
  }
}

/**
 * given a prefix determine the network it indicates
 */
function getNetworkFromPrefix(prefix) {
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
      throw new Error("Unrecognized extended public key prefix ".concat(prefix));
  }
}