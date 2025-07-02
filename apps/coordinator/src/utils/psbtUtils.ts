import { networkData, Network } from "@caravan/bitcoin";
import { SliceWithLastUsed } from "selectors/wallet";
import {
  getPsbtVersionNumber,
  PsbtV2,
  autoLoadPSBT as psbtPackageAutoLoad,
} from "@caravan/psbt";
import { Psbt } from "bitcoinjs-lib-v6"; // Used this instead from caravan/psbt as `autoLoadPSBT` uses this Psbt Object
import { createInputIdentifier } from "./transactionCalculations";
import { ReconstructedUtxos } from "./utxoReconstruction";
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
  utxos?: UTXO[];
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

/**
 * Matches a PSBT's required inputs to available UTXOs using a two-phase strategy.
 *
 * ## Context
 * When you import a normal PSBT, all the UTXOs it references should be sitting
 * in your wallet as "spendable" - meaning Bitcoin Core's `listunspent` can find them.
 *
 * But when you import an RBF (Replace-By-Fee) PSBT, those same UTXOs are now
 * "spent" in the original pending transaction, so `listunspent` won't return them.
 * Yet the RBF PSBT still needs to reference those exact same UTXOs ...
 *
 * ## Matching Strategy
 *
 * 1. **Spendable Path**:
 *    - Checks UTXOs from current wallet state (typically handles standard PSBTs).
 *
 * 2. **Reconstructed Path**:
 *    - Fallback if some inputs are not found in the wallet.
 *    - Matches against reconstructed UTXOs (from analyzing pending transactions).
 *    - Designed for RBF PSBTs where inputs are already marked as spent.
 *
 * @param inputIdentifiers - Set of "txid:index" strings that the PSBT requires
 * @param spendableSlices - Current UTXOs available in wallet (the normal case)
 * @param reconstructedUtxos - UTXOs rebuilt from pending transactions (the RBF case)
 * @returns Complete array of inputs with all metadata needed for transaction signing
 *
 * @example
 * ```ts
 * // For a normal PSBT - reconstructedUtxos will be empty
 * const normalInputs = matchPsbtInputsToUtxos(
 *   psbtInputIds,
 *   spendableSlices,
 *   [] // No reconstruction needed
 * );
 *
 * // For an RBF PSBT - might need both strategies
 * const rbfInputs = matchPsbtInputsToUtxos(
 *   psbtInputIds,
 *   spendableSlices,      // Might find some inputs here
 *   reconstructedUtxos    // Need to fill in the gaps with these
 * );
 * ```
 */
export function matchPsbtInputsToUtxos(
  inputIdentifiers: Set<string>,
  spendableSlices: SliceWithLastUsed[],
  reconstructedUtxos: ReconstructedUtxos[] = [],
) {
  const matchedInputs: Input[] = [];
  const alreadyFoundInputs = new Set<string>();

  // =====================================================================
  // STRATEGY 1: The Happy Path - Check Currently Spendable UTXOs
  // =====================================================================
  //
  // This is where we handle normal PSBT imports. If you just created a PSBT
  // for a fresh transaction, all the UTXOs it references should be sitting
  // right here in your wallet's spendable slices.
  //
  //
  spendableSlices.forEach((slice) => {
    Object.entries(slice || {}).forEach(([, utxo]) => {
      const utxoIdentifier = createInputIdentifier(utxo.txid, utxo.index);
      if (inputIdentifiers.has(utxoIdentifier)) {
        const input: Input = {
          ...utxo, // All the basic UTXO data (amount, txid, etc.)
          multisig: slice.multisig, // Multisig configuration for this address
          bip32Path: slice.bip32Path, // Derivation path (e.g., "m/0/5")
          change: slice.change, // Is this a change address?
        };

        matchedInputs.push(input);
        alreadyFoundInputs.add(utxoIdentifier);
      }
    });
  });

  // =====================================================================
  // STRATEGY 2: The RBF Path - Check Reconstructed UTXOs
  // =====================================================================
  //
  // This is where the magic happens for RBF PSBTs. If we get here, it means
  // Strategy 1 didn't find all the UTXOs the PSBT needs. That's a strong
  // indicator we're dealing with an RBF scenario.
  //
  // The reconstructed UTXOs come from analyzing pending transactions to
  // figure out "what UTXOs were consumed by that pending transaction that
  // this new RBF PSBT wants to replace" and also prevent user from reconstructing any UTXO's given in PSBT.
  //
  reconstructedUtxos.forEach((reconstructedUtxo) => {
    const utxoIdentifier = createInputIdentifier(
      reconstructedUtxo.txid,
      reconstructedUtxo.index,
    );

    // Two conditions must be met:
    // 1. The PSBT actually wants this UTXO
    // 2. We haven't already found it in Strategy 1 (avoid duplicates)
    const psbtWantsThis = inputIdentifiers.has(utxoIdentifier);
    const notAlreadyFound = !alreadyFoundInputs.has(utxoIdentifier);

    if (psbtWantsThis && notAlreadyFound) {
      // The reconstructed UTXO should already have all the wallet metadata
      // (multisig, bip32Path, etc.) from the reconstruction process.
      matchedInputs.push(reconstructedUtxo as Input);
      alreadyFoundInputs.add(utxoIdentifier);
    }
  });

  return matchedInputs;
}
