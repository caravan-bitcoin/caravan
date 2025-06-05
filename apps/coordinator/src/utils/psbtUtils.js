import { networkData } from "@caravan/bitcoin";
import {
  getPsbtVersionNumber,
  PsbtV2,
  autoLoadPSBT as psbtPackageAutoLoad,
  validateMultisigPsbtSignature,
} from "@caravan/psbt";

/**
 * Loads a PSBT from a string or buffer, handling both PSBTv0 and PSBTv2 formats.
 * Uses only functionality from the @caravan/psbt package removing dependency on the outdated use of @caravan/bitcoin
 *
 * @param {string|Buffer} psbtText - The PSBT as a string or buffer
 * @param {string} network - The Bitcoin network (mainnet, testnet, etc.)
 * @returns {Object} The PSBT object compatible with bitcoinjs-lib
 * @throws {Error} If the PSBT cannot be parsed
 */
export function loadPsbt(psbtText, network) {
  const options = { network: networkData(network) };

  try {
    // Try to determine the PSBT version
    const version = getPsbtVersionNumber(psbtText);

    if (version >= 2) {
      // It's a PSBTv2, convert it to PSBTv0 format for compatibility
      console.log(
        `Detected PSBTv2 (version ${version}), converting to PSBTv0 format`,
      );
      try {
        const psbtv2 = new PsbtV2(psbtText, true); // Allow version 1 transactions if needed
        const psbtv0Base64 = psbtv2.toV0("base64");
        // Use the autoLoadPSBT from @caravan/psbt
        return psbtPackageAutoLoad(psbtv0Base64, options);
      } catch (e) {
        console.error("Failed to parse PSBTv2:", e);
        throw new Error(`Failed to parse PSBTv2: ${e.message}`);
      }
    } else {
      // It's a PSBTv0, use the autoLoadPSBT from @caravan/psbt
      const psbt = psbtPackageAutoLoad(psbtText, options);
      if (!psbt) {
        throw new Error("Could not parse PSBT. Invalid format.");
      }
      return psbt;
    }
  } catch (e) {
    console.error("Error loading PSBT:", e);
    throw new Error(`Error loading PSBT: ${e.message}`);
  }
}

/**
 * Extracts signatures from a PSBT and organizes them by signer.
 *
 * @param {Object} psbt - The PSBT object
 * @param {Array} inputs - Array of input objects with multisig info
 * @param {Array} outputs - Array of output objects
 * @param {string} network - Network (mainnet, testnet, etc.)
 * @returns {Array} Array of signature sets, each containing signatures for all inputs
 */
export function extractSignaturesFromPSBT(psbt, inputs) {
  // Get all partial signatures from the PSBT
  // Each input in a PSBT can have multiple partial signatures (one per signer)
  const inputSignatures = [];

  for (let inputIndex = 0; inputIndex < psbt.data.inputs.length; inputIndex++) {
    const input = psbt.data.inputs[inputIndex];
    const inputSigs = [];

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
}

/**
 * Groups signatures by signer (same pubkey across all inputs = same signer).
 *
 * @param {Object} psbt - The PSBT object
 * @param {Array} inputSignatures - Signatures organized by input
 * @param {Array} inputs - Input objects for validation
 * @param {Array} outputs - Output objects for validation
 * @param {string} network - Network for validation
 * @returns {Array} Array of signature sets
 */
function groupSignaturesBySigner(psbt, inputSignatures, inputs) {
  // Find all unique public keys across all inputs
  const allPubkeys = new Set();
  inputSignatures.forEach((inputSigs) => {
    inputSigs.forEach((sig) => allPubkeys.add(sig.pubkey));
  });

  const signatureSets = [];

  // For each unique pubkey, try to build a complete signature set
  for (const pubkey of allPubkeys) {
    const signatureSet = [];
    const publicKeySet = [];
    let isCompleteSet = true;

    // Check if this pubkey has signed ALL inputs
    for (let inputIndex = 0; inputIndex < inputs.length; inputIndex++) {
      const inputSigs = inputSignatures[inputIndex];
      const sigForThisPubkey = inputSigs.find((sig) => sig.pubkey === pubkey);

      if (sigForThisPubkey) {
        // Validate this signature to make sure it's correct
        try {
          const validatedPubkey = validateSignatureForInput(
            sigForThisPubkey.signature,
            inputIndex,
            psbt,
            inputs,
          );

          if (validatedPubkey) {
            signatureSet.push(sigForThisPubkey.signature);
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
 * @param {string} signature - Hex-encoded signature
 * @param {number} inputIndex - Index of the input being signed
 * @param {Object} originalPsbt - The original PSBT object we already have
 * @param {Array} inputs - All transaction inputs (for amountSats)
 * @returns {string|false} The public key if valid, false if invalid
 */
function validateSignatureForInput(
  signature,
  inputIndex,
  originalPsbt,
  inputs,
) {
  try {
    //  Handle empty signatures
    if (!signature || signature.length === 0) {
      return false;
    }

    const validatedPubkey = validateMultisigPsbtSignature(
      originalPsbt.toBase64(),
      inputIndex,
      signature,
      inputs[inputIndex].amountSats,
    );

    return validatedPubkey;
  } catch (error) {
    console.error(
      `❌ Signature validation failed for input ${inputIndex + 1}:`,
      error.message,
    );
  }
}

/**
 * Maps extracted signature sets to Caravan's signature importer format.
 *
 * @param {Array} signatureSets - Signature sets from extractSignaturesFromPSBT
 * @returns {Array} Array formatted for Caravan's signature importers
 */
export function mapSignaturesToImporters(signatureSets) {
  return signatureSets.map((sigSet, index) => ({
    importerNumber: index + 1, // As in Caravan we use 1-based indexing
    signatures: sigSet.signatures,
    publicKeys: sigSet.publicKeys,
    signerPubkey: sigSet.signerPubkey,
    finalized: true, // Mark as complete since we have all signatures
  }));
}

/**
 * Determines if a PSBT string/buffer is likely a PSBTv2.
 * This is a quick check without full parsing.
 *
 * @param {string|Buffer} psbtText - The PSBT data
 * @returns {boolean} True if likely PSBTv2, false otherwise
 */
export function isPsbtV2(psbtText) {
  try {
    const version = getPsbtVersionNumber(psbtText);
    return version >= 2;
  } catch {
    return false;
  }
}
