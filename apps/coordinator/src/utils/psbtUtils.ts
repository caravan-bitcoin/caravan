import { networkData, Network } from "@caravan/bitcoin";
import {
  getPsbtVersionNumber,
  PsbtV2,
  autoLoadPSBT as psbtPackageAutoLoad,
  validateMultisigPsbtSignature,
} from "@caravan/psbt";
import { Psbt } from "bitcoinjs-lib-v6"; // Used this instead from caravan/psbt as `autoLoadPSBT` uses this Psbt Object

/**
 * Interface for UTXO data structure (This one is how utxo's are stored in Redux)
 *  TO-DO: Make all the various UTXO types we have in @caravan/client and @caravan/fees in sync
 */
export interface UTXO {
  confirmed: boolean;
  txid: string;
  index: number;
  amount: string;
  amountSats: string;
  transactionHex: string;
  time: number;
  change: boolean;
  spend: boolean;
  fetchedUTXOs: boolean;
  fetchUTXOsError: string;
  addressUsed: boolean;
  addressKnown: boolean;
}

/**
 * Interface for slice data structure
 */
export interface Slice {
  multisig: any; // Type this more specifically based on our multisig structure
  bip32Path: string;
  change: boolean;
}

/**
 * Interface for input objects with multisig information
 */
export interface Input extends UTXO {
  multisig: Slice["multisig"]; // From slice.multisig
  bip32Path: Slice["bip32Path"]; // From slice.bip32Path
}

/**
 * Interface for signature information extracted from PSBT
 */
interface SignatureInfo {
  signature: Buffer | string;
  pubkey: string;
  inputIndex: number;
}

/**
 * Interface for signature sets grouped by signer
 */
interface SignatureSet {
  signatures: Buffer[] | string[];
  publicKeys: string[];
  signerPubkey: string;
}

/**
 * Loads a PSBT from a string or buffer, handling both PSBTv0 and PSBTv2 formats.
 * Uses only functionality from the @caravan/psbt package removing dependency on the outdated use of @caravan/bitcoin
 *
 * @param psbtText - The PSBT as a string or buffer
 * @param network - The Bitcoin network (mainnet, testnet, etc.)
 * @returns The PSBT object compatible with bitcoinjs-lib
 * @throws Error if the PSBT cannot be parsed
 */
export function loadPsbt(
  psbtText: string | Buffer,
  network: Network,
): Psbt | null {
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
 * @param  psbt - The PSBT object
 * @param  inputs - Array of input objects with multisig info
 * @param  outputs - Array of output objects
 * @param  network - Network (mainnet, testnet, etc.)
 * @returns  Array of signature sets, each containing signatures for all inputs
 */
export function extractSignaturesFromPSBT(psbt: Psbt, inputs: Input[]) {
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
}

/**
 * Groups signatures by signer (same pubkey across all inputs = same signer).
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

    // Handle the case where validateMultisigPsbtSignature returns boolean true
    // Convert true to false since we only want string (pubkey) or false
    if (validatedPubkey === true) {
      console.warn(
        `Signature validation returned true but expected pubkey string for input ${inputIndex}`,
      );
      return false;
    }
    // Return the pubkey string or false
    return validatedPubkey;
  } catch (error) {
    console.error(
      `❌ Signature validation failed for input ${inputIndex + 1}:`,
      error.message,
    );
    return false;
  }
}

/**
 * Maps extracted signature sets to Caravan's signature importer format.
 *
 * @param signatureSets - Signature sets from extractSignaturesFromPSBT
 * @returns Array formatted for Caravan's signature importers
 */
export function mapSignaturesToImporters(signatureSets: SignatureSet[]) {
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
export function isPsbtV2(psbtText: string | Buffer): boolean {
  try {
    const version = getPsbtVersionNumber(psbtText);
    return version >= 2;
  } catch {
    return false;
  }
}
