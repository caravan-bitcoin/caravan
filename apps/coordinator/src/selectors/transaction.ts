import { reverseBuffer } from "bitcoinjs-lib/src/bufferutils";
import { Psbt } from "bitcoinjs-lib-v6";
import { createSelector } from "reselect";
import { validateMultisigPsbtSignature } from "@caravan/psbt";
import { getSpendableSlices } from "./wallet";
import {
  UTXO,
  Input,
  Slice,
  SignatureInfo,
  SignatureSet,
} from "utils/psbtUtils";

/**
 * Processes inputs from PSBT and matches them with wallet UTXOs.
 */
export const selectInputsFromPSBT = createSelector(
  // Need the state param as createSelector expects two args
  [getSpendableSlices, (state: any, psbt: Psbt) => psbt],
  (slices: any, psbt: Psbt) => {
    const createInputIdentifier = (txid: string, index: number) =>
      `${txid}:${index}`;

    const inputIdentifiers = new Set(
      psbt.txInputs.map((input) => {
        /*
         * All input TXIDs are expected to be in **big-endian**
         * format (human-readable format). Which we get from block explorers, wallets, APIs
         * But PSBTs will need txid to be in little-endian format to ensure compatibility with Bitcoin's
         * internal data structures and processing so here we convert the txid to little-endian format
         */
        const txid = reverseBuffer(input.hash).toString("hex");
        return createInputIdentifier(txid, input.index);
      }),
    );

    const inputs: Input[] = [];
    slices.forEach((slice: Slice & { utxos: UTXO }) => {
      Object.entries(slice.utxos).forEach(([, utxo]) => {
        const inputIdentifier = createInputIdentifier(utxo.txid, utxo.index);
        if (inputIdentifiers.has(inputIdentifier)) {
          const input = {
            ...utxo,
            multisig: slice.multisig,
            bip32Path: slice.bip32Path,
            change: slice.change,
          };
          inputs.push(input);
        }
      });
    });

    return inputs;
  },
);

/**
 * Maps extracted signature sets to Caravan's signature importer format.
 *
 * @param signatureSets - Signature sets from extractSignaturesFromPSBT
 * @returns Array formatted for Caravan's signature importers
 */
export const mapSignaturesToImporters = (signatureSets: SignatureSet[]) => {
  return signatureSets.map((sigSet, index) => ({
    importerNumber: index + 1, // As in Caravan we use 1-based indexing
    signatures: sigSet.signatures,
    publicKeys: sigSet.publicKeys,
    signerPubkey: sigSet.signerPubkey,
    finalized: true, // Mark as complete since we have all signatures
  }));
};

/**
 * Extracts signatures from a PSBT and organizes them by signer.
 *
 * @param  psbt - The PSBT object
 * @param  inputs - Array of input objects with multisig info
 * @param  outputs - Array of output objects
 * @param  network - Network (mainnet, testnet, etc.)
 * @returns  Array of signature sets, each containing signatures for all inputs
 */
export const extractSignaturesFromPSBT = (state: any, psbt: Psbt) => {
  // Get Inputs to extract Signature from
  const inputs = selectInputsFromPSBT(state, psbt);

  // Get all partial signatures from the PSBT
  // Each input in a PSBT can have multiple partial signatures (one per signer)
  const inputSignatures: SignatureInfo[][] = [];

  for (let inputIndex = 0; inputIndex < psbt.data.inputs.length; inputIndex++) {
    const input = psbt.data.inputs[inputIndex];
    const inputSigs: SignatureInfo[] = [];

    // So now , we Extract partial signatures from this input
    // As partialSig is an array of {pubkey: Buffer, signature: Buffer
    if (input.partialSig && input.partialSig.length > 0) {
      for (const partialSig of input.partialSig) {
        inputSigs.push({
          signature: partialSig.signature.toString("hex"),
          pubkey: partialSig.pubkey.toString("hex"),
          inputIndex,
        });
      }
    }

    inputSignatures.push(inputSigs);
  }

  // Now we need to group signatures by signer
  // In a multisig, each signer signs ALL inputs with the same key
  // So we group signatures that use the same public key across all inputs
  const signatureSets = groupSignaturesBySigner(psbt, inputSignatures, inputs);
  return signatureSets;
};

/**
 * Groups signatures by signer (same pubkey across all inputs = same signer).
 *
 * *Note* not a selector a plain util function
 *
 * @param  psbt - The PSBT object
 * @param  inputSignatures - Signatures organized by input
 * @param  inputs - Input objects for validation
 * @returns  Array of signature sets
 */
function groupSignaturesBySigner(
  psbt: Psbt,
  inputSignatures: SignatureInfo[][],
  inputs: Input[],
): SignatureSet[] {
  // Find all unique public keys across all inputs
  const allPubkeys = new Set<string>();
  inputSignatures.forEach((inputSigs) => {
    inputSigs.forEach((sig) => allPubkeys.add(sig.pubkey));
  });

  const signatureSets: SignatureSet[] = [];

  // For each unique pubkey, try to build a complete signature set
  for (const pubkey of allPubkeys) {
    const signatureSet: string[] = [];
    const publicKeySet: string[] = [];
    let isCompleteSet = true;

    // Check if this pubkey has signed ALL inputs
    for (let inputIndex = 0; inputIndex < inputs.length; inputIndex++) {
      const inputSigs = inputSignatures[inputIndex];
      const sigForThisPubkey = inputSigs.find((sig) => sig.pubkey === pubkey);

      if (sigForThisPubkey) {
        // Validate this signature to make sure it's correct
        try {
          const validatedPubkey = validateSignatureForInput(
            sigForThisPubkey.signature as Buffer,
            inputIndex,
            psbt,
            inputs,
          );

          if (validatedPubkey) {
            signatureSet.push(sigForThisPubkey.signature as string);
            publicKeySet.push(validatedPubkey);
          } else {
            console.warn(
              `❌ Invalid signature for input ${inputIndex}, pubkey ${pubkey}`,
            );
            isCompleteSet = false;
            break;
          }
        } catch (error) {
          console.warn(
            `❌ Error validating signature for input ${inputIndex}:`,
            error.message,
          );
          isCompleteSet = false;
          break;
        }
      } else {
        // This pubkey didn't sign this input, so it's not a complete set
        isCompleteSet = false;
        break;
      }
    }

    // Only add complete signature sets (where one signer signed ALL inputs)
    if (isCompleteSet && signatureSet.length === inputs.length) {
      signatureSets.push({
        signatures: signatureSet,
        publicKeys: publicKeySet,
        signerPubkey: pubkey,
      });
    }
  }

  return signatureSets;
}

/**
 * Validates a signature for a specific input.
 *
 * *Note* not a selector a plain util function
 *
 * @param signature - Hex-encoded signature
 * @param inputIndex - Index of the input being signed
 * @param originalPsbt - The original PSBT object we already have
 * @param inputs - All transaction inputs (for amountSats)
 * @returns The public key if valid, false if invalid
 */
function validateSignatureForInput(
  signature: Buffer,
  inputIndex: number,
  originalPsbt: Psbt,
  inputs: Input[],
): string | false {
  //  Handle empty signatures
  if (!signature || signature.length === 0) {
    return false;
  }

  const validatedPubkey = validateMultisigPsbtSignature(
    originalPsbt.toBase64(),
    inputIndex,
    signature,
    inputs[inputIndex].amountSats,
  ) as string | false;

  // Return the pubkey string or false
  return validatedPubkey;
}
