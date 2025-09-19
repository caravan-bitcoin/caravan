import {
  networkData,
  Network,
  multisigPublicKeys,
  multisigRedeemScript,
  multisigWitnessScript,
  generateMultisigFromPublicKeys,
} from "@caravan/bitcoin";
import {
  getPsbtVersionNumber,
  PsbtV2,
  autoLoadPSBT as psbtPackageAutoLoad,
  validateMultisigPsbtSignature,
} from "@caravan/psbt";
import { Psbt } from "bitcoinjs-lib-v6"; // Used this instead from caravan/psbt as `autoLoadPSBT` uses this Psbt Object
import { PsbtInput } from "bip174/src/lib/interfaces.js"; // Import the official PSBT input type
import { reverseBuffer } from "bitcoinjs-lib/src/bufferutils";

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
export interface SignatureInfo {
  signature: Buffer | string;
  pubkey: string;
  inputIndex: number;
  signerIndex?: number; // Which signer in the multisig (0, 1, 2, etc.)
  masterFingerprint?: string; // XFP of the signer for stable identity across inputs
  derivedPubkey: string; // The actual derived pubkey for this input
}

/**
 * Interface for signer identification across multiple inputs
 */
export interface SignerIdentity {
  signerIndex?: number; // Position in the multisig setup (0, 1, 2, etc.)
  masterFingerprint?: string; // Master key fingerprint if available
  signatures: Buffer[] | string[]; // Signatures for each input (in order)
  publicKeys: string[]; // Derived pubkeys for each input (in order)
}

/**
 * Interface for signature sets grouped by signer
 */
export interface SignatureSet {
  signatures: (Buffer | string | null)[];
  publicKeys: (string | null)[];
}

/**
 * Represents a Caravan multisig object with the properties we access
 */
export interface CaravanMultisig {
  name?: string;
  output?: Buffer;
  redeem?: {
    output?: Buffer;
  };
  bip32Derivation?: Array<{
    masterFingerprint: string;
    path: string;
    pubkey: Buffer;
  }>;
  // For raw multisig data generation
  network?: string;
  addressType?: string;
  requiredSigners?: number;
  totalSigners?: number;
  publicKeys?: string[];
}

/**
 * Converts transaction ID from big-endian to little-endian format
 */
export const convertTxidToLittleEndian = (hash: Buffer): string =>
  reverseBuffer(hash).toString("hex");

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

    if (version === 2) {
      const psbtv2 = new PsbtV2(psbtText, true); // Allow version 1 transactions if needed
      const psbtv0Base64 = psbtv2.toV0("base64");
      // Use the autoLoadPSBT from @caravan/psbt
      return psbtPackageAutoLoad(psbtv0Base64, options);
    }
    // It's a PSBTv0, use the autoLoadPSBT from @caravan/psbt
    const psbt = psbtPackageAutoLoad(psbtText, options);
    if (!psbt) {
      throw new Error("Could not parse PSBT. Invalid format.");
    }
    return psbt;
  } catch (e) {
    console.error("Error loading PSBT:", e);
    throw new Error(`Error loading PSBT: ${e.message}`);
  }
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
    return version === 2;
  } catch {
    return false;
  }
}

/**
 * Creates a unique identifier for a UTXO input by combining transaction ID and output index.
 *
 * This is used throughout the PSBT import process to match UTXOs across different data sources.
 * The format ensures we can easily compare inputs from PSBTs with UTXOs in our wallet state.
 *
 * @param txid - Transaction ID in big-endian (human-readable) format
 * @param index - Output index (vout) within the transaction
 * @returns Unique string identifier in format "txid:index"
 *
 * @example
 * ```ts
 * const id = createInputIdentifier("abc123...", 0); // "abc123...:0"
 * ```
 */
export const createInputIdentifier = (txid: string, index: number): string =>
  `${txid}:${index}`;

/**
 * Detects if content is a binary PSBT by checking magic bytes
 * @param arrayBuffer - The file content as ArrayBuffer
 * @returns boolean - True if binary PSBT, false otherwise
 */
export const isBinaryPSBT = (arrayBuffer: ArrayBuffer) => {
  const uint8Array = new Uint8Array(arrayBuffer);
  // Check for binary PSBT magic bytes (0x70736274ff)
  return (
    uint8Array.length >= 5 &&
    uint8Array[0] === 0x70 &&
    uint8Array[1] === 0x73 &&
    uint8Array[2] === 0x62 &&
    uint8Array[3] === 0x74 &&
    uint8Array[4] === 0xff
  );
};

