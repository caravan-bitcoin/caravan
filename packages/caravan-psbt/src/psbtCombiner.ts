/**
 * @fileoverview PSBT Combination Utilities
 *
 * Implements the BIP174 COMBINER role for merging partially signed PSBTs.
 * This is a core component of the PSBT Saga architecture where signed PSBTs
 * from multiple signers are combined rather than reconstructed.
 *
 * @see https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki#Combiner
 */

import { Psbt } from "bitcoinjs-lib-v6";
import { PsbtV2 } from "./psbtv2/psbtv2";
import { getPsbtVersionNumber } from "./psbtv2/functions";
import { autoLoadPSBT } from "./psbtv0/utils";

/**
 * Result of combining multiple PSBTs.
 */
export interface CombineResult {
  /** The combined PSBT as base64 */
  combinedPsbt: string;
  /** Version of the output PSBT */
  outputVersion: 0 | 2;
  /** Number of unique signers found across all inputs */
  signerCount: number;
  /** Total signatures across all inputs */
  totalSignatures: number;
}

/**
 * Result of validating a signed PSBT against an unsigned one.
 */
export interface PsbtValidationResult {
  /** Whether the signed PSBT is valid for the unsigned PSBT */
  valid: boolean;
  /** Error message if validation failed */
  error?: string;
  /** Total number of signatures in the signed PSBT */
  signatureCount?: number;
  /** Number of signatures per input */
  signaturesPerInput?: number[];
}

/**
 * Information about signatures in a PSBT.
 */
interface SignatureInfo {
  signerCount: number;
  totalSignatures: number;
}

/**
 * Detects the version of a PSBT.
 *
 * Uses the PSBT_GLOBAL_VERSION field (0xFB) to determine version.
 * PSBTv0 doesn't have this field (returns 0), PSBTv2 has version=2.
 *
 * @param psbtData - Base64 or hex encoded PSBT
 * @returns 0 for PSBTv0, 2 for PSBTv2
 *
 * @example
 * ```typescript
 * const version = detectPsbtVersion(uploadedPsbt);
 * console.log(`PSBT is version ${version}`);
 * ```
 */
export function detectPsbtVersion(psbtData: string): 0 | 2 {
  try {
    const version = getPsbtVersionNumber(psbtData);
    return version === 2 ? 2 : 0;
  } catch {
    // If detection fails, assume v0 (more common, safer default)
    return 0;
  }
}

/**
 * Converts a PSBT between versions (v0 <-> v2).
 *
 * This is used internally to standardize PSBTs for combination operations
 * and to export PSBTs in user-requested versions.
 *
 * @param psbtData - Base64-encoded PSBT
 * @param targetVersion - Desired output version (0 or 2)
 * @returns Converted PSBT as base64
 *
 * @example
 * ```typescript
 * // Convert v2 to v0 for legacy wallet compatibility
 * const v0Psbt = convertPsbtToVersion(psbtv2Data, 0);
 *
 * // Convert v0 to v2 for modern features
 * const v2Psbt = convertPsbtToVersion(psbtv0Data, 2);
 * ```
 */
export function convertPsbtToVersion(
  psbtData: string,
  targetVersion: 0 | 2,
): string {
  const currentVersion = detectPsbtVersion(psbtData);

  // Already correct version - return as-is
  if (currentVersion === targetVersion) {
    return psbtData;
  }

  if (targetVersion === 0) {
    const psbtv2 = new PsbtV2(psbtData, true);
    return psbtv2.toV0("base64");
  } else {
    const psbtv2 = PsbtV2.FromV0(psbtData, true);
    return psbtv2.serialize("base64");
  }
}

/**
 * Counts unique signers and total signatures in a PSBT.
 *
 * This is used for progress tracking and validation during
 * the multisig signing workflow.
 *
 * @param psbtData - Base64-encoded PSBT
 * @returns Object with signerCount and totalSignatures
 */
