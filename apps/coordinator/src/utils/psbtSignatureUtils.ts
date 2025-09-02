import { loadPsbt, extractSignaturesFromPSBT } from "./psbtUtils";
import { Network } from "@caravan/bitcoin";
import type { Input } from "./psbtUtils";

/**
 * Extract signatures from PSBT data for signature import
 *
 * @param psbtData - PSBT data as hex string, base64, or Uint8Array
 * @param inputs - Array of transaction inputs with multisig info
 * @param network - Bitcoin network
 * @returns Array of signature hex strings in the format expected by validateAndSetSignature
 */
export function extractSignaturesFromPSBTData(
  psbtData: string | Uint8Array,
  inputs: Input[],
  network: Network,
): string[] {
  // Early validation - if no inputs, we can't do anything
  if (!inputs || inputs.length === 0) {
    return [];
  }

  // Convert psbtData to string format expected by loadPsbt (base64)
  let signedPSBTData: string;
  try {
    if (psbtData instanceof Uint8Array) {
      // Convert Uint8Array to base64 string
      let binaryString = "";
      for (let i = 0; i < psbtData.length; i++) {
        binaryString += String.fromCharCode(psbtData[i]);
      }
      signedPSBTData = btoa(binaryString);
    } else if (typeof psbtData === "string") {
      // Assume it's already in base64 format (from BCUR2Reader)
      signedPSBTData = psbtData;
    } else {
      throw new Error(
        `Invalid PSBT data type: expected string or Uint8Array, got ${typeof psbtData}`,
      );
    }
  } catch (error) {
    throw new Error(
      `Failed to process PSBT data: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  // Parse the PSBT using the converted string data
  const signedPsbt = loadPsbt(signedPSBTData, network);
  if (!signedPsbt) {
    throw new Error("Failed to parse PSBT data from QR code");
  }

  // Extract signatures using existing robust utility
  const signatureSets = extractSignaturesFromPSBT(signedPsbt, inputs);

  if (signatureSets.length === 0) {
    throw new Error("No signatures found in the PSBT");
  }

  // Convert to flat array format expected by validateAndSetSignature
  // Each signature set contains signatures for all inputs from one signer
  const allSignatures: string[] = [];

  signatureSets.forEach((signatureSet) => {
    // Convert Buffer signatures to hex strings if needed
    const hexSignatures = signatureSet.signatures.map((sig) =>
      typeof sig === "string" ? sig : sig.toString("hex"),
    );
    allSignatures.push(...hexSignatures);
  });

  if (allSignatures.length === 0) {
    throw new Error("No signatures could be extracted from the PSBT");
  }

  return allSignatures;
}
