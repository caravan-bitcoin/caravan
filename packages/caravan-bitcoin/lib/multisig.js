"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MULTISIG_ADDRESS_TYPES = void 0;
exports.generateMultisigFromHex = generateMultisigFromHex;
exports.generateMultisigFromPublicKeys = generateMultisigFromPublicKeys;
exports.generateMultisigFromRaw = generateMultisigFromRaw;
exports.multisigAddress = multisigAddress;
exports.multisigAddressType = multisigAddressType;
exports.multisigBraidDetails = multisigBraidDetails;
exports.multisigPublicKeys = multisigPublicKeys;
exports.multisigRedeemScript = multisigRedeemScript;
exports.multisigRequiredSigners = multisigRequiredSigners;
exports.multisigScript = multisigScript;
exports.multisigTotalSigners = multisigTotalSigners;
exports.multisigWitnessScript = multisigWitnessScript;
require("core-js/modules/es6.regexp.match");
require("core-js/modules/es6.array.map");
var _networks = require("./networks");
var _p2sh = require("./p2sh");
var _p2sh_p2wsh = require("./p2sh_p2wsh");
var _p2wsh = require("./p2wsh");
var _utils = require("./utils");
var _bitcoinjsLib = require("bitcoinjs-lib");
/**
 * This module provides an API around the multisig capabilities of the
 * bitcoinjs-lib library.  The API is functional but requires you
 * creating and passing around a [`Multisig`]{@link module:multisig.MULTISIG} object.
 *
 * This `Multisig` object represents the combination of:
 *
 * 1) a sequence of N public keys
 * 2) the number of required signers (M)
 * 3) the address type  (P2SH, P2SH-P2WSH, P2WSH)
 * 4) the bitcoin network
 *
 * This corresponds to a unique bitcoin multisig address.  Note that
 * since (3) & (4) can change without changing (1) & (2), different
 * `Multisig` objects (and their corresponding bitcoin addresses) can
 * have different representations but the same security rules as to
 * who can sign.
 *
 * You can create `Multisig` objects yourself using the following
 * functions:
 *
 * - `generateMultisigFromPublicKeys` which takes public keys as input
 * - `generateMultisigFromHex` which takes a redeem/witness script as input
 *
 * Once you have a `Multisig` object you can pass it around in your
 * code and then ask questions about it using the other functions
 * defined in this module.
 *
 * You can manipulate `Multisig` objects directly but it's better to
 * use the functions from API provided by this module.
 */

/**
 * Describes the return type of several functions in the
 * `payments` module of bitcoinjs-lib.
 *
 * The following functions in this module will return objects of this
 * type:
 *
 * - `generateMultisigFromPublicKeys` which takes public keys as input
 * - `generateMultisigFromHex` which takes a redeem/witness script as input
 *
 * The remaining functions accept these objects as arguments.
 */

/**
 * Enumeration of possible multisig address types ([P2SH]{@link module:p2sh.P2SH}|[P2SH_P2WSH]{@link module:p2sh_p2wsh.P2SH_P2WSH}|[P2WSH]{@link module:p2wsh.P2WSH}).
 */
var MULTISIG_ADDRESS_TYPES = {
  P2SH: _p2sh.P2SH,
  P2SH_P2WSH: _p2sh_p2wsh.P2SH_P2WSH,
  P2WSH: _p2wsh.P2WSH
};

/**
 * Return an M-of-N [`Multisig`]{@link module:multisig.MULTISIG}
 * object by specifying the total number of signers (M) and the public
 * keys (N total).
 */
exports.MULTISIG_ADDRESS_TYPES = MULTISIG_ADDRESS_TYPES;
function generateMultisigFromPublicKeys(network, addressType, requiredSigners) {
  for (var _len = arguments.length, publicKeys = new Array(_len > 3 ? _len - 3 : 0), _key = 3; _key < _len; _key++) {
    publicKeys[_key - 3] = arguments[_key];
  }
  var multisig = _bitcoinjsLib.payments.p2ms({
    m: requiredSigners,
    pubkeys: publicKeys.map(function (hex) {
      return Buffer.from(hex, "hex");
    }),
    network: (0, _networks.networkData)(network)
  });
  return generateMultisigFromRaw(addressType, multisig);
}

/**
 * Return an M-of-N [`Multisig`]{@link module.multisig:Multisig}
 * object by passing a script in hex.
 *
 * If the `addressType` is `P2SH` then the script hex being passed is
 * the redeem script.  If the `addressType` is P2SH-wrapped SegWit
 * (`P2SH_P2WSH`) or native SegWit (`P2WSH`) then the script hex being
 * passed is the witness script.
 *
 * In practice, the same script hex can be thought of as any of
 * several address types, depending on context.
 */
