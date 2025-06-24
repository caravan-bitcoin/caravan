import { reverseBuffer } from "bitcoinjs-lib/src/bufferutils";
import { Psbt } from "bitcoinjs-lib-v6";
import { createSelector } from "reselect";
import { validateMultisigPsbtSignature } from "@caravan/psbt";
import { multisigPublicKeys } from "@caravan/bitcoin";
import { getSpendableSlices } from "./wallet";
import {
  UTXO,
  Input,
  Slice,
  SignatureInfo,
  SignatureSet,
  SignerIdentity,
} from "utils/psbtUtils";

// ====================
// UTILITY FUNCTIONS (Pure functions, no state dependency) we need then for our selectors to work nicely :)
// ====================

/**
 * Creates a unique identifier for a transaction input
 */
const createInputIdentifier = (txid: string, index: number): string =>
  `${txid}:${index}`;

/**
 * Converts transaction ID from big-endian to little-endian format
 */
const convertTxidToLittleEndian = (hash: Buffer): string =>
  reverseBuffer(hash).toString("hex");

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
    finalized: true, // Mark as complete since we have all signatures
  }));
};

/**
 * Extracts signatures from a PSBT and groups them by signer (not by individual child pubkeys).
 *
 * Instead of grouping by each unique derived pubkey, we now group signatures
 * by the actual signer (i.e., their position in the multisig setup). This fixes the issue where
 * the same signer ends up using different child pubkeys across inputs because of varying derivation paths.
 *
 * This way, we correctly associate all signatures from a single signer, even if their keys differ input-to-input.
 *
 * @param  psbt - The PSBT object
 * @param  inputs - Array of input objects with multisig info
 * @param  outputs - Array of output objects
 * @param  network - Network (mainnet, testnet, etc.)
 * @returns  Array of signature sets, each containing signatures for all inputs
 */
export const extractSignaturesFromPSBT = (psbt: Psbt, inputs: Input[]) => {
  if (inputs.length === 0) {
    throw new Error("No inputs found in PSBT that match wallet UTXOs");
  }

  // Get all partial signatures from the PSBT
  // Each input in a PSBT can have multiple partial signatures (one per signer)
  const inputSignatures: SignatureInfo[] = [];

  for (let inputIndex = 0; inputIndex < psbt.data.inputs.length; inputIndex++) {
    const psbtInput = psbt.data.inputs[inputIndex];
    const walletInput = inputs[inputIndex];

    // Now we extract partial signatures from this PSBT input
    if (psbtInput.partialSig && psbtInput.partialSig.length > 0) {
      for (const partialSig of psbtInput.partialSig) {
        const signature = partialSig.signature.toString("hex");
        const pubkeyFromPsbt = partialSig.pubkey.toString("hex");

        // **STEP 1: Validate the signature**
        const validatedPubkey = validateSignatureForInput(
          partialSig.signature,
          inputIndex,
          psbt,
          inputs,
        );

        if (!validatedPubkey) {
          throw new Error(
            `Invalid signature for input ${inputIndex}, pubkey ${pubkeyFromPsbt.slice(0, 16)}... `,
          );
        }

        // **STEP 2: Verify the pubkey matches what we expect**
        if (validatedPubkey !== pubkeyFromPsbt) {
          throw new Error(
            `⚠️ Validated pubkey ${validatedPubkey.slice(0, 16)}... doesn't match PSBT pubkey ${pubkeyFromPsbt.slice(0, 16)}... for input ${inputIndex}`,
          );
        }
        // **STEP 3: Determine which signer this validated pubkey belongs to**
        // Now here we determine which signer does this pubkey belongs to as we need it later to check if signer has signed all the inputs properly
        const signerIndex = identifySignerFromPubkey(
          validatedPubkey,
          walletInput,
        );
        if (signerIndex !== -1) {
          inputSignatures.push({
            signature,
            pubkey: pubkeyFromPsbt,
            inputIndex,
            signerIndex,
            derivedPubkey: validatedPubkey,
          });
        }
      }
    }
  }

  if (inputSignatures.length === 0) {
    return [];
  }

  // Now we need to group signatures by signer identity (not individual pubkeys)
  const signerGroups = groupSignaturesBySigner(inputSignatures, inputs);
  const signatureSets: SignatureSet[] = [];

  signerGroups.forEach((signerGroup) => {
    signatureSets.push({
      signatures: signerGroup.signatures,
      publicKeys: signerGroup.publicKeys,
    });
  });
  return signatureSets;
};

