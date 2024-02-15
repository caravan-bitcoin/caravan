"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
require("core-js/modules/es7.object.get-own-property-descriptors");
require("core-js/modules/web.dom.iterable");
require("core-js/modules/es6.array.iterator");
require("core-js/modules/es6.object.keys");
require("core-js/modules/es6.number.constructor");
require("core-js/modules/es7.symbol.async-iterator");
require("core-js/modules/es6.symbol");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PSBT_MAGIC_HEX = exports.PSBT_MAGIC_BYTES = exports.PSBT_MAGIC_B64 = void 0;
exports.addSignaturesToPSBT = addSignaturesToPSBT;
exports.autoLoadPSBT = autoLoadPSBT;
exports.parseSignatureArrayFromPSBT = parseSignatureArrayFromPSBT;
exports.parseSignaturesFromPSBT = parseSignaturesFromPSBT;
exports.psbtInputFormatter = psbtInputFormatter;
exports.psbtOutputFormatter = psbtOutputFormatter;
exports.translatePSBT = translatePSBT;
require("core-js/modules/es6.string.iterator");
require("core-js/modules/es6.array.from");
require("core-js/modules/es6.string.starts-with");
require("core-js/modules/es6.array.filter");
require("core-js/modules/es6.regexp.to-string");
require("core-js/modules/es6.object.to-string");
require("core-js/modules/es6.array.map");
require("core-js/modules/es6.array.slice");
var _bitcoinjsLib = require("bitcoinjs-lib");
var _bufferutils = require("bitcoinjs-lib/src/bufferutils");
var _utils = require("./utils");
var _multisig = require("./multisig");
var _paths = require("./paths");
var _bignumber = _interopRequireDefault(require("bignumber.js"));
var _p2sh = require("./p2sh");
var _p2wsh = require("./p2wsh");
var _p2sh_p2wsh = require("./p2sh_p2wsh");
var _braid = require("./braid");
var _networks = require("./networks");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
/**
 * This module provides functions for interacting with PSBTs, see BIP174
 * https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki
 */

/**
 * Represents a transaction PSBT input.
 *
 * The [`Multisig`]{@link module:multisig.MULTISIG} object represents
 * the address the corresponding UTXO belongs to.
 */

/**
 * Represents an output in a PSBT transaction.
 */

var PSBT_MAGIC_HEX = "70736274ff";
exports.PSBT_MAGIC_HEX = PSBT_MAGIC_HEX;
var PSBT_MAGIC_B64 = "cHNidP8";
exports.PSBT_MAGIC_B64 = PSBT_MAGIC_B64;
var PSBT_MAGIC_BYTES = Buffer.from([0x70, 0x73, 0x62, 0x74, 0xff]);

/**
 * Given a string, try to create a Psbt object based on MAGIC (hex or Base64)
 */
exports.PSBT_MAGIC_BYTES = PSBT_MAGIC_BYTES;
function autoLoadPSBT(psbtFromFile, options) {
  if (typeof psbtFromFile !== "string") return null;
  // Auto-detect and decode Base64 and Hex.
  if (psbtFromFile.substring(0, 10) === PSBT_MAGIC_HEX) {
    return _bitcoinjsLib.Psbt.fromHex(psbtFromFile, options);
  } else if (psbtFromFile.substring(0, 7) === PSBT_MAGIC_B64) {
    return _bitcoinjsLib.Psbt.fromBase64(psbtFromFile, options);
  } else {
    return null;
  }
}

/**
 * Return the getBip32Derivation (if known) for a given `Multisig` object.
 */
function getBip32Derivation(multisig) {
  var index = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
  // Already have one, return it
  if (multisig.bip32Derivation) {
    return multisig.bip32Derivation;
  }
  // Otherwise generate it
  var config = JSON.parse((0, _multisig.multisigBraidDetails)(multisig));
  var braid = (0, _braid.generateBraid)(config.network, config.addressType, config.extendedPublicKeys, config.requiredSigners, config.index);
  return (0, _braid.generateBip32DerivationByIndex)(braid, index);
}

/**
 * Grabs appropriate bip32Derivation based on the input's last index
 */
function psbtInputDerivation(input) {
  // Multi-address inputs will have different bip32Derivations per address (index/path),
  // so specify the index ... If the input is missing a path, assume you want index = 0.
  var index = input.bip32Path ? (0, _paths.bip32PathToSequence)(input.bip32Path).slice(-1)[0] : 0;
  return getBip32Derivation(input.multisig, index);
}

/**
 * Grabs appropriate bip32Derivation for a change output
 */