function generateMultisigFromHex(network, addressType, multisigScriptHex) {
  var multisig = _bitcoinjsLib.payments.p2ms({
    output: Buffer.from(multisigScriptHex, "hex"),
    network: (0, _networks.networkData)(network)
  });
  return generateMultisigFromRaw(addressType, multisig);
}

/**
 * Return an M-of-N [`Multisig`]{@link module.multisig:Multisig}
 * object by passing in a raw P2MS multisig object (from bitcoinjs-lib).
 *
 * This function is only used internally, do not call it directly.
 */
function generateMultisigFromRaw(addressType, multisig) {
  switch (addressType) {
    case _p2sh.P2SH:
      return _bitcoinjsLib.payments.p2sh({
        redeem: multisig
      });
    case _p2sh_p2wsh.P2SH_P2WSH:
      return _bitcoinjsLib.payments.p2sh({
        redeem: _bitcoinjsLib.payments.p2wsh({
          redeem: multisig
        })
      });
    case _p2wsh.P2WSH:
      return _bitcoinjsLib.payments.p2wsh({
        redeem: multisig
      });
    default:
      return null;
  }
}

/**
 * Return the [address type]{@link module:multisig.MULTISIG_ADDRESS_TYPES} of the given `Multisig` object.
 */
function multisigAddressType(multisig) {
  if (multisig.redeem.redeem) {
    return _p2sh_p2wsh.P2SH_P2WSH;
  } else {
    // FIXME why is multisig.witness null?
    // if (multisig.witness) {
    if (multisig.address.match(/^(tb|bc)/)) {
      return _p2wsh.P2WSH;
    } else {
      return _p2sh.P2SH;
    }
  }
}

/**
 * Return the number of required signers of the given `Multisig`
 * object.
 */
function multisigRequiredSigners(multisig) {
  return multisigAddressType(multisig) === _p2sh_p2wsh.P2SH_P2WSH ? multisig.redeem.redeem.m : multisig.redeem.m;
}

/**
 * Return the number of total signers (public keys) of the given
 * `Multisig` object.
 */
function multisigTotalSigners(multisig) {
  return multisigAddressType(multisig) === _p2sh_p2wsh.P2SH_P2WSH ? multisig.redeem.redeem.n : multisig.redeem.n;
}

/**
 * Return the multisig script for the given `Multisig` object.
 *
 * If the address type of the given multisig object is P2SH, the
 * redeem script will be returned.  Otherwise, the witness script will
 * be returned.
 */
function multisigScript(multisig) {
  switch (multisigAddressType(multisig)) {
    case _p2sh.P2SH:
      return multisigRedeemScript(multisig);
    case _p2sh_p2wsh.P2SH_P2WSH:
      return multisigWitnessScript(multisig);
    case _p2wsh.P2WSH:
      return multisigWitnessScript(multisig);
    default:
      /* istanbul ignore next */
      // multisigAddressType only returns one of the 3 above choices
      return null;
  }
}

/**
 * Return the redeem script for the given `Multisig` object.
 *
 * If the address type of the given multisig object is P2WSH, this
 * will return null.
 */
function multisigRedeemScript(multisig) {
  switch (multisigAddressType(multisig)) {
    case _p2sh.P2SH:
      return multisig.redeem;
    case _p2sh_p2wsh.P2SH_P2WSH:
      return multisig.redeem;
    case _p2wsh.P2WSH:
      return null;
    default:
      /* istanbul ignore next */
      // multisigAddressType only returns one of the 3 above choices
      return null;
  }
}

/**
 * Return the witness script for the given `Multisig` object.
 *
 * If the address type of the given multisig object is P2SH, this will
 * return null.
 */
function multisigWitnessScript(multisig) {
  switch (multisigAddressType(multisig)) {
    case _p2sh.P2SH:
      return null;
    case _p2sh_p2wsh.P2SH_P2WSH:
      return multisig.redeem.redeem;
    case _p2wsh.P2WSH:
      return multisig.redeem;
    default:
      /* istanbul ignore next */
      // multisigAddressType only returns one of the 3 above choices
      return null;
  }
}

/**
 * Return the (compressed) public keys in hex for the given `Multisig`
 * object.
 *
 * The public keys are in the order used in the corresponding
 * redeem/witness script.
 */
function multisigPublicKeys(multisig) {
  return (multisigAddressType(multisig) === _p2sh.P2SH ? multisigRedeemScript(multisig) : multisigWitnessScript(multisig)).pubkeys.map(_utils.toHexString);
}

/**
 * Return the address for a given `Multisig` object.
 */
function multisigAddress(multisig) {
  return multisig.address;
}

/**
 * Return the braid details (if known) for a given `Multisig` object.
 */
function multisigBraidDetails(multisig) {
  return multisig.braidDetails ? multisig.braidDetails : null;
}