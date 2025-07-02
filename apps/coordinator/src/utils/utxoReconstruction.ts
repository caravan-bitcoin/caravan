import { bitcoinsToSatoshis } from "@caravan/bitcoin";
import { TransactionDetails } from "@caravan/clients";
import { createInputIdentifier } from "./transactionCalculations";
import { Slice } from "selectors/wallet";

/**
 * # PURPOSE OF THIS FILE
 *
 * UTXO Reconstruction for Stateless Bitcoin Coordinators
 *
 * ## Background: The UTXO Visibility Problem in Stateless Coordinators
 *
 * Caravan operates as a stateless multisig coordinator, meaning it doesn't maintain
 * a persistent UTXO database like a full Bitcoin wallet would. This creates a unique
 * challenge during Replace-By-Fee (RBF) operations and other cases where we'll need to access previous UTXO's information:
 *
 * 1. **The Problem**: When a transaction is pending (unconfirmed), Bitcoin Core's
 *    `listunspent` will not return UTXOs that are consumed by that pending transaction.
 *    This prevents double-spending, but creates issues for RBF scenarios where we
 *    intentionally want to "double-spend" (replace) a pending transaction.
 *
 * 2. **Why This Affects Caravan**: Since Caravan doesn't track UTXO history locally,
 *    it relies on Bitcoin Core's `listunspent` to know what funds are available.
 *    When those UTXOs become "hidden" due to pending transactions, Caravan loses
 *    visibility into funds that should be available for RBF operations.
 *
 * 3. **Our Solution**: We reconstruct the "missing" UTXOs by analyzing pending
 *    transactions in our wallet, identifying what UTXOs they consumed, and rebuilding
 *    the full UTXO details needed for PSBT signing.
 *
 * This approach allows Caravan to maintain its stateless architecture while still
 * supporting advanced Bitcoin features like RBF.
 */