function psbtOutputDerivation(output) {
  return getBip32Derivation(output.multisig);
}

/**
 * Gets the Witness script from the ouput that generated the input
 */
function getWitnessOutputScriptFromInput(input) {
  // We have the transactionHex - use bitcoinjs to pluck out the witness script
  // return format is:
  //  {
  //    script: Buffer.from(out.script, 'hex'),
  //    amount: out.value,
  //  }
  // See https://github.com/bitcoinjs/bitcoinjs-lib/issues/1282
  var tx = _bitcoinjsLib.Transaction.fromHex(input.transactionHex);
  return tx.outs[input.index];
}

/**
 * Return the locking script for the given `Multisig` object in a PSBT consumable format
 */
function psbtMultisigLock(multisig) {
  var multisigLock = {};

  // eslint-disable-next-line default-case
  switch ((0, _multisig.multisigAddressType)(multisig)) {
    case _p2sh.P2SH:
      multisigLock.redeemScript = (0, _multisig.multisigRedeemScript)(multisig).output;
      break;
    case _p2wsh.P2WSH:
      multisigLock.witnessScript = (0, _multisig.multisigWitnessScript)(multisig).output;
      break;
    case _p2sh_p2wsh.P2SH_P2WSH:
      // need both
      multisigLock.witnessScript = (0, _multisig.multisigWitnessScript)(multisig).output;
      multisigLock.redeemScript = (0, _multisig.multisigRedeemScript)(multisig).output;
      break;
  }
  return multisigLock;
}

/**
 * Take a MultisigTransactionInput and turn it into a MultisigTransactionPSBTInput
 */
function psbtInputFormatter(input) {
  // In this function we're decorating the MultisigTransactionInput appropriately based
  // on its address type.
  //
  // Essentially we need to define a couple parameters to make the whole thing work.
  //   1) Either a Witness UTXO or Non-Witness UTXO pointing to where this input originated
  //   2) multisigScript (spending lock) which can be either a redeemScript, a witnessScript, or both.
  //
  // For more info see https://github.com/bitcoinjs/bitcoinjs-lib/blob/v5.1.10/test/integration/transactions.spec.ts#L680

  // For SegWit inputs, you need an object with the output script buffer and output value
  var witnessUtxo = getWitnessOutputScriptFromInput(input);
  // For non-SegWit inputs, you must pass the full transaction buffer
  var nonWitnessUtxo = Buffer.from(input.transactionHex, "hex");

  // FIXME - this makes the assumption that the funding transaction used the same transaction type as the current input
  //   we dont have isSegWit info on our inputs at the moment, so we don't know for sure.
  //   This assumption holds in our fixtures, but it may need to be remedied in the future.
  var isSegWit = (0, _multisig.multisigWitnessScript)(input.multisig) !== null;
  var utxoToVerify = isSegWit ? {
    witnessUtxo: witnessUtxo
  } : {
    nonWitnessUtxo: nonWitnessUtxo
  };
  var multisigScripts = psbtMultisigLock(input.multisig);
  var bip32Derivation = psbtInputDerivation(input);
  return _objectSpread(_objectSpread(_objectSpread({
    hash: input.txid,
    index: input.index
  }, utxoToVerify), multisigScripts), {}, {
    bip32Derivation: bip32Derivation
  });
}

/**
 * Take a MultisigTransactionOutput and turn it into a MultisigTransactionPSBTOutput
 */
function psbtOutputFormatter(output) {
  var multisigScripts = {};
  var bip32Derivation = [];
  if (output.multisig) {
    // This indicates that this output is a *change* output, so we include additional information:
    //    Change address bip32Derivation (rootFingerprints && pubkeys && bip32paths)
    //    Change address multisig locking script (redeem || witness || both)
    // With the above information, the device (e.g. Coldcard) can validate that the change address
    // can be signed with the same device. The display will show the output as "Change" instead of
    // a normal external output.
    multisigScripts = psbtMultisigLock(output.multisig);
    bip32Derivation = psbtOutputDerivation(output);
    return _objectSpread(_objectSpread({
      address: output.address,
      value: new _bignumber.default(output.amountSats).toNumber()
    }, multisigScripts), {}, {
      bip32Derivation: bip32Derivation
    });
  }
  return _objectSpread({
    address: output.address,
    value: new _bignumber.default(output.amountSats).toNumber()
  }, output);
}

/**
 * Create unchained-wallets style transaction input objects from a PSBT
 */
