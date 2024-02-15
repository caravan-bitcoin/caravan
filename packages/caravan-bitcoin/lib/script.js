"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.scriptToHex = scriptToHex;
exports.scriptToOps = scriptToOps;
require("core-js/modules/es6.regexp.to-string");
require("core-js/modules/es6.object.to-string");
var _bitcoinjsLib = require("bitcoinjs-lib");
/**
 * This module provides functions for converting generic bitcoin
 * scripts to hex or opcodes.
 */

/**
 * Extracts the ASM (opcode) representation of a script from a
 * `Multisig` object.
 */
function scriptToOps(multisig) {
  return _bitcoinjsLib.script.toASM(multisig.output);
}

/**
 * Extracts the hex representation of a script from a `Multisig`
 * object.
 */
function scriptToHex(multisigScript) {
  return multisigScript.output.toString("hex");
}