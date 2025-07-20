import { bitcoinsToSatoshis } from "@caravan/bitcoin";
import { TransactionDetails } from "@caravan/clients";
import { Slice } from "selectors/wallet";
import { createInputIdentifier, Input } from "./psbtUtils";

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
    return null;
  }

  // Step 2: Extract the receiving address for that output.
  // This lets us determine if the UTXO actually belonged to one of our wallet addresses.
  const address =
    originalOutput.scriptPubkeyAddress || originalOutput.scriptPubkey;
  if (!address) {
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
  neededInputIds: Set<string>, // Derived from the PSBT
): { reconstructedUtxos: ReconstructedUtxos[]; isRbf: boolean } {
  const reconstructedUtxos: ReconstructedUtxos[] = [];
  let isRbf = false;

  // Loop through each unconfirmed transaction
  for (const pendingTx of pendingTransactions) {
    if (!Array.isArray(pendingTx.vin)) continue;

    for (const input of pendingTx.vin) {
      // Basically in the PSBT we have the input that pendingTx was trying to spend
      // So we try to reconstruct that input
      if (!input.txid || input.vout === undefined) continue;

      const inputId = createInputIdentifier(input.txid, input.vout);
      // Only proceed if this input is one we're looking to reconstruct
      if (!neededInputIds.has(inputId)) continue;
      // Mark that at least one of our needed inputs was consumed by a pending tx
      isRbf = true;
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
        (utxo as any)._pendingTxid = pendingTx.txid; // So we get a PSBT we don't know which pendingTX is it trying to fee Bump
        reconstructedUtxos.push(utxo as unknown as ReconstructedUtxos);
      }
    }
  }

  return { reconstructedUtxos, isRbf };
}

/*
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
 * @param availableInputs - Already formatted inputs from wallet (from selectAvailableInputsFromPSBT)
 * @param reconstructedUtxos - UTXOs rebuilt from pending transactions (the RBF case)
 * @returns Complete array of inputs with all metadata needed for transaction signing
 */
export function matchPsbtInputsToUtxos(
  inputIdentifiers: Set<string>,
  availableInputs: Input[] = [],
  reconstructedUtxos: ReconstructedUtxos[] = [],
) {
  const matchedInputs: Input[] = [];
  const alreadyFoundInputs = new Set<string>();

  // =====================================================================
  // STRATEGY 1: The Happy Path - Use Already Available Inputs
  // =====================================================================
  //
  // This is where we handle normal PSBT imports. If you just created a PSBT
  // for a fresh transaction, all the UTXOs it references should be sitting
  // right here in your wallet's spendable slices.
  //
  //
  availableInputs.forEach((input) => {
    const utxoIdentifier = createInputIdentifier(input.txid, input.index);
    if (inputIdentifiers.has(utxoIdentifier)) {
      matchedInputs.push(input);
      alreadyFoundInputs.add(utxoIdentifier);
    }
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
