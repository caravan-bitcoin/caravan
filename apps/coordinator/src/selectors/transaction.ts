import { Psbt } from "bitcoinjs-lib-v6";
import { createSelector } from "reselect";
import { validateMultisigPsbtSignature } from "@caravan/psbt";
import {
  multisigPublicKeys,
  multisigRedeemScript,
  multisigWitnessScript,
  generateMultisigFromPublicKeys,
} from "@caravan/bitcoin";
import { getSpendableSlices, WalletState } from "./wallet";
import {
  UTXO,
  Input,
  Slice,
  SignatureInfo,
  SignatureSet,
  SignerIdentity,
  getSequenceForInput,
  getInputIdentifiersFromPsbt,
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

// ====================
// PSBT SCRIPT UTILITIES
// ====================

/**
 * Determines if a wallet input has a complete Caravan multisig object
 */
const hasCompleteMultisigData = (walletInput: Input): boolean => {
  return !!(walletInput?.multisig?.redeem && walletInput.multisig.address);
};

/**
 * Determines if a wallet input has raw multisig construction data
 */
const hasRawMultisigData = (walletInput: Input): boolean => {
  const { multisig } = walletInput;
  return !!(
    multisig?.addressType &&
    multisig.requiredSigners &&
    multisig.totalSigners &&
    multisig.publicKeys
  );
};

/**
 * Determines the address type from multisig name
 */
const getAddressTypeInfo = (multisigName: string) => ({
  isP2WSH: multisigName && multisigName.includes("p2wsh"),
  isP2SH:
    multisigName &&
    multisigName.includes("p2sh") &&
    !multisigName.includes("p2wsh"),
  isNestedSegwit:
    multisigName &&
    multisigName.includes("p2sh") &&
    multisigName.includes("p2wsh"),
});

/**
 * Adds scripts to a PSBT input using existing Caravan multisig data
 */
const addScriptsFromExistingMultisig = (
  psbtInput: any,
  multisig: any,
): void => {
  const { isP2WSH, isP2SH, isNestedSegwit } = getAddressTypeInfo(multisig.name);

  if (isP2WSH) {
    // Pure P2WSH: only witness script needed
    if (!psbtInput.witnessScript && multisig.redeem?.output) {
      psbtInput.witnessScript = multisig.redeem.output;
    }
    // Ensure we don't add redeemScript for pure P2WSH
    if (psbtInput.redeemScript) {
      delete psbtInput.redeemScript;
    }
    // Add BIP32 derivation data if missing
    if (
      (!psbtInput.bip32Derivation || psbtInput.bip32Derivation.length === 0) &&
      multisig.bip32Derivation?.length > 0
    ) {
      psbtInput.bip32Derivation = multisig.bip32Derivation;
    }
  } else if (isP2SH) {
    // Pure P2SH: only redeem script needed
    if (!psbtInput.redeemScript && multisig.redeem?.output) {
      psbtInput.redeemScript = multisig.redeem.output;
    }
  } else if (isNestedSegwit) {
    // P2SH-P2WSH: both scripts needed
    if (!psbtInput.redeemScript && multisig.output) {
      psbtInput.redeemScript = multisig.output; // The P2WSH output script
    }
    if (!psbtInput.witnessScript && multisig.redeem?.output) {
      psbtInput.witnessScript = multisig.redeem.output; // The actual multisig script
    }
  } else {
    // Fallback: try to determine from existing PSBT structure
    if (!psbtInput.redeemScript && multisig.redeem?.output) {
      psbtInput.redeemScript = multisig.redeem.output;
    }
    if (!psbtInput.witnessScript && multisig.redeem?.output) {
      psbtInput.witnessScript = multisig.redeem.output;
    }
  }
};

/**
 * Adds UTXO data to a PSBT input for signature validation
 */
const addUtxoData = (
  psbtInput: any,
  multisig: any,
  walletInput: Input,
): void => {
  if (psbtInput.witnessUtxo || psbtInput.nonWitnessUtxo) {
    return; // Already has UTXO data
  }

  const { isP2WSH, isNestedSegwit } = getAddressTypeInfo(multisig.name);

  if (isP2WSH || isNestedSegwit) {
    // For segwit inputs, add witnessUtxo
    psbtInput.witnessUtxo = {
      script: multisig.output, // This is the output script
      value: parseInt(walletInput.amountSats),
    };
  }
};

/**
 * Generates scripts from raw multisig data when existing scripts aren't available
 */
const generateScriptsFromRawData = (
  psbtInput: any,
  multisig: any,
  index: number,
): void => {
  try {
    const network = multisig.network || "testnet";
    const properMultisig = generateMultisigFromPublicKeys(
      network,
      multisig.addressType,
      multisig.requiredSigners,
      ...multisig.publicKeys,
    );

    if (!properMultisig) {
      return;
    }

    // Generate and add redeem script if missing
    if (!psbtInput.redeemScript) {
      try {
        const redeemScript = multisigRedeemScript(properMultisig);
        if (redeemScript?.output) {
          psbtInput.redeemScript = redeemScript.output;
        }
      } catch (redeemError) {
        console.log(
          `Input ${index}: Redeem script generation failed:`,
          redeemError.message,
        );
      }
    }

    // Generate and add witness script if missing
    if (!psbtInput.witnessScript) {
      try {
        const witnessScript = multisigWitnessScript(properMultisig);
        if (witnessScript?.output) {
          psbtInput.witnessScript = witnessScript.output;
        } else {
          console.log(`Input ${index}: Witness script generation failed`);
        }
      } catch (witnessError) {
        console.log(
          `Input ${index}: Witness script generation failed:`,
          witnessError.message,
        );
      }
    }
  } catch (multisigError) {
    console.log(
      `Input ${index}: Multisig generation error:`,
      multisigError.message,
    );
  }
};

/**
 * Processes a single PSBT input by adding missing script data
 */
const processSinglePsbtInput = (
  psbtInput: any,
  walletInput: Input,
  index: number,
): void => {
  if (!walletInput?.multisig) {
    return;
  }

  const { multisig } = walletInput;

  // Strategy 1: Use existing complete Caravan multisig data
  if (hasCompleteMultisigData(walletInput)) {
    addScriptsFromExistingMultisig(psbtInput, multisig);
    addUtxoData(psbtInput, multisig, walletInput);
    return;
  }

  // Strategy 2: Generate scripts from raw multisig data
  if (hasRawMultisigData(walletInput)) {
    generateScriptsFromRawData(psbtInput, multisig, index);
    return;
  }

  // If neither strategy works, log and continue
  console.log(
    `Input ${index}: Insufficient multisig data for script generation`,
  );
};

/**
 * Adds missing script data and UTXO information to a PSBT using wallet slice data.
 * This is particularly useful for PSBTs from SeedSigner which may not include
 * redeem scripts or witness scripts needed for signature validation.
 *
 * @param psbt - The PSBT to add script data to
 * @param inputs - Array of wallet inputs with complete multisig data
 * @returns A copy of the PSBT with script data and UTXO information added
 */
function addMissingScriptDataToPsbt(psbt: Psbt, inputs: Input[]): Psbt {
  // Create a copy to avoid mutating the original
  const psbtWithScripts = psbt.clone();

  // Process each input using the modular processing function
  psbtWithScripts.data.inputs.forEach((psbtInput, index) => {
    const walletInput = inputs[index];
    processSinglePsbtInput(psbtInput, walletInput, index);
  });

  return psbtWithScripts;
}

/**
 * Extract signatures from a PSBT using the wallet's UTXO information for context.
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

  // **STEP 0: Add missing script data from wallet slices**
  // This is especially important for PSBTs from SeedSigner which may not include
  // redeem scripts or witness scripts needed for signature validation.
  const psbtWithScripts = addMissingScriptDataToPsbt(psbt, inputs);

  // Get all partial signatures from the PSBT with script data
  // Each input in a PSBT can have multiple partial signatures (one per signer)
  const inputSignatures: SignatureInfo[] = [];

  for (
    let inputIndex = 0;
    inputIndex < psbtWithScripts.data.inputs.length;
    inputIndex++
  ) {
    const psbtInput = psbtWithScripts.data.inputs[inputIndex];
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
          psbtWithScripts,
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

export const selectInputIdentifiersFromPSBT = createSelector(
  [(state: WalletState, psbt: Psbt) => psbt],
  (psbt: Psbt) => getInputIdentifiersFromPsbt(psbt),
);

/**
 * Selector for "available inputs" from the unspent store
 * This is the first strategy - normal PSBT case where we get all the inputs we have in our wallet
 */
export const selectAvailableInputsFromPSBT = createSelector(
  [getSpendableSlices, (state: WalletState, psbt: Psbt) => psbt],
  (slices: any[], psbt: Psbt) => {
    const inputIdentifiers = getInputIdentifiersFromPsbt(psbt);
    const availableInputs: Input[] = [];
    slices.forEach((slice: Slice & { utxos: UTXO }) => {
      Object.entries(slice.utxos || {}).forEach(([, utxo]) => {
        const inputIdentifier = createInputIdentifier(utxo.txid, utxo.index);
        if (inputIdentifiers.has(inputIdentifier)) {
          const input = {
            ...utxo,
            multisig: slice.multisig,
            bip32Path: slice.bip32Path,
            change: slice.change,
            sequence: getSequenceForInput(psbt, inputIdentifier),
          };
          availableInputs.push(input);
        }
      });
    });
    return availableInputs;
  },
);

/**
 * Selector to find input identifiers that are missing from available wallet UTXOs.
 * These are inputs that the PSBT references but aren't currently visible in our
 * spendable slices (likely because they're consumed by pending transactions).
 *
 * This is used for RBF PSBT scenarios where we need to reconstruct UTXOs that
 * are "hidden" by pending transactions.
 *
 * @returns Set<string> of input identifiers (txid:index) that need reconstruction
 */
export const selectMissingInputIdentifiersFromPSBT = createSelector(
  [selectInputIdentifiersFromPSBT, selectAvailableInputsFromPSBT],
  (allRequiredInputIds: Set<string>, availableInputs: Input[]) => {
    const availableInputIds = new Set(
      availableInputs.map((input) =>
        createInputIdentifier(input.txid, input.index),
      ),
    );

    // Set difference: all required - available = missing
    return new Set(
      [...allRequiredInputIds].filter((id) => !availableInputIds.has(id)),
    );
  },
);

/**
 * Selector to extract signatures from PSBT
 */
export const selectSignaturesFromPSBT = createSelector(
  [selectAvailableInputsFromPSBT, (state: any, psbt: Psbt) => psbt],
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