function getUnchainedInputsFromPSBT(network, addressType, psbt) {
  return psbt.txInputs.map(function (input, index) {
    var dataInput = psbt.data.inputs[index];

    // FIXME - this is where we're currently only handling P2SH correctly
    var fundingTxHex = dataInput.nonWitnessUtxo.toString("hex");
    var fundingTx = _bitcoinjsLib.Transaction.fromHex(fundingTxHex);
    var multisig = (0, _multisig.generateMultisigFromHex)(network, addressType, dataInput.redeemScript.toString("hex"));
    return {
      amountSats: fundingTx.outs[input.index].value,
      index: input.index,
      transactionHex: fundingTxHex,
      txid: (0, _bufferutils.reverseBuffer)(input.hash).toString("hex"),
      multisig: multisig
    };
  });
}

/**
 * Create unchained-wallets style transaction output objects from a PSBT
 */
function getUnchainedOutputsFromPSBT(psbt) {
  return psbt.txOutputs.map(function (output) {
    return {
      address: output.address,
      amountSats: output.value
    };
  });
}

/**
 * Create unchained-wallets style transaction input objects
 *
 * @param {Object} psbt - Psbt bitcoinjs-lib object
 * @param {Object} signingKeyDetails - Object containing signing key details (Fingerprint + bip32path prefix)
 * @return {Object[]} bip32Derivations - array of signing bip32Derivation objects
 */
function filterRelevantBip32Derivations(psbt, signingKeyDetails) {
  return psbt.data.inputs.map(function (input) {
    var bip32Derivation = input.bip32Derivation.filter(function (b32d) {
      return b32d.path.startsWith(signingKeyDetails.path) && b32d.masterFingerprint.toString("hex") === signingKeyDetails.xfp;
    });
    if (!bip32Derivation.length) {
      throw new Error("Signing key details not included in PSBT");
    }
    return bip32Derivation[0];
  });
}

/**
 * Translates a PSBT into inputs/outputs consumable by supported non-PSBT devices in the
 * `unchained-wallets` library.
 *
 * FIXME - Have only confirmed this is working for P2SH addresses on Ledger on regtest
 */
function translatePSBT(network, addressType, psbt, signingKeyDetails) {
  if (addressType !== _p2sh.P2SH) {
    throw new Error("Unsupported addressType -- only P2SH is supported right now");
  }
  var localPSBT = autoLoadPSBT(psbt, {
    network: (0, _networks.networkData)(network)
  });
  if (localPSBT === null) return null;

  // The information we need to provide proper unchained-wallets style objects to the supported
  // non-PSBT devices, we need to grab info from different places from within the PSBT.
  //    1. the "data inputs"
  //    2. the "transaction inputs"
  //
  // We'll do that in the functions below.

  // First, we check that we actually do have any inputs to sign:
  var bip32Derivations = filterRelevantBip32Derivations(localPSBT, signingKeyDetails);

  // The shape of these return objects are specific to existing code
  // in unchained-wallets for signing with Trezor and Ledger devices.
  var unchainedInputs = getUnchainedInputsFromPSBT(network, addressType, localPSBT);
  var unchainedOutputs = getUnchainedOutputsFromPSBT(localPSBT);
  return {
    unchainedInputs: unchainedInputs,
    unchainedOutputs: unchainedOutputs,
    bip32Derivations: bip32Derivations
  };
}

/**
 * Given a PSBT, an input index, a pubkey, and a signature,
 * update the input inside the PSBT with a partial signature object.
 *
 * Make sure it validates, and then return the PSBT with the partial
 * signature inside.
 */
function addSignatureToPSBT(psbt, inputIndex, pubkey, signature) {
  var partialSig = [{
    pubkey: pubkey,
    signature: signature
  }];
  psbt.data.updateInput(inputIndex, {
    partialSig: partialSig
  });
  if (!psbt.validateSignaturesOfInput(inputIndex, pubkey)) {
    throw new Error("One or more invalid signatures.");
  }
  return psbt;
}

/**
 * Given an unsigned PSBT, an array of signing public key(s) (one per input),
 * an array of signature(s) (one per input) in the same order as the pubkey(s),
 * adds partial signature object(s) to each input and returns the PSBT with
 * partial signature(s) included.
 *
 * FIXME - maybe we add functionality of sending in a single pubkey as well,
 *         which would assume all of the signature(s) are for that pubkey.
 */
