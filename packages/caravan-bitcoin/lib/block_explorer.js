"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.blockExplorerAPIURL = blockExplorerAPIURL;
exports.blockExplorerAddressURL = blockExplorerAddressURL;
exports.blockExplorerTransactionURL = blockExplorerTransactionURL;
exports.blockExplorerURL = blockExplorerURL;
var _networks = require("./networks");
/**
 * This module provides functions for creating URLs for Blockstream's
 * [block explorer]{@link https://mempool.space}.
 *
 * This module does NOT provide implementations of HTTP requests which
 * fetch data from these URLs.
 */

var BASE_URL_MAINNET = "https://mempool.space";
var BASE_URL_TESTNET = "https://mempool.space/testnet";
function blockExplorerBaseURL(network) {
  return network === _networks.Network.TESTNET ? BASE_URL_TESTNET : BASE_URL_MAINNET;
}

/**
 * Returns the block explorer URL for the given path and network.
 */
function blockExplorerURL(path, network) {
  return "".concat(blockExplorerBaseURL(network)).concat(path);
}

/**
 * Returns the block explorer API URL for the given path and network.
 */
function blockExplorerAPIURL(path, network) {
  return "".concat(blockExplorerBaseURL(network), "/api").concat(path);
}

/**
 * Return the block explorer URL for the given transaction ID and network.
 */
function blockExplorerTransactionURL(txid, network) {
  return blockExplorerURL("/tx/".concat(txid), network);
}

/**
 * Return the block explorer URL for the given address and network.
 */
function blockExplorerAddressURL(address, network) {
  return blockExplorerURL("/address/".concat(address), network);
}