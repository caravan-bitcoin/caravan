import { bitcoinsToSatoshis } from "@caravan/bitcoin";
import { BlockchainClient, TransactionDetails } from "@caravan/clients";
import { createInputIdentifier } from "./transactionCalculations";
import { Slice } from "./psbtUtils";

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
export function reconstructSingleUtxo(
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
 * Analyzes a single pending transaction to find consumed UTXOs that we need to reconstruct.
 *
 * @param pendingTransaction - The pending transaction to analyze
 * @param neededInputIds - Set of UTXO IDs we're looking for (format: "txid:vout")
 * @returns Array of consumed UTXO references that match our needs
 */
export function findConsumedUtxosInTransaction(
  pending: TransactionDetails,
  neededInputIds: Set<string>,
): Array<{ txid: string; vout: number; pendingTxid: string }> {
  if (!Array.isArray(pending.vin)) return [];

  return pending.vin
    .filter((input) => input.txid && input.vout !== undefined)
    .map((input) => ({
      txid: input.txid!,
      vout: input.vout!,
      pendingTxid: pending.txid,
    }))
    .filter((ref) =>
      neededInputIds.has(createInputIdentifier(ref.txid, ref.vout)),
    );
}

/**
 * Orchestrates UTXO reconstruction from provided pending transactions.
 *
 * Given a set of known pending wallet transactions, this function attempts to
 * rebuild any UTXOs referenced by the input PSBT but hidden due to Bitcoin Core’s
 * behavior with unconfirmed outputs.
 *
 * Steps:
 * 1. Find relevant UTXOs consumed in the provided pending transactions.
 * 2. Fetch original transactions that created those UTXOs.
 * 3. Rebuild the UTXO data using `reconstructSingleUtxo()`
 *
 * @param pendingTransactions - Array of unconfirmed transactions from wallet
 * @param allSlices - Every address in our wallet (needed to verify UTXO ownership)
 * @param neededInputIds - Specific UTXOs we're trying to reconstruct (from the PSBT)
 * @param blockchainClient - Client for fetching original transaction details
 * @returns Promise resolving to array of reconstructed UTXO objects
 *
 * @throws {Error} When network is unavailable or reconstruction fails
 */
export async function reconstructUtxosFromPendingTransactions(
  pendingTransactions: TransactionDetails[],
  allSlices: Slice[],
  neededInputIds: Set<string>,
  blockchainClient: BlockchainClient,
): Promise<ReconstructedUtxos[]> {
  if (!blockchainClient) {
    throw new Error("Blockchain client is required for UTXO reconstruction.");
  }
  if (!pendingTransactions.length || !neededInputIds.size) {
    return [];
  }
  const reconstructedUtxos: ReconstructedUtxos[] = [];

  // Step 1: Firstly we Identify consumed UTXO references we need to rebuild
  // We analyze each pending transaction to identify which UTXOs it consumed.
  // We only care about UTXOs that we actually need.
  const allConsumedUtxos: Array<{
    txid: string;
    vout: number;
    pendingTxid: string;
  }> = [];

  for (const pendingTx of pendingTransactions) {
    const consumedInThisTx = findConsumedUtxosInTransaction(
      pendingTx,
      neededInputIds,
    );
    allConsumedUtxos.push(...consumedInThisTx);
  }

  if (allConsumedUtxos.length === 0) {
    return [];
  }

  // Step 2: Fetch original transaction details
  // For each consumed UTXO, we need to fetch the original transaction that
  // created it. This gives us the output details needed for reconstruction.
  const uniqueOriginalTxids = new Set(
    allConsumedUtxos.map((utxo) => utxo.txid),
  );
  const originalTransactionPromises = Array.from(uniqueOriginalTxids).map(
    async (txid) => {
      try {
        const [transaction, transactionHex] = await Promise.all([
          blockchainClient.getTransaction(txid),
          blockchainClient.getTransactionHex(txid),
        ]);
        return { txid, transaction, transactionHex };
      } catch (error) {
        console.warn(
          `Failed to fetch original transaction ${txid}: ${error.message}`,
        );
        return null;
      }
    },
  );

  const originalTransactions = (
    await Promise.all(originalTransactionPromises)
  ).filter((result): result is NonNullable<typeof result> => result !== null);
  // Create a lookup map for efficient access
  const originalTxLookup = new Map(
    originalTransactions.map(({ txid, transaction, transactionHex }) => [
      txid,
      { transaction, transactionHex },
    ]),
  );

  // Step 3: Attempt reconstruction of each consumed UTXO
  // Now we have all the data needed to reconstruct the UTXOs.
  // We use our utility function for the actual reconstruction logic.
  for (const consumedUtxo of allConsumedUtxos) {
    const originalTxData = originalTxLookup.get(consumedUtxo.txid);
    if (!originalTxData) {
      console.warn(
        `Could not find original transaction data for ${consumedUtxo.txid}, skipping UTXO reconstruction`,
      );
      continue;
    }

    const reconstructedUtxo = reconstructSingleUtxo(
      { txid: consumedUtxo.txid, vout: consumedUtxo.vout },
      originalTxData.transaction,
      originalTxData.transactionHex,
      allSlices,
    );

    if (reconstructedUtxo) {
      // Add metadata about which pending transaction consumed this UTXO
      (reconstructedUtxo as any)._pendingTxid = consumedUtxo.pendingTxid;
      reconstructedUtxos.push(reconstructedUtxo);
    }
  }
  return reconstructedUtxos;
}

/**
 * Convenience wrapper
 */
export async function reconstructUtxosForRbf(
  walletSlices: Slice[],
  neededInputIds: Set<string>,
  client: BlockchainClient,
  pendingTransactions: TransactionDetails[] = [],
): Promise<ReconstructedUtxos[]> {
  if (!pendingTransactions.length) {
    // If no pending transactions provided, return empty array
    // The caller should use usePendingTransactions() to get them
    console.warn(
      "No pending transactions provided. Use usePendingTransactions().",
    );
    return [];
  }
  return reconstructUtxosFromPendingTransactions(
    pendingTransactions,
    walletSlices,
    neededInputIds,
    client,
  );
}