export interface ReconstructedUtxos {
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
 * Derives a list of transaction IDs that are required to reconstruct specific UTXOs.
 *
 * This utility scans through a set of unconfirmed (pending) transactions and identifies
 * which of their inputs correspond to UTXOs we are attempting to reconstruct. It then
 * extracts the unique `txid`s associated with those relevant inputs.
 *
 * This step is useful when we need to selectively fetch original transaction data
 * (e.g., from a Bitcoin node) for only the inputs that matter to our PSBT reconstruction.
 *
 * @param pendingTransactions - Array of pending wallet transactions (unconfirmed).
 * @param neededInputIds - Set of input identifiers (in `txid:vout` format) that need reconstruction.
 * @returns Array of unique transaction IDs (`txid`s) required for reconstruction.
 */
export function extractNeededTransactionIds(
  pendingTransactions: TransactionDetails[],
  neededInputIds: Set<string>,
): string[] {
  // Set used to track unique txids of interest
  const txidSet = new Set<string>(
    pendingTransactions.flatMap((tx) => {
      if (!Array.isArray(tx.vin)) return [];

      return (
        tx.vin
          // we only keep entries with both txid & vout
          .filter((input) => !!input.txid && input.vout !== undefined)
          // we only keep those tx's whose "txid:vout" is in the needed set
          .filter((input) =>
            neededInputIds.has(createInputIdentifier(input.txid!, input.vout!)),
          )
          .map((input) => input.txid!)
      );
    }),
  );

  return Array.from(txidSet);
}
/**
 * Utility function that reconstructs a single UTXO from transaction data.
 *
 * This function inspects a transaction's outputs to locate the one referenced
 * by `input`, verifies ownership against provided wallet slices, and constructs a
 * fully‑formed UTXO object ready for PSBT signing.
 *
 * @param input - The transaction input that consumed the UTXO
 * @param originalTransaction - The transaction that created the UTXO
 * @param originalTransactionHex - Raw hex of the transaction (needed for signing)
 * @param walletSlices - All wallet addresses to verify ownership
 * @returns Reconstructed UTXO object or null if not owned by wallet
 */
function reconstructSingleUtxo(
  input: { txid: string; vout: number },
  originalTransaction: TransactionDetails,
  originalTransactionHex: string,
  walletSlices: Slice[],
) {
  // Step 1: Find the specific output of the transaction that became our UTXO.
  // This is the output that was consumed by a pending transaction we're trying to replace (fee-bump).
  const originalOutput = originalTransaction.vout?.[input.vout];
  if (!originalOutput) {
    console.warn(`Output ${input.vout} not found in transaction ${input.txid}`);
    return null;
  }

  // Step 2: Extract the receiving address for that output.
  // This lets us determine if the UTXO actually belonged to one of our wallet addresses.
  const address =
    originalOutput.scriptPubkeyAddress || originalOutput.scriptPubkey;
  if (!address) {
    console.warn(`No address found for ${input.txid}:${input.vout}`);
    return null;
  }
  //  Check if that address is owned by any of our wallet slices.
  const walletSliceForThisAddress = walletSlices.find(
    (slice) => slice.multisig?.address === address,
  );

  if (!walletSliceForThisAddress) {
    // If not, we skip it — it's not part of our wallet.
    return null;
  }

  // Step 3: Build the reconstructed UTXO with all properties needed for signing
  return {
    // Basic UTXO properties
    txid: input.txid,
    index: input.vout,
    amountSats: bitcoinsToSatoshis(originalOutput.value.toString()),
    amount: originalOutput.value.toString(),
    confirmed: originalTransaction.status?.confirmed || false,
    transactionHex: originalTransactionHex,

    // Wallet-specific
    multisig: walletSliceForThisAddress.multisig,
    bip32Path: walletSliceForThisAddress.bip32Path,
    change: walletSliceForThisAddress.change,

    // Metadata for debugging/tracking
    _source: "pending_transaction_reconstruction" as const,
  };
}

/**
 * Orchestrates UTXO reconstruction from provided pending transactions.
 *
 * Given a set of known pending wallet transactions, this function attempts to
 * rebuild any UTXOs referenced by the input PSBT but hidden due to Bitcoin Core’s
 * behavior with unconfirmed outputs.
 *
 * Steps:
 * 1. Iterate over pending transactions and their inputs.
 * 2. Match inputs against the set of UTXO identifiers we care about.
 * 3. For each match, fetch the original transaction that created the UTXO.
 * 4. Use `reconstructSingleUtxo()` to rebuild a usable UTXO object.
 *
 * @param pendingTransactions - Unconfirmed transactions from our wallet (used as data source).
 * @param originalTxLookup - Lookup map of txid → original transaction and hex data.
 * @param allSlices - Wallet metadata (used to verify ownership of reconstructed UTXOs).
 * @param neededInputIds - Set of UTXO input IDs (txid:vout) we want to reconstruct.
 *
 * @throws {Error} When network is unavailable or reconstruction fails
 */
export function reconstructUtxosFromPendingTransactions(
  pendingTransactions: TransactionDetails[],
  originalTxLookup: Map<
    string,
    { transaction: TransactionDetails; transactionHex: string }
  >,
  allSlices: Slice[],
  neededInputIds: Set<string>,
): ReconstructedUtxos[] {
  const reconstructedUtxos: ReconstructedUtxos[] = [];

  // Loop through each unconfirmed transaction
  for (const pendingTx of pendingTransactions) {
    if (!Array.isArray(pendingTx.vin)) continue;

    for (const input of pendingTx.vin) {
      if (!input.txid || input.vout === undefined) continue;

      const inputId = createInputIdentifier(input.txid, input.vout);
      // Only proceed if this input is one we're looking to reconstruct
      if (!neededInputIds.has(inputId)) continue;

      const originalTxData = originalTxLookup.get(input.txid);
      if (!originalTxData) continue;

      const utxo = reconstructSingleUtxo(
        { txid: input.txid, vout: input.vout },
        originalTxData.transaction,
        originalTxData.transactionHex,
        allSlices,
      );

      // Only include valid reconstructions
      if (utxo) {
        (utxo as any)._pendingTxid = pendingTx.txid;
        reconstructedUtxos.push(utxo as unknown as ReconstructedUtxos);
      }
    }
  }

  return reconstructedUtxos;
}