/**
 * This is useful when we have an input for which we want to parse
 * what its sequence number is from a psbt. The identifier is used
 * to match against the input in the psbt and then we extract the sequence number
 * from the input.
 * @param psbt - The PSBT object
 * @param inputIdentifier - The input identifier to match against from the psbt
 * @returns The sequence number for the input
 */
export const getSequenceForInput = (
  psbt: Psbt,
  inputIdentifier: string,
): number | undefined => {
  return psbt.txInputs.find((input) => {
    const identifier = createInputIdentifier(
      convertTxidToLittleEndian(input.hash),
      input.index,
    );
    return identifier === inputIdentifier;
  })?.sequence;
};

export const getInputIdentifiersFromPsbt = (psbt: Psbt): Set<string> => {
  return new Set(
    psbt.txInputs.map((input) => {
      return createInputIdentifier(
        /*
         * All input TXIDs are expected to be in **big-endian**
         * format (human-readable format). Which we get from block explorers, wallets, APIs
         * But PSBTs will need txid to be in little-endian format to ensure compatibility with Bitcoin's
         * internal data structures and processing so here we convert the txid to little-endian format
         */
        convertTxidToLittleEndian(input.hash),
        input.index,
      );
    }),
  );
};

// ====================
// PSBT PROCESSING UTILITIES
// ====================

/**
 * Maps extracted signature sets to Caravan's signature importer format.
 *
 * @param signatureSets - Signature sets from extractSignaturesFromPSBT
 * @returns Array formatted for Caravan's signature importers
 */
export const mapSignaturesToImporters = (signatureSets: SignatureSet[]) => {
  return signatureSets.map((sigSet, index) => {
    const signatures = (sigSet.signatures || []).map((sig: any) => {
      if (!sig) return "";
      return typeof sig === "string" ? sig : sig.toString("hex");
    });
    const publicKeys = (sigSet.publicKeys || []).map((pk: any) => pk || "");
    return {
      importerNumber: index + 1, // 1-based indexing in UI
      signatures,
      publicKeys,
      finalized: true,
    };
  });
};

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
  psbtInput: PsbtInput,
  multisig: CaravanMultisig,
): void => {
  const { isP2WSH, isP2SH, isNestedSegwit } = getAddressTypeInfo(
    multisig.name || "",
  );

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
      multisig.bip32Derivation &&
      multisig.bip32Derivation.length > 0
    ) {
      // Convert string masterFingerprint to Buffer if needed
      psbtInput.bip32Derivation = multisig.bip32Derivation.map(
        (derivation) => ({
          ...derivation,
          masterFingerprint:
            typeof derivation.masterFingerprint === "string"
              ? Buffer.from(derivation.masterFingerprint, "hex")
              : derivation.masterFingerprint,
        }),
      );
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
  psbtInput: PsbtInput,
  multisig: CaravanMultisig,
  walletInput: Input,
): void => {
  if (psbtInput.witnessUtxo || psbtInput.nonWitnessUtxo) {
    return; // Already has UTXO data
  }

  const { isP2WSH, isNestedSegwit } = getAddressTypeInfo(multisig.name || "");

  if ((isP2WSH || isNestedSegwit) && multisig.output) {
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
  psbtInput: PsbtInput,
  multisig: CaravanMultisig,
  index: number,
): void => {
  try {
    const network = multisig.network || "testnet";
    const publicKeys = multisig.publicKeys || [];
    const properMultisig = generateMultisigFromPublicKeys(
      network,
      multisig.addressType,
      multisig.requiredSigners,
      ...publicKeys,
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
        throw new Error(
          `Input ${index}: Redeem script generation failed: ${redeemError.message}`,
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
          throw new Error(`Input ${index}: Witness script generation failed`);
        }
      } catch (witnessError) {
        throw new Error(
          `Input ${index}: Witness script generation failed: ${witnessError.message}`,
        );
      }
    }
  } catch (multisigError) {
    throw new Error(
      `Input ${index}: Multisig generation error: ${multisigError.message}`,
    );
  }
};

/**
 * Processes a single PSBT input by adding missing script data
 */
