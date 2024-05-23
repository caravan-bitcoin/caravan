/**
 * This module provides functions for validating and handling
 * multisig transaction signatures.
 */

import BigNumber from "bignumber.js";
import bip66 from "bip66";
import { ECPair, Transaction } from "bitcoinjs-lib-v5";

import { P2SH_P2WSH } from "./p2sh_p2wsh";
import { P2WSH } from "./p2wsh";
import {
  multisigAddressType,
  multisigRedeemScript,
  multisigWitnessScript,
  multisigPublicKeys,
  multisigTotalSigners,
} from "./multisig";
import { unsignedMultisigTransaction } from "./transactions";

/**
 * Validate a multisig signature for given input and public key.
 * NOTICE: DEPRECATED in favor of @caravan/psbt validateMultisigSignaturePsbt
 * as it uses the newer version of bitcoinjs-lib to support taproot outputs
 * and is generally more PSBT friendly.
 */
export function validateMultisigSignature(
  network,
  inputs,
  outputs,
  inputIndex,
  inputSignature,
) {
  const hash = multisigSignatureHash(network, inputs, outputs, inputIndex);
  const signatureBuffer = multisigSignatureBuffer(
    signatureNoSighashType(inputSignature),
  );
  const input = inputs[inputIndex];
  const publicKeys = multisigPublicKeys(input.multisig);
  for (
    let publicKeyIndex = 0;
    publicKeyIndex < multisigTotalSigners(input.multisig);
    publicKeyIndex++
  ) {
    const publicKey = publicKeys[publicKeyIndex];
    const publicKeyBuffer = Buffer.from(publicKey, "hex");
    if (isValidSignature(publicKeyBuffer, hash, signatureBuffer)) {
      return publicKey;
    }
  }
  return false;
}

/**
 * This function takes a DER encoded signature and returns it without the SIGHASH_BYTE
 */
export function signatureNoSighashType(signature) {
  const len = parseInt(signature.slice(2, 4), 16);
  if (len === (signature.length - 4) / 2) return signature;
  else return signature.slice(0, -2);
}

/**
 * Returns the multisig Signature Hash for an input at inputIndex
 * NOTICE: DEPRECATED in favor of @caravan/psbt getHashForSignature
 * as it uses the newer version of bitcoinjs-lib to support taproot outputs
 * and is generally more PSBT friendly.
 */
function multisigSignatureHash(network, inputs, outputs, inputIndex) {
  const unsignedTransaction = unsignedMultisigTransaction(
    network,
    inputs,
    outputs,
  );
  const input = inputs[inputIndex];
  if (
    multisigAddressType(input.multisig) === P2WSH ||
    multisigAddressType(input.multisig) === P2SH_P2WSH
  ) {
    return unsignedTransaction.hashForWitnessV0(
      inputIndex,
      multisigWitnessScript(input.multisig).output,
      new BigNumber(input.amountSats).toNumber(),
      Transaction.SIGHASH_ALL,
    );
  } else {
    return unsignedTransaction.hashForSignature(
      inputIndex,
      multisigRedeemScript(input.multisig).output,
      Transaction.SIGHASH_ALL,
    );
  }
}

/**
 * Create a signature buffer that can be passed to ECPair.verify
 */
export function multisigSignatureBuffer(signature) {
  const encodedSignerInputSignatureBuffer = Buffer.from(signature, "hex");
  const decodedSignerInputSignatureBuffer = bip66.decode(
    encodedSignerInputSignatureBuffer,
  );
  const { r, s } = decodedSignerInputSignatureBuffer;
  // The value returned from the decodedSignerInputSignatureBuffer has
  // a few edge cases that need to be handled properly. There exists a mismatch between the
  // DER serialization and the ECDSA requirements, namely:
  //   DER says that its highest bit states polarity (positive/negative)
  //   ECDSA says no negatives, only positives.
  // So in the case where DER would result in a negative, a one-byte 0x00 is added to the value
  // NOTE: this can happen on r and on S.

  // See https://transactionfee.info/charts/bitcoin-script-ecdsa-length/ for more information

  // Truncate the leading 0x00 if r or S is 33 bytes long
  const rToUse = r.byteLength > 32 ? r.slice(1) : r;
  // Technically, this could be done but extremely unlikely in the current era.
  // let sToUse = s.byteLength > 32 ? s.slice(1) : s;

  const signatureBuffer = Buffer.alloc(64);
  // r/s bytelength could be < 32, in which case, zero padding needed
  signatureBuffer.set(Buffer.from(rToUse), 32 - rToUse.byteLength);
  signatureBuffer.set(Buffer.from(s), 64 - s.byteLength);
  return signatureBuffer;
}

export const isValidSignature = (
  pubkey: Buffer,
  msghash: Buffer,
  signature: Buffer,
): boolean => ECPair.fromPublicKey(pubkey).verify(msghash, signature);