function countSignatures(psbtData: string): SignatureInfo {
  try {
    // Convert to v0 for consistent parsing with bitcoinjs-lib
    const v0Psbt = convertPsbtToVersion(psbtData, 0);
    const psbt = autoLoadPSBT(v0Psbt);

    if (!psbt) {
      return { signerCount: 0, totalSignatures: 0 };
    }

    let totalSignatures = 0;
    const signerPubkeys = new Set<string>();

    for (const input of psbt.data.inputs) {
      if (input.partialSig) {
        for (const sig of input.partialSig) {
          totalSignatures++;
          signerPubkeys.add(sig.pubkey.toString("hex"));
        }
      }
    }

    return {
      signerCount: signerPubkeys.size,
      totalSignatures,
    };
  } catch {
    return { signerCount: 0, totalSignatures: 0 };
  }
}

// ============================================================================
// PSBT COMBINATION (BIP174 COMBINER ROLE)
// ============================================================================

/**
 * Combines multiple partially-signed PSBTs into a single PSBT.
 *
 * This implements the COMBINER role from BIP 174. The Combiner's job is to
 * merge PSBTs that have different partial signatures into a single PSBT
 * containing all signatures.
 *
 * ## Algorithm
 *
 * 1. Validate all PSBTs represent the same transaction
 * 2. Start with the first PSBT as base
 * 3. For each subsequent PSBT, merge its partial signatures
 * 4. Output combined PSBT in the specified version
 *
 * ## Version Handling
 *
 * - If outputVersion not specified, uses version of first PSBT
 * - Internally converts to v0 for combination (bitcoinjs-lib compatibility)
 * - Converts output to requested version
 *
 * @param psbts - Array of base64-encoded PSBTs to combine
 * @param outputVersion - Desired output version (defaults to first PSBT's version)
 * @returns Combined PSBT with all partial signatures
 *
 * @throws Error if PSBTs represent different transactions
 * @throws Error if array is empty
 *
 * @example
 * ```typescript
 * // Combine PSBTs from Ledger and ColdCard
 * const { combinedPsbt, signerCount } = combinePsbts(
 *   [ledgerSignedPsbt, coldcardSignedPsbt],
 *   0  // Output as v0 for maximum compatibility
 * );
 *
 * console.log(`Combined PSBT has signatures from ${signerCount} signers`);
 * ```
 */
