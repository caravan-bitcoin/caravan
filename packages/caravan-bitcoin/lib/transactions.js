"use strict";

require("core-js/modules/es6.function.name");
require("core-js/modules/es6.array.slice");
require("core-js/modules/es6.string.iterator");
require("core-js/modules/es6.array.from");
require("core-js/modules/es7.object.get-own-property-descriptors");
require("core-js/modules/web.dom.iterable");
require("core-js/modules/es6.array.iterator");
require("core-js/modules/es6.object.keys");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.signedMultisigTransaction = signedMultisigTransaction;
exports.unsignedMultisigPSBT = unsignedMultisigPSBT;
exports.unsignedMultisigTransaction = unsignedMultisigTransaction;
exports.unsignedTransactionObjectFromPSBT = unsignedTransactionObjectFromPSBT;
require("core-js/modules/es6.number.constructor");
require("core-js/modules/es7.symbol.async-iterator");
require("core-js/modules/es6.symbol");
require("core-js/modules/es6.array.filter");
require("core-js/modules/es6.regexp.to-string");
require("core-js/modules/es6.object.to-string");
require("core-js/modules/es6.array.map");
require("core-js/modules/es6.array.find");
var _bignumber = _interopRequireDefault(require("bignumber.js"));
var _assert = _interopRequireDefault(require("assert"));
var _bitcoinjsLib = require("bitcoinjs-lib");
var _networks = require("./networks");
var _p2sh_p2wsh = require("./p2sh_p2wsh");
var _p2wsh = require("./p2wsh");
var _multisig = require("./multisig");
var _signatures = require("./signatures");
var _inputs = require("./inputs");
var _outputs = require("./outputs");
var _script = require("./script");
var _psbt = require("./psbt");
var _braid = require("./braid");
var _keys = require("./keys");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }
function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return _typeof(key) === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (_typeof(input) !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (_typeof(res) !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); } /**
                                                                                                                                                                                                                                                                                                                                                                                               * This module provides functions for constructing and validating
                                                                                                                                                                                                                                                                                                                                                                                               * multisig transactions.
                                                                                                                                                                                                                                                                                                                                                                                               */
/**
 * Create an unsigned bitcoin transaction based on the network, inputs
 * and outputs.
 *
 * Returns a [`Transaction`]{@link https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/types/transaction.d.ts|Transaction} object from bitcoinjs-lib.
 */
function unsignedMultisigTransaction(network, inputs, outputs) {
  var multisigInputError = (0, _inputs.validateMultisigInputs)(inputs);
  (0, _assert.default)(!multisigInputError.length, multisigInputError);
  var multisigOutputError = (0, _outputs.validateOutputs)(network, outputs);
  (0, _assert.default)(!multisigOutputError.length, multisigOutputError);
  var transactionBuilder = new _bitcoinjsLib.TransactionBuilder();
  transactionBuilder.setVersion(1); // FIXME this depends on type...
  transactionBuilder.network = (0, _networks.networkData)(network);
  for (var inputIndex = 0; inputIndex < inputs.length; inputIndex += 1) {
    var input = inputs[inputIndex];
    transactionBuilder.addInput(input.txid, input.index);
  }
  for (var outputIndex = 0; outputIndex < outputs.length; outputIndex += 1) {
    var output = outputs[outputIndex];
    transactionBuilder.addOutput(output.address, new _bignumber.default(output.amountSats).toNumber());
  }
  return transactionBuilder.buildIncomplete();
}

/**
 * Create an unsigned bitcoin transaction based on the network, inputs
 * and outputs stored as a PSBT object
 *
 * Returns a [`PSBT`]{@link https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/types/psbt.d.ts|PSBT} object from bitcoinjs-lib.
 */
