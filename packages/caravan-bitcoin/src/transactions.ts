/**
 * This module provides functions for constructing and validating
 * multisig transactions.
 */

import BigNumber from "bignumber.js";
import assert from "assert";
import { Psbt, Transaction, script, payments } from "bitcoinjs-lib";
import { networkData } from "./networks";
import { P2SH_P2WSH } from "./p2sh_p2wsh";
import { P2WSH } from "./p2wsh";
import {
  multisigRequiredSigners,
  multisigPublicKeys,
  multisigAddressType,
  multisigRedeemScript,
  multisigWitnessScript,
  generateMultisigFromRaw,
} from "./multisig";
import {
  validateMultisigSignature,
  signatureNoSighashType,
} from "./signatures";
import { idToHash, validateMultisigInputs } from "./inputs";
import { validateOutputs } from "./outputs";
import { scriptToHex } from "./script";
import { psbtInputFormatter, psbtOutputFormatter } from "./psbt";
import { Braid } from "./braid";
import { ExtendedPublicKey } from "./keys";
import { toOutputScript } from "bitcoinjs-lib/src/address";


/**
 * Create an unsigned bitcoin transaction based on the network, inputs
 * and outputs.
 *
 * Returns a [`Transaction`]{@link https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/types/transaction.d.ts|Transaction} object from bitcoinjs-lib.
 */
export function unsignedMultisigTransaction(
  network,
  inputs,
  outputs,
): Transaction {
  const multisigInputError = validateMultisigInputs(inputs);
  assert(!multisigInputError.length, multisigInputError);
  const multisigOutputError = validateOutputs(network, outputs);
  assert(!multisigOutputError.length, multisigOutputError);

  const transactionBuilder = new Transaction();
  transactionBuilder.version = 1; // FIXME this depends on type...
  // transactionBuilder.network = networkData(network);
  for (let inputIndex = 0; inputIndex < inputs.length; inputIndex += 1) {
    const input = inputs[inputIndex];
    const inputHash = idToHash(input.txid);
    transactionBuilder.addInput(inputHash, input.index);
  }
  for (let outputIndex = 0; outputIndex < outputs.length; outputIndex += 1) {
    const output = outputs[outputIndex];
    const scriptPubKey = toOutputScript(output.address, networkData(network));
    transactionBuilder.addOutput(
      scriptPubKey,
      new BigNumber(output.amountSats).toNumber(),
    );
  }

  return transactionBuilder;
}

/**
 * Create an unsigned bitcoin transaction based on the network, inputs
 * and outputs stored as a PSBT object
 *
 * Returns a [`PSBT`]{@link https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/types/psbt.d.ts|PSBT} object from bitcoinjs-lib.
 */
export function unsignedMultisigPSBT(
  network,
  inputs,
  outputs,
  includeGlobalXpubs = false
) {
  const multisigInputError = validateMultisigInputs(inputs, true);
  assert(!multisigInputError.length, multisigInputError);
  const multisigOutputError = validateOutputs(network, outputs);
  assert(!multisigOutputError.length, multisigOutputError);

  const psbt = new Psbt({ network: networkData(network) });
  // FIXME: update fixtures with unsigned tx version 02000000 and proper signatures
  psbt.setVersion(1); // Our fixtures currently sign transactions with version 0x01000000
  const globalExtendedPublicKeys: ExtendedPublicKey[] = [];

  inputs.forEach((input) => {
    const formattedInput = psbtInputFormatter({ ...input });
    psbt.addInput(formattedInput);
    const braidDetails = input.multisig.braidDetails;
    if (braidDetails && includeGlobalXpubs) {
      const braid = Braid.fromData(JSON.parse(braidDetails));
      braid.extendedPublicKeys.forEach((extendedPublicKeyData) => {
        const extendedPublicKey = new ExtendedPublicKey(extendedPublicKeyData);

        const alreadyFound = globalExtendedPublicKeys.find(
          (existingExtendedPublicKey: any) =>
            existingExtendedPublicKey.toBase58() ===
            extendedPublicKey.toBase58()
        );

        if (!alreadyFound) {
          globalExtendedPublicKeys.push(extendedPublicKey);
        }
      });
    }
  });

  if (includeGlobalXpubs && globalExtendedPublicKeys.length > 0) {
    const globalXpubs = globalExtendedPublicKeys.map((extendedPublicKey) => ({
      extendedPubkey: extendedPublicKey.encode(),
      masterFingerprint: extendedPublicKey.rootFingerprint
        ? Buffer.from(extendedPublicKey.rootFingerprint, "hex")
        : Buffer.alloc(0),
      path: extendedPublicKey.path || "",
    }));
    psbt.updateGlobal({ globalXpub: globalXpubs });
  }

  const psbtOutputs = outputs.map((output) =>
    psbtOutputFormatter({ ...output })
  );
  psbt.addOutputs(psbtOutputs);
  const txn = psbt.data.globalMap.unsignedTx.toBuffer().toString("hex");

  return { ...psbt, txn };
}