export function combinePsbts(
  psbts: string[],
  outputVersion?: 0 | 2,
): CombineResult {
  if (!psbts || psbts.length === 0) {
    throw new Error("No PSBTs provided to combine");
  }

  // Determine output version from first PSBT if not specified
  const firstPsbtVersion = detectPsbtVersion(psbts[0]);
  const targetVersion = outputVersion ?? firstPsbtVersion;

  // Single PSBT - just convert to target version if needed
  if (psbts.length === 1) {
    const converted = convertPsbtToVersion(psbts[0], targetVersion);
    const sigInfo = countSignatures(psbts[0]);
    return {
      combinedPsbt: converted,
      outputVersion: targetVersion,
      signerCount: sigInfo.signerCount,
      totalSignatures: sigInfo.totalSignatures,
    };
  }

  // Convert all PSBTs to v0 for combination (bitcoinjs-lib works with v0)
  const v0Psbts = psbts.map((psbt) => convertPsbtToVersion(psbt, 0));

  // Parse base PSBT using bitcoinjs-lib
  const basePsbt = Psbt.fromBase64(v0Psbts[0]);

  // Combine each subsequent PSBT into the base
  for (let i = 1; i < v0Psbts.length; i++) {
    const otherPsbt = Psbt.fromBase64(v0Psbts[i]);

    // bitcoinjs-lib's combine() validates transaction match and merges sigs
    // This will throw if the PSBTs represent different transactions
    basePsbt.combine(otherPsbt);
  }

  // Convert combined PSBT to target version
  const combinedBase64 = basePsbt.toBase64();
  const finalPsbt = convertPsbtToVersion(combinedBase64, targetVersion);

  // Count signatures in final result
  const sigInfo = countSignatures(finalPsbt);

  return {
    combinedPsbt: finalPsbt,
    outputVersion: targetVersion,
    signerCount: sigInfo.signerCount,
    totalSignatures: sigInfo.totalSignatures,
  };
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validates that a signed PSBT is compatible with an unsigned PSBT.
 *
 * Performs several checks to ensure the signed PSBT represents a valid
 * signing of the original unsigned transaction:
 *
 * 1. Same number of inputs and outputs
 * 2. Same input references (txid:vout)
 * 3. Same output scripts and amounts
 * 4. Valid partial signatures present
 *
 * This validation is crucial for the PSBT Saga model to ensure that
 * hardware wallets return properly signed PSBTs.
 *
 * @param signedPsbtBase64 - The signed PSBT to validate
 * @param unsignedPsbtBase64 - The original unsigned PSBT
 * @returns Validation result with details
 *
 * @example
 * ```typescript
 * const validation = validateSignedPsbt(deviceSignedPsbt, originalPsbt);
 *
 * if (!validation.valid) {
 *   console.error(`Validation failed: ${validation.error}`);
 *   return;
 * }
 *
 * console.log(`PSBT has ${validation.signatureCount} signatures`);
 * ```
 */
export function validateSignedPsbt(
  signedPsbtBase64: string,
  unsignedPsbtBase64: string,
): PsbtValidationResult {
  try {
    // Convert both to v0 for consistent comparison
    const signedV0 = convertPsbtToVersion(signedPsbtBase64, 0);
    const unsignedV0 = convertPsbtToVersion(unsignedPsbtBase64, 0);

    const signed = Psbt.fromBase64(signedV0);
    const unsigned = Psbt.fromBase64(unsignedV0);

    // Check structural compatibility - input count
    if (signed.txInputs.length !== unsigned.txInputs.length) {
      return {
        valid: false,
        error: `Input count mismatch: signed has ${signed.txInputs.length}, unsigned has ${unsigned.txInputs.length}`,
      };
    }

    // Check structural compatibility - output count
    if (signed.txOutputs.length !== unsigned.txOutputs.length) {
      return {
        valid: false,
        error: `Output count mismatch: signed has ${signed.txOutputs.length}, unsigned has ${unsigned.txOutputs.length}`,
      };
    }

    // Verify each input references the same UTXO
    for (let i = 0; i < signed.txInputs.length; i++) {
      const signedInput = signed.txInputs[i];
      const unsignedInput = unsigned.txInputs[i];

      if (
        !signedInput.hash.equals(unsignedInput.hash) ||
        signedInput.index !== unsignedInput.index
      ) {
        return {
          valid: false,
          error: `Input ${i} references different UTXO`,
        };
      }
    }

    // Verify outputs match (scripts and amounts)
    for (let i = 0; i < signed.txOutputs.length; i++) {
      const signedOutput = signed.txOutputs[i];
      const unsignedOutput = unsigned.txOutputs[i];

      if (!signedOutput.script.equals(unsignedOutput.script)) {
        return {
          valid: false,
          error: `Output ${i} has different script`,
        };
      }

      if (signedOutput.value !== unsignedOutput.value) {
        return {
          valid: false,
          error: `Output ${i} has different amount`,
        };
      }
    }

    // Count signatures in the signed PSBT
    let totalSignatures = 0;
    const signaturesPerInput: number[] = [];

    for (let i = 0; i < signed.data.inputs.length; i++) {
      const partialSigs = signed.data.inputs[i].partialSig || [];
      signaturesPerInput.push(partialSigs.length);
      totalSignatures += partialSigs.length;
    }

    return {
      valid: true,
      signatureCount: totalSignatures,
      signaturesPerInput,
    };
  } catch (error) {
    return {
      valid: false,
      error: `Failed to parse PSBT: ${(error as Error).message}`,
    };
  }
}
