import { networkData, Network } from "@caravan/bitcoin";
import {
  getPsbtVersionNumber,
  PsbtV2,
  autoLoadPSBT as psbtPackageAutoLoad,
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
export interface SignatureInfo {
  signature: Buffer | string;
  pubkey: string;
  inputIndex: number;
  signerIndex?: number; // Which signer in the multisig (0, 1, 2, etc.)
  derivedPubkey: string; // The actual derived pubkey for this input
}

/**
 * Interface for signer identification across multiple inputs
 */
export interface SignerIdentity {
  signerIndex: number; // Position in the multisig setup (0, 1, 2, etc.)
  masterFingerprint?: string; // Master key fingerprint if available
  signatures: Buffer[] | string[]; // Signatures for each input (in order)
  publicKeys: string[]; // Derived pubkeys for each input (in order)
}

/**
 * Interface for signature sets grouped by signer
 */
export interface SignatureSet {
  signatures: Buffer[] | string[];
  publicKeys: string[];
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