function unsignedMultisigPSBT(network, inputs, outputs) {
  var includeGlobalXpubs = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
  var multisigInputError = (0, _inputs.validateMultisigInputs)(inputs, true);
  (0, _assert.default)(!multisigInputError.length, multisigInputError);
  var multisigOutputError = (0, _outputs.validateOutputs)(network, outputs);
  (0, _assert.default)(!multisigOutputError.length, multisigOutputError);
  var psbt = new _bitcoinjsLib.Psbt({
    network: (0, _networks.networkData)(network)
  });
  // FIXME: update fixtures with unsigned tx version 02000000 and proper signatures
  psbt.setVersion(1); // Our fixtures currently sign transactions with version 0x01000000
  var globalExtendedPublicKeys = [];
  inputs.forEach(function (input) {
    var formattedInput = (0, _psbt.psbtInputFormatter)(_objectSpread({}, input));
    psbt.addInput(formattedInput);
    var braidDetails = input.multisig.braidDetails;
    if (braidDetails && includeGlobalXpubs) {
      var braid = _braid.Braid.fromData(JSON.parse(braidDetails));
      braid.extendedPublicKeys.forEach(function (extendedPublicKeyData) {
        var extendedPublicKey = new _keys.ExtendedPublicKey(extendedPublicKeyData);
        var alreadyFound = globalExtendedPublicKeys.find(function (existingExtendedPublicKey) {
          return existingExtendedPublicKey.toBase58() === extendedPublicKey.toBase58();
        });
        if (!alreadyFound) {
          globalExtendedPublicKeys.push(extendedPublicKey);
        }
      });
    }
  });
  if (includeGlobalXpubs && globalExtendedPublicKeys.length > 0) {
    var globalXpubs = globalExtendedPublicKeys.map(function (extendedPublicKey) {
      return {
        extendedPubkey: extendedPublicKey.encode(),
        masterFingerprint: extendedPublicKey.rootFingerprint ? Buffer.from(extendedPublicKey.rootFingerprint, "hex") : Buffer.alloc(0),
        path: extendedPublicKey.path || ""
      };
    });
    psbt.updateGlobal({
      globalXpub: globalXpubs
    });
  }
  var psbtOutputs = outputs.map(function (output) {
    return (0, _psbt.psbtOutputFormatter)(_objectSpread({}, output));
  });
  psbt.addOutputs(psbtOutputs);
  var txn = psbt.data.globalMap.unsignedTx.toBuffer().toString("hex");
  return _objectSpread(_objectSpread({}, psbt), {}, {
    txn: txn
  });
}

/**
 * Returns an unsigned Transaction object from bitcoinjs-lib that is not
 * generated via the TransactionBuilder (deprecating soon)
 *
 * FIXME: try squat out old implementation with the new PSBT one and see if
 *   everything works (the tx is the same)
 */
function unsignedTransactionObjectFromPSBT(psbt) {
  return _bitcoinjsLib.Transaction.fromHex(psbt.txn);
}

/**
 * Create a fully signed multisig transaction based on the unsigned
 * transaction, inputs, and their signatures.
 */
function signedMultisigTransaction(network, inputs, outputs, transactionSignatures) {
  var unsignedTransaction = unsignedMultisigTransaction(network, inputs, outputs); // validates inputs & outputs
  if (!transactionSignatures || transactionSignatures.length === 0) {
    throw new Error("At least one transaction signature is required.");
  }
  transactionSignatures.forEach(function (transactionSignature, transactionSignatureIndex) {
    if (transactionSignature.length < inputs.length) {
      throw new Error("Insufficient input signatures for transaction signature ".concat(transactionSignatureIndex + 1, ": require ").concat(inputs.length, ", received ").concat(transactionSignature.length, "."));
    }
  });
  var signedTransaction = _bitcoinjsLib.Transaction.fromHex(unsignedTransaction.toHex()); // FIXME inefficient?
  var _loop = function _loop(inputIndex) {
    var input = inputs[inputIndex];
    var inputSignatures = transactionSignatures.map(function (transactionSignature) {
      return transactionSignature[inputIndex];
    }).filter(function (inputSignature) {
      return Boolean(inputSignature);
    });
    var requiredSignatures = (0, _multisig.multisigRequiredSigners)(input.multisig);
    if (inputSignatures.length < requiredSignatures) {
      throw new Error("Insufficient signatures for input  ".concat(inputIndex + 1, ": require ").concat(requiredSignatures, ",  received ").concat(inputSignatures.length, "."));
    }
    var inputSignaturesByPublicKey = {};
    inputSignatures.forEach(function (inputSignature) {
      var publicKey;
      try {
        publicKey = (0, _signatures.validateMultisigSignature)(network, inputs, outputs, inputIndex, inputSignature);
      } catch (e) {
        throw new Error("Invalid signature for input ".concat(inputIndex + 1, ": ").concat(inputSignature, " (").concat(e, ")"));
      }
      if (inputSignaturesByPublicKey[publicKey]) {
        throw new Error("Duplicate signature for input ".concat(inputIndex + 1, ": ").concat(inputSignature));
      }
      inputSignaturesByPublicKey[publicKey] = inputSignature;
    });

    // Sort the signatures for this input by the index of their
    // corresponding public key within this input's redeem script.
    var publicKeys = (0, _multisig.multisigPublicKeys)(input.multisig);
    var sortedSignatures = publicKeys.map(function (publicKey) {
      return inputSignaturesByPublicKey[publicKey];
    }).filter(function (signature) {
      return signature ? (0, _signatures.signatureNoSighashType)(signature) : signature;
    }); // FIXME why not filter out the empty sigs?

    if ((0, _multisig.multisigAddressType)(input.multisig) === _p2wsh.P2WSH) {
      var witness = multisigWitnessField(input.multisig, sortedSignatures);
      signedTransaction.setWitness(inputIndex, witness);
    } else if ((0, _multisig.multisigAddressType)(input.multisig) === _p2sh_p2wsh.P2SH_P2WSH) {
      var _witness = multisigWitnessField(input.multisig, sortedSignatures);
      signedTransaction.setWitness(inputIndex, _witness);
      var scriptSig = (0, _multisig.multisigRedeemScript)(input.multisig);
      signedTransaction.ins[inputIndex].script = Buffer.from([scriptSig.output.length].concat(_toConsumableArray(scriptSig.output)));
    } else {
      var _scriptSig$input;
      var _scriptSig = multisigScriptSig(input.multisig, sortedSignatures);
      signedTransaction.ins[inputIndex].script = (_scriptSig$input = _scriptSig === null || _scriptSig === void 0 ? void 0 : _scriptSig.input) !== null && _scriptSig$input !== void 0 ? _scriptSig$input : Buffer.alloc(0);
    }
  };
  for (var inputIndex = 0; inputIndex < inputs.length; inputIndex++) {
    _loop(inputIndex);
  }
  return signedTransaction;
}