// ====================
// SELECTORS
// ====================

/**
 * Processes inputs from PSBT and matches them with wallet UTXOs.
 */
export const selectInputsFromPSBT = createSelector(
  // Need the state param as createSelector expects two args
  [getSpendableSlices, (state: any, psbt: Psbt) => psbt],
  (slices: any, psbt: Psbt) => {
    const inputIdentifiers = new Set(
      psbt.txInputs.map((input) =>
        /*
         * All input TXIDs are expected to be in **big-endian**
         * format (human-readable format). Which we get from block explorers, wallets, APIs
         * But PSBTs will need txid to be in little-endian format to ensure compatibility with Bitcoin's
         * internal data structures and processing so here we convert the txid to little-endian format
         */
        createInputIdentifier(
          convertTxidToLittleEndian(input.hash),
          input.index,
        ),
      ),
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
 * Selector to extract signatures from PSBT
 */
export const selectSignaturesFromPSBT = createSelector(
  [selectInputsFromPSBT, (state: any, psbt: Psbt) => psbt],
  (inputs, psbt) => extractSignaturesFromPSBT(psbt, inputs),
);

/**
 * Selector to get signatures formatted for importers
 */
export const selectSignaturesForImporters = createSelector(
  [selectSignaturesFromPSBT],
  (signatureSets) => mapSignaturesToImporters(signatureSets),
);

// ====================
// PRIVATE HELPER FUNCTIONS
// ====================

/**
 * Identifies which signer (by index in multisig) a given public key belongs to.
 *
 * This function derives the expected public keys for all signers at the given
 * input's derivation path and matches the provided pubkey to determine the signer.
 *
 * @param pubkey - The public key to identify
 * @param input - The input containing multisig and derivation information
 * @returns The signer index (0, 1, 2, etc.) or -1 if not found
 */
function identifySignerFromPubkey(pubkey: string, input: Input): number {
  try {
    // Get all possible public keys for this input's derivation path
    const expectedPubkeys: string[] = multisigPublicKeys(input.multisig);
    // Find which signer this pubkey belongs to
    const signerIndex = expectedPubkeys.findIndex(
      (expectedPubkey: string) => expectedPubkey === pubkey,
    );

    return signerIndex;
  } catch (e) {
    console.error(`Error deriving pubkeys for input:`, e);
    return -1;
  }
}

/**
 * Groups signatures by signer identity across all inputs.
 *
 * For each signer that has signed at least one input,
 * collect ALL their signatures across ALL inputs. A complete signature
 * set requires the signer to have signed every single input.
 *
 * @param  inputSignatures - Signatures with signer information
 * @param  inputs - Input objects for validation
 * @returns  Array of signature sets
 */
function groupSignaturesBySigner(
  inputSignatures: SignatureInfo[],
  inputs: Input[],
): Map<number, SignerIdentity> {
  const signerGroups = new Map<number, SignerIdentity>();

  // Now we group signatures by their signer index
  for (const sig of inputSignatures) {
    const { signerIndex, inputIndex, signature, pubkey } = sig;
    if (signerIndex === undefined) continue;

    let signerGroup = signerGroups.get(signerIndex);
    if (!signerGroup) {
      signerGroup = {
        signerIndex,
        signatures: Array(inputs.length).fill(null),
        publicKeys: Array(inputs.length).fill(null),
      };
      signerGroups.set(signerIndex, signerGroup);
    }

    signerGroup.signatures[inputIndex] = signature;
    signerGroup.publicKeys[inputIndex] = pubkey;
  }

  // Now some filtering logic to only add complete signature sets (i.e signer signed ALL inputs)
  const completeSigners = new Map<number, SignerIdentity>();

  signerGroups.forEach((signerGroup, signerIndex) => {
    const hasAllSignatures = signerGroup.signatures.every(
      (sig) => sig !== null,
    );
    const hasAllPubkeys = signerGroup.publicKeys.every((pk) => pk !== null);

    if (hasAllSignatures && hasAllPubkeys) {
      completeSigners.set(signerIndex, signerGroup);
    }
  });

  return completeSigners;
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