/**
 * Returns an unsigned Transaction object from bitcoinjs-lib that is not
 * generated via the TransactionBuilder (deprecating soon)
 *
 * FIXME: try squat out old implementation with the new PSBT one and see if
 *   everything works (the tx is the same)
 */
export function unsignedTransactionObjectFromPSBT(psbt) {
  return Transaction.fromHex(psbt.txn);
}

/**
 * Create a fully signed multisig transaction based on the unsigned
 * transaction, inputs, and their signatures.
 */
export function signedMultisigTransaction(
  network: any,
  inputs: any[],
  outputs: any[],
  transactionSignatures?: string[][]
) {
  const unsignedTransaction = unsignedMultisigTransaction(
    network,
    inputs,
    outputs
  ); // validates inputs & outputs
  if (!transactionSignatures || transactionSignatures.length === 0) {
    throw new Error("At least one transaction signature is required.");
  }

  transactionSignatures.forEach(
    (transactionSignature, transactionSignatureIndex) => {
      if (transactionSignature.length < inputs.length) {
        throw new Error(
          `Insufficient input signatures for transaction signature ${
            transactionSignatureIndex + 1
          }: require ${inputs.length}, received ${transactionSignature.length}.`
        );
      }
    }
  );

  const signedTransaction = Transaction.fromHex(unsignedTransaction.toHex()); // FIXME inefficient?
  for (let inputIndex = 0; inputIndex < inputs.length; inputIndex++) {
    const input = inputs[inputIndex];

    const inputSignatures = transactionSignatures
      .map((transactionSignature) => transactionSignature[inputIndex])
      .filter((inputSignature) => Boolean(inputSignature));
    const requiredSignatures = multisigRequiredSigners(input.multisig);

    if (inputSignatures.length < requiredSignatures) {
      throw new Error(
        `Insufficient signatures for input  ${
          inputIndex + 1
        }: require ${requiredSignatures},  received ${inputSignatures.length}.`
      );
    }

    const inputSignaturesByPublicKey = {};
    inputSignatures.forEach((inputSignature) => {
      let publicKey;
      try {
        publicKey = validateMultisigSignature(
          network,
          inputs,
          outputs,
          inputIndex,
          inputSignature
        );
      } catch (e) {
        throw new Error(
          `Invalid signature for input ${
            inputIndex + 1
          }: ${inputSignature} (${e})`
        );
      }
      if (inputSignaturesByPublicKey[publicKey]) {
        throw new Error(
          `Duplicate signature for input ${inputIndex + 1}: ${inputSignature}`
        );
      }
      inputSignaturesByPublicKey[publicKey] = inputSignature;
    });

    // Sort the signatures for this input by the index of their
    // corresponding public key within this input's redeem script.
    const publicKeys = multisigPublicKeys(input.multisig);
    const sortedSignatures = publicKeys
      .map((publicKey) => inputSignaturesByPublicKey[publicKey])
      .filter((signature) =>
        signature ? signatureNoSighashType(signature) : signature
      ); // FIXME why not filter out the empty sigs?

    if (multisigAddressType(input.multisig) === P2WSH) {
      const witness = multisigWitnessField(input.multisig, sortedSignatures);
      signedTransaction.setWitness(inputIndex, witness);
    } else if (multisigAddressType(input.multisig) === P2SH_P2WSH) {
      const witness = multisigWitnessField(input.multisig, sortedSignatures);
      signedTransaction.setWitness(inputIndex, witness);
      const scriptSig = multisigRedeemScript(input.multisig);
      signedTransaction.ins[inputIndex].script = Buffer.from([
        scriptSig.output.length,
        ...scriptSig.output,
      ]);
    } else {
      const scriptSig = multisigScriptSig(input.multisig, sortedSignatures);
      signedTransaction.ins[inputIndex].script =
        scriptSig?.input ?? Buffer.alloc(0);
    }
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
  const witness = [""].concat(
    sortedSignatures.map((s) => signatureNoSighashType(s) + "01")
  );
  const witnessScript = multisigWitnessScript(multisig);
  witness.push(scriptToHex(witnessScript));
  return witness.map((wit) => Buffer.from(wit, "hex"));
}

function multisigScriptSig(multisig, signersInputSignatures) {
  const signatureOps = signersInputSignatures
    .map((signature) => `${signatureNoSighashType(signature)}01`)
    .join(" "); // 01 => SIGHASH_ALL
  const inputScript = `OP_0 ${signatureOps}`;
  const inputScriptBuffer = script.fromASM(inputScript);
  const rawMultisig = payments.p2ms({
    network: multisig.network,
    output: Buffer.from(multisigRedeemScript(multisig).output, "hex"),
    input: inputScriptBuffer,
  });
  return generateMultisigFromRaw(multisigAddressType(multisig), rawMultisig);
}
