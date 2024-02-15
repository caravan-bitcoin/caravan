"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.signatureNoSighashType = signatureNoSighashType;
exports.validateMultisigSignature = validateMultisigSignature;
require("core-js/modules/es6.array.slice");
var _bignumber = _interopRequireDefault(require("bignumber.js"));
var _bip = _interopRequireDefault(require("bip66"));
var _bitcoinjsLib = require("bitcoinjs-lib");
var _p2sh_p2wsh = require("./p2sh_p2wsh");
var _p2wsh = require("./p2wsh");
var _multisig = require("./multisig");
var _transactions = require("./transactions");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
/**
 * This module provides functions for validating and handling
 * multisig transaction signatures.
 */

/**
 * Validate a multisig signature for given input and public key.
 */
function validateMultisigSignature(network, inputs, outputs, inputIndex, inputSignature) {
  var hash = multisigSignatureHash(network, inputs, outputs, inputIndex);
  var signatureBuffer = multisigSignatureBuffer(signatureNoSighashType(inputSignature));
  var input = inputs[inputIndex];
  var publicKeys = (0, _multisig.multisigPublicKeys)(input.multisig);
  for (var publicKeyIndex = 0; publicKeyIndex < (0, _multisig.multisigTotalSigners)(input.multisig); publicKeyIndex++) {
    var publicKey = publicKeys[publicKeyIndex];
    var publicKeyBuffer = Buffer.from(publicKey, "hex");
    var keyPair = _bitcoinjsLib.ECPair.fromPublicKey(publicKeyBuffer);
    if (keyPair.verify(hash, signatureBuffer)) {
      return publicKey;
    }
  }
  return false;
}

/**
 * This function takes a DER encoded signature and returns it without the SIGHASH_BYTE
 */
function signatureNoSighashType(signature) {
  var len = parseInt(signature.slice(2, 4), 16);
  if (len === (signature.length - 4) / 2) return signature;else return signature.slice(0, -2);
}

/**
 * Returns the multisig Signature Hash for an input at inputIndex
 */
function multisigSignatureHash(network, inputs, outputs, inputIndex) {
  var unsignedTransaction = (0, _transactions.unsignedMultisigTransaction)(network, inputs, outputs);
  var input = inputs[inputIndex];
  if ((0, _multisig.multisigAddressType)(input.multisig) === _p2wsh.P2WSH || (0, _multisig.multisigAddressType)(input.multisig) === _p2sh_p2wsh.P2SH_P2WSH) {
    return unsignedTransaction.hashForWitnessV0(inputIndex, (0, _multisig.multisigWitnessScript)(input.multisig).output, new _bignumber.default(input.amountSats).toNumber(), _bitcoinjsLib.Transaction.SIGHASH_ALL);
  } else {
    return unsignedTransaction.hashForSignature(inputIndex, (0, _multisig.multisigRedeemScript)(input.multisig).output, _bitcoinjsLib.Transaction.SIGHASH_ALL);
  }
}

/**
 * Create a signature buffer that can be passed to ECPair.verify
 */
function multisigSignatureBuffer(signature) {
  var encodedSignerInputSignatureBuffer = Buffer.from(signature, "hex");
  var decodedSignerInputSignatureBuffer = _bip.default.decode(encodedSignerInputSignatureBuffer);
  var r = decodedSignerInputSignatureBuffer.r,
    s = decodedSignerInputSignatureBuffer.s; // The value returned from the decodedSignerInputSignatureBuffer has
  // a few edge cases that need to be handled properly. There exists a mismatch between the
  // DER serialization and the ECDSA requirements, namely:
  //   DER says that its highest bit states polarity (positive/negative)
  //   ECDSA says no negatives, only positives.
  // So in the case where DER would result in a negative, a one-byte 0x00 is added to the value
  // NOTE: this can happen on r and on S.
  // See https://transactionfee.info/charts/bitcoin-script-ecdsa-length/ for more information
  // Truncate the leading 0x00 if r or S is 33 bytes long
  var rToUse = r.byteLength > 32 ? r.slice(1) : r;
  // Technically, this could be done but extremely unlikely in the current era.
  // let sToUse = s.byteLength > 32 ? s.slice(1) : s;

  var signatureBuffer = Buffer.alloc(64);
  // r/s bytelength could be < 32, in which case, zero padding needed
  signatureBuffer.set(Buffer.from(rToUse), 32 - rToUse.byteLength);
  signatureBuffer.set(Buffer.from(s), 64 - s.byteLength);
  return signatureBuffer;
}