const processSinglePsbtInput = (
  psbtInput: PsbtInput,
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

  // If neither strategy works, throw an error
  throw new Error(
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
export function addMissingScriptDataToPsbt(psbt: Psbt, inputs: Input[]): Psbt {
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
 * Identifies which signer (by index in multisig) a given public key belongs to.
 *
 * This function derives the expected public keys for all signers at the given
 * input's derivation path and matches the provided pubkey to determine the signer.
 *
 * @param pubkey - The public key to identify
 * @param input - The input containing multisig and derivation information
 * @returns The signer index (0, 1, 2, etc.) or -1 if not found
 */
export function identifySignerFromPubkey(pubkey: string, input: Input): number {
  try {
    // Get all possible public keys for this input's derivation path
    const expectedPubkeys: string[] = multisigPublicKeys(input.multisig);
    // Find which signer this pubkey belongs to
    const signerIndex = expectedPubkeys.findIndex(
      (expectedPubkey: string) => expectedPubkey === pubkey,
    );

    return signerIndex;
  } catch (e) {
    throw new Error(
      `Error deriving pubkeys for input: ${e.message || "Unknown error"}`,
    );
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
export function groupSignaturesBySigner(
  inputSignatures: SignatureInfo[],
  inputs: Input[],
): Map<string, SignerIdentity> {
  const signerGroups = new Map<string, SignerIdentity>();

  // Now we group signatures by their signer index
  for (const sig of inputSignatures) {
    const { signerIndex, masterFingerprint, inputIndex, signature, pubkey } =
      sig;
    const key =
      masterFingerprint ||
      (signerIndex !== undefined ? `idx:${signerIndex}` : undefined);
    if (!key) continue;

    let signerGroup = signerGroups.get(key);
    if (!signerGroup) {
      signerGroup = {
        signerIndex,
        masterFingerprint,
        signatures: Array(inputs.length).fill(null),
        publicKeys: Array(inputs.length).fill(null),
      };
      signerGroups.set(key, signerGroup);
    }

    signerGroup.signatures[inputIndex] = signature;
    signerGroup.publicKeys[inputIndex] = pubkey;
  }

  // Now some filtering logic to only add complete signature sets (i.e signer signed ALL inputs)
  // Previously we filtered out incomplete signers. For partial uploads we
  // need to keep incomplete sets so they can be persisted and shown.
  return signerGroups;
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
export function validateSignatureForInput(
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

  // minimal: no debug noise in production

  for (
    let inputIndex = 0;
    inputIndex < psbtWithScripts.data.inputs.length;
    inputIndex++
  ) {
    const psbtInput = psbtWithScripts.data.inputs[inputIndex];
    const walletInput = inputs[inputIndex];

    //

    // Now we extract partial signatures from this PSBT input
    if (psbtInput.partialSig && psbtInput.partialSig.length > 0) {
      for (const partialSig of psbtInput.partialSig) {
        const signature = partialSig.signature.toString("hex");
        const pubkeyFromPsbt = partialSig.pubkey.toString("hex");

        // **STEP 1: Validate the signature**
        let validatedPubkey: string | false = false;
        try {
          validatedPubkey = validateSignatureForInput(
            partialSig.signature,
            inputIndex,
            psbtWithScripts,
            inputs,
          );
        } catch (e) {
          validatedPubkey = false;
        }

        if (!validatedPubkey) {
          continue;
        }

        // **STEP 2: Verify the pubkey matches what we expect**
        if (validatedPubkey !== pubkeyFromPsbt) {
          // still proceed with validated pubkey so we can persist signature
        }
        // **STEP 3: Determine signer identity (prefer master fingerprint if available)**
        const signerIndex = identifySignerFromPubkey(
          validatedPubkey,
          walletInput,
        );
        const xfp = walletInput?.multisig?.bip32Derivation?.[0]
          ?.masterFingerprint
          ? walletInput.multisig.bip32Derivation[0].masterFingerprint.toString(
              "hex",
            )
          : undefined;
        // if signer index not found, we still persist the signature via xfp grouping when available
        inputSignatures.push({
          signature,
          pubkey: pubkeyFromPsbt,
          inputIndex,
          signerIndex: signerIndex === -1 ? undefined : signerIndex,
          masterFingerprint: xfp,
          derivedPubkey: validatedPubkey,
        });
      }
    }
  }

  if (inputSignatures.length === 0) return [];

  // Now we need to group signatures by signer identity (not individual pubkeys)
  const signerGroups = groupSignaturesBySigner(inputSignatures, inputs);
  const signatureSets: SignatureSet[] = [];

  signerGroups.forEach((signerGroup) => {
    signatureSets.push({
      // Keep array shape aligned with inputs; allow nulls for missing
      signatures: signerGroup.signatures,
      publicKeys: signerGroup.publicKeys,
    });
  });
  return signatureSets;
};
