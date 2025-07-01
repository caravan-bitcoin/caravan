import { networkData, Network, bitcoinsToSatoshis } from "@caravan/bitcoin";
import { BlockchainClient, TransactionDetails } from "@caravan/clients";
import {
  getPsbtVersionNumber,
  PsbtV2,
  autoLoadPSBT as psbtPackageAutoLoad,
} from "@caravan/psbt";
import { Psbt } from "bitcoinjs-lib-v6"; // Used this instead from caravan/psbt as `autoLoadPSBT` uses this Psbt Object
import { createInputIdentifier } from "./transactionCalculations";

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

interface ReconstructedUtxos {
  txid: string;
  index: number;
  amountSats: string;
  amount: string;
  confirmed: boolean;
  transactionHex: any;
  multisig: any;
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
  spendableSlices: Slice[],
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
    Object.entries(slice.utxos || {}).forEach(([, utxo]) => {
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

/**
 * Reconstructs UTXO details from pending transactions to enable RBF PSBT imports.
 *
 * ## Purpose
 * In Replace-By-Fee (RBF) scenarios, the wallet may attempt to create a new PSBT that
 * references UTXOs already consumed by a pending transaction. Since Bitcoin Core hides
 * such UTXOs from `listunspent`, they must be manually reconstructed for signing.
 *
 * ## The Root Problem: Bitcoin Core's UTXO Indexing
 *
 * Bitcoin Core's `listunspent` command is designed to prevent double-spending.
 * Once a UTXO appears in ANY transaction (even unconfirmed), `listunspent`
 * won't return it. This makes sense for preventing accidents, but creates
 * a problem for RBF scenarios where you WANT to reference "spent" UTXOs.
 *
 * Even with `include_unsafe=true`, Bitcoin Core won't give you UTXOs that
 * are already consumed by pending transactions.
 *
 * ## Our Approach
 * - Analyzes all pending wallet transactions to identify inputs they consumed.
 * - For each such input, traces back to the original transaction to retrieve full UTXO details.
 * - Matches UTXOs to the wallet’s known slices (addresses/paths) to confirm ownership.
 * - Returns fully reconstructed UTXO objects compatible with the signing pipeline.

 *
 * @param blockchainClient
 * @param allSlices - Every address in our wallet (needed to verify UTXO ownership)
 * @param neededInputIds - Specific UTXOs we're trying to reconstruct (from the PSBT)
 * @returns Promise resolving to array of reconstructed UTXO objects
 *
 * @throws {Error} When network is unavailable or reconstruction fails
 *
 * @example
 * ```ts
 * // Say we have pending transaction "def456" that consumed UTXO "abc123:0"
 * // Now we want to import an RBF PSBT that also references "abc123:0"
 *
 * const neededInputs = new Set(["abc123:0"]);
 * const reconstructed = await reconstructUtxosFromPendingTransactions(
 *   blockchainClient,
 *   allWalletSlices,
 *   neededInputs
 * );
 *
 * // Result: [{
 * //   txid: "abc123",
 * //   index: 0,
 * //   amount: "0.001",
 * //   multisig: {...},
 * //   bip32Path: "m/0/5",
 * //   _source: "pending_transaction",
 * //   _pendingTxid: "def456"
 * // }]
 * ```
 */
export async function reconstructUtxosFromPendingTransactions(
  blockchainClient: BlockchainClient,
  allSlices: Slice[],
  neededInputIds: Set<string>,
): Promise<ReconstructedUtxos[]> {
  if (!blockchainClient) {
    throw new Error("Blockchain client is required for UTXO reconstruction. ");
  }

  try {
    // =====================================================================
    // STEP 1: Identify Transactions Related to Our Wallet
    // =====================================================================
    //
    // Before we can analyze pending transactions, we need to know what
    // transactions our wallet has been involved with. We'll look at every
    // UTXO in our wallet and collect their transaction IDs.
    //
    // This will help us identify any pending transactions that may have consumed UTXOs we care about.
    //

    const walletTransactionIds = new Set<string>();
    for (const slice of allSlices) {
      slice.utxos?.forEach(
        (utxo) => utxo.txid && walletTransactionIds.add(utxo.txid),
      );
    }

    if (walletTransactionIds.size === 0) {
      return [];
    }

    // =====================================================================
    // STEP 2: Fetch Transaction Details
    // =====================================================================
    //
    // Now we fetch details for each transaction our wallet knows about.
    // We're looking for transactions that are still "pending" (unconfirmed)
    // because those are the ones that might have consumed UTXOs we need
    // to reconstruct.
    //
    const allTxs = await Promise.all(
      Array.from(walletTransactionIds).map(async (txid) => {
        try {
          return await blockchainClient.getTransaction(txid);
        } catch (e) {
          console.warn(`Unable to fetch transaction ${txid}: ${e.message}`);
          return null;
        }
      }),
    );

    const pendingTransactions = allTxs
      .filter((tx): tx is TransactionDetails => tx !== null)
      .filter((tx) => !tx.status?.confirmed);

    if (pendingTransactions.length === 0) {
      return [];
    }

    // =====================================================================
    // STEP 3: Analyze Pending Transactions
    // =====================================================================
    //
    // For each pending transaction, we examine its inputs to see what UTXOs it consumed.
    // If any of those consumed UTXOs match what our PSBT needs, we'll
    // reconstruct them.
    //

    const reconstructedUtxos: ReconstructedUtxos[] = [];

    for (const pendingTx of pendingTransactions) {
      try {
        // Get the full transaction details including input information
        const fullTransactionData = await blockchainClient.getTransaction(
          pendingTx.txid,
        );

        // Validate that this transaction has inputs to analyze
        if (
          !fullTransactionData.vin ||
          !Array.isArray(fullTransactionData.vin)
        ) {
          continue;
        }

        // =====================================================================
        // STEP 4: Examine Each Input
        // =====================================================================
        //
        // Each input in the pending transaction represents a UTXO that was
        // consumed. We'll check if any of these consumed UTXOs are ones that
        // our RBF PSBT wants to reference.
        //
        for (const input of fullTransactionData.vin) {
          // Basic validation - each input should reference a previous transaction
          if (!input.txid || input.vout === undefined) {
            continue;
          }

          // Create the identifier for this consumed UTXO
          const consumedUtxoId = createInputIdentifier(input.txid, input.vout);
          if (!neededInputIds.has(consumedUtxoId)) {
            // This UTXO was consumed by the pending transaction, but our PSBT
            // doesn't need it, so we skip it
            continue;
          }

          try {
            // =====================================================================
            // STEP 5: Reconstruct the Original UTXO
            // =====================================================================

            const [originalTransaction, originalTransactionHex] =
              await Promise.all([
                blockchainClient.getTransaction(input.txid),
                blockchainClient.getTransactionHex(input.txid),
              ]);

            // Find the specific output that became our UTXO
            const originalOutput = originalTransaction.vout?.[input.vout];
            if (!originalOutput) {
              console.warn(
                `Output ${input.vout} not found in transaction ${input.txid}`,
              );
              continue;
            }

            // Extract the address that received these funds
            const recipientAddress =
              originalOutput.scriptPubkeyAddress || originalOutput.scriptPubkey;
            if (!recipientAddress) {
              console.warn(
                `No address found for output ${input.txid}:${input.vout}`,
              );
              continue;
            }

            const walletSliceForThisAddress = allSlices.find(
              (slice) => slice.multisig?.address === recipientAddress,
            );

            if (!walletSliceForThisAddress) {
              continue;
            }

            const rebuiltUtxo = {
              // Basic UTXO properties
              txid: input.txid,
              index: input.vout,
              amountSats: bitcoinsToSatoshis(originalOutput.value.toString()),
              amount: originalOutput.value.toString(),
              confirmed: originalTransaction.status?.confirmed || false,
              transactionHex: originalTransactionHex,

              // Wallet-specific metadata (needed for signing)
              multisig: walletSliceForThisAddress.multisig,
              bip32Path: walletSliceForThisAddress.bip32Path,
              change: walletSliceForThisAddress.change,
            };

            reconstructedUtxos.push(rebuiltUtxo);
          } catch (e) {
            throw new Error(
              `Failed to reconstruct UTXO ${input.txid}:${input.vout}: ` +
                `${e.message}`,
            );
          }
        }
      } catch (e) {
        throw new Error(
          `Failed to analyze pending transaction ${pendingTx.txid}: ` +
            `${e.message}`,
        );
      }
    }

    return reconstructedUtxos;
  } catch (e) {
    throw new Error(
      `UTXO reconstruction failed: ${e.message}. ` +
        `This might indicate a network connectivity issue or blockchain client problem.`,
    );
  }
}