function addSignaturesToPSBT(network, psbt, pubkeys, signatures) {
  var psbtWithSignatures = autoLoadPSBT(psbt, {
    network: (0, _networks.networkData)(network)
  });
  if (psbtWithSignatures === null) return null;
  signatures.forEach(function (sig, idx) {
    var pubkey = pubkeys[idx];
    psbtWithSignatures = addSignatureToPSBT(psbtWithSignatures, idx, pubkey, sig);
  });
  return psbtWithSignatures.toBase64();
}

/**
 * Get number of signers in the PSBT
 */

function getNumSigners(psbt) {
  var partialSignatures = psbt && psbt.data && psbt.data.inputs && psbt.data.inputs[0] ? psbt.data.inputs[0].partialSig : undefined;
  return partialSignatures === undefined ? 0 : partialSignatures.length;
}

/**
 * Extracts the signature(s) from a PSBT.
 * NOTE: there should be one signature per input, per signer.
 *
 * ADDITIONAL NOTE: because of the restrictions we place on braids to march their
 * multisig addresses (slices) forward at the *same* index across each chain of the
 * braid, we do not run into a possible collision with this data structure.
 * BUT - to have this method accommodate the *most* general form of signature parsing,
 * it would be wise to wrap this one level deeper like:
 *
 *                     address: [pubkey : [signature(s)]]
 *
 * that way if your braid only advanced one chain's (member's) index so that a pubkey
 * could be used in more than one address, everything would still function properly.
 */
function parseSignaturesFromPSBT(psbtFromFile) {
  var psbt = autoLoadPSBT(psbtFromFile, {});
  if (psbt === null) {
    return null;
  }
  var numSigners = getNumSigners(psbt);
  var signatureSet = {};
  var pubKey = "";
  var inputs = psbt.data.inputs;
  // Find signatures in the PSBT
  if (numSigners >= 1) {
    // return array of arrays of signatures
    for (var i = 0; i < inputs.length; i++) {
      for (var j = 0; j < numSigners; j++) {
        var _inputs$i, _inputs$i$partialSig;
        pubKey = (0, _utils.toHexString)(Array.prototype.slice.call(inputs === null || inputs === void 0 ? void 0 : (_inputs$i = inputs[i]) === null || _inputs$i === void 0 ? void 0 : (_inputs$i$partialSig = _inputs$i.partialSig) === null || _inputs$i$partialSig === void 0 ? void 0 : _inputs$i$partialSig[j].pubkey));
        if (pubKey in signatureSet) {
          var _inputs$i2, _inputs$i2$partialSig;
          signatureSet[pubKey].push(inputs === null || inputs === void 0 ? void 0 : (_inputs$i2 = inputs[i]) === null || _inputs$i2 === void 0 ? void 0 : (_inputs$i2$partialSig = _inputs$i2.partialSig) === null || _inputs$i2$partialSig === void 0 ? void 0 : _inputs$i2$partialSig[j].signature.toString("hex"));
        } else {
          var _inputs$i3, _inputs$i3$partialSig;
          signatureSet[pubKey] = [inputs === null || inputs === void 0 ? void 0 : (_inputs$i3 = inputs[i]) === null || _inputs$i3 === void 0 ? void 0 : (_inputs$i3$partialSig = _inputs$i3.partialSig) === null || _inputs$i3$partialSig === void 0 ? void 0 : _inputs$i3$partialSig[j].signature.toString("hex")];
        }
      }
    }
  } else {
    return null;
  }
  return signatureSet;
}

/**
 * Extracts signatures in order of inputs and returns as array (or array of arrays if multiple signature sets)
 */
function parseSignatureArrayFromPSBT(psbtFromFile) {
  var psbt = autoLoadPSBT(psbtFromFile);
  if (psbt === null) return null;
  var numSigners = getNumSigners(psbt);
  var signatureArrays = Array.from({
    length: numSigners
  }, function () {
    return [];
  });
  var inputs = psbt.data.inputs;
  if (numSigners >= 1) {
    for (var i = 0; i < inputs.length; i += 1) {
      for (var j = 0; j < numSigners; j += 1) {
        var _inputs$i4, _inputs$i4$partialSig;
        var signature = inputs === null || inputs === void 0 ? void 0 : (_inputs$i4 = inputs[i]) === null || _inputs$i4 === void 0 ? void 0 : (_inputs$i4$partialSig = _inputs$i4.partialSig) === null || _inputs$i4$partialSig === void 0 ? void 0 : _inputs$i4$partialSig[j].signature.toString("hex");
        if (signature) {
          signatureArrays[j].push(signature);
        }
      }
    }
  } else {
    return null;
  }
  return numSigners === 1 ? signatureArrays[0] : signatureArrays;
}