// TODO: implement this parallel function
// /**
//  * Create a fully signed multisig transaction based on the unsigned
//  * transaction, braid-aware inputs, and their signatures.
//  *
//  * @param {module:networks.NETWORKS} network - bitcoin network
//  * @param {module:inputs.MultisigTransactionInput[]} inputs - braid-aware multisig transaction inputs
//  * @param {module:outputs.TransactionOutput[]} outputs - transaction outputs
//  * @param {Object[]} transactionSignatures - array of transaction signatures, each an array of input signatures (1 per input)
//  * @returns {Transaction} a signed {@link https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/types/transaction.d.ts} Transaction object
//  */
// export function signedMultisigPSBT(network, inputs, outputs, transactionSignatures) {
//   const psbt = unsignedMultisigPSBT(network, inputs, outputs);
//  const unsignedTransaction = unsignedTransactionObjectFromPSBT(psbt); // validates inputs & outputs
//  if (!transactionSignatures || transactionSignatures.length === 0) { throw new Error("At least one transaction signature is required."); }
//
//  transactionSignatures.forEach((transactionSignature, transactionSignatureIndex) => {
//    if (transactionSignature.length < inputs.length) {
//      throw new Error(`Insufficient input signatures for transaction signature ${transactionSignatureIndex + 1}: require ${inputs.length}, received ${transactionSignature.length}.`);
//    }
//  });
//  console.log(unsignedTransaction);

// FIXME - add each signature to the PSBT
//   then finalizeAllInputs()
//   then extractTransaction()
//
// return signedTransaction;
// }

function multisigWitnessField(multisig, sortedSignatures) {
  var witness = [""].concat(sortedSignatures.map(function (s) {
    return (0, _signatures.signatureNoSighashType)(s) + "01";
  }));
  var witnessScript = (0, _multisig.multisigWitnessScript)(multisig);
  witness.push((0, _script.scriptToHex)(witnessScript));
  return witness.map(function (wit) {
    return Buffer.from(wit, "hex");
  });
}
function multisigScriptSig(multisig, signersInputSignatures) {
  var signatureOps = signersInputSignatures.map(function (signature) {
    return "".concat((0, _signatures.signatureNoSighashType)(signature), "01");
  }).join(" "); // 01 => SIGHASH_ALL
  var inputScript = "OP_0 ".concat(signatureOps);
  var inputScriptBuffer = _bitcoinjsLib.script.fromASM(inputScript);
  var rawMultisig = _bitcoinjsLib.payments.p2ms({
    network: multisig.network,
    output: Buffer.from((0, _multisig.multisigRedeemScript)(multisig).output, "hex"),
    input: inputScriptBuffer
  });
  return (0, _multisig.generateMultisigFromRaw)((0, _multisig.multisigAddressType)(multisig), rawMultisig);
}