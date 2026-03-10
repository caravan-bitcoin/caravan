import { bitcoinsToSatoshis, MultisigAddressType } from "@caravan/bitcoin";
import { TransactionDetails } from "@caravan/clients";
import { UTXO } from "@caravan/transactions";
import { Slice } from "selectors/wallet";
import { Coin } from "clients/transactions";
import { getUtxoFromCoin } from "hooks/utxos";
import { createInputIdentifier, Input } from "./psbtUtils";

/**
 * # PURPOSE OF THIS FILE
 *
 * coin Reconstruction for Stateless Bitcoin Coordinators
 *
 * ## Background: The coin Visibility Problem in Stateless Coordinators
 *
 * Caravan operates as a stateless multisig coordinator, meaning it doesn't maintain
 * a persistent coin database like a full Bitcoin wallet would. This creates a unique
 * challenge during Replace-By-Fee (RBF) operations and other cases where we'll need to access previous coin's information:
 *
 * 1. **The Problem**: When a transaction is pending (unconfirmed), Bitcoin Core's
 *    `listunspent` will not return coins that are consumed by that pending transaction.
 *    This prevents double-spending, but creates issues for RBF scenarios where we
 *    intentionally want to "double-spend" (replace) a pending transaction.
 *
 * 2. **Why This Affects Caravan**: Since Caravan doesn't track coin history locally,
 *    it relies on Bitcoin Core's `listunspent` to know what funds are available.
 *    When those coins become "hidden" due to pending transactions, Caravan loses
 *    visibility into funds that should be available for RBF operations.
 *
 * 3. **Our Solution**: We reconstruct the "missing" coins by analyzing pending
 *    transactions in our wallet, identifying what coins they consumed, and rebuilding
 *    the full coin details needed for PSBT signing.
 *
 * This approach allows Caravan to maintain its stateless architecture while still
 * supporting advanced Bitcoin features like RBF.
 */

/**
 * Unified type that serves both as a Coin representation and contains
 * all the metadata required to be transformed into a spendable UTXO.
 */
export interface ReconstructedCoin {
  txid: string;
  vout: number;
  value: string;  // amount in satoshis
  prevTxHex: string;
  address: string;
  confirmed: boolean;

  // Metadata extracted from Slice for PSBT signing
  bip32Derivations: any[];
  addressType: MultisigAddressType;
  redeemScript: string;
  witnessScript: string;

  // Metadata for UI/Tracking
  bip32Path: string;
  change: boolean;
  _pendingTxid?: string; // Internal flag to track which pending tx consumed this
}

/**
 * Derives a list of transaction IDs that are required to reconstruct specific coins.
 *
 * This utility scans through a set of unconfirmed (pending) transactions and identifies
 * which of their inputs correspond to coins we are attempting to reconstruct. It then
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
  const txidSet = new Set<string>(
    pendingTransactions.flatMap((tx) => {
      if (!Array.isArray(tx.vin)) return [];

      return tx.vin
        .filter((input) => !!input.txid && input.vout !== undefined)
        .filter((input) =>
          neededInputIds.has(createInputIdentifier(input.txid!, input.vout!)),
        )
        .map((input) => input.txid!);
    }),
  );
  return Array.from(txidSet);
}

/**
 * Utility function that reconstructs a single coin from transaction data.
 *
 * This function inspects a transaction's outputs to locate the one referenced
 * by `input`, verifies ownership against provided wallet slices, and constructs a
 * fully‑formed coin object ready for PSBT signing.
 *
 * @param input - The transaction input that consumed the coin
 * @param originalTransaction - The transaction that created the coin
 * @param originalTransactionHex - Raw hex of the transaction (needed for signing)
 * @param walletSlices - All wallet addresses to verify ownership
 * @returns Reconstructed coin object or null if not owned by wallet
 */


function reconstructSingleCoin(
  input: { 
    txid: string; 
    vout: number 
  },
  originalTransaction: TransactionDetails,
  originalTransactionHex: string,
  walletSlices: Slice[],
) {
  // Step 1: Find the specific output of the transaction that became our coin.
  // This is the output that was consumed by a pending transaction we're trying to replace (fee-bump).
  const originalOutput = originalTransaction.vout?.[input.vout];
  if (!originalOutput) {
    return null;
  }

  // Step 2: Extract the receiving address for that output.
  // This lets us determine if the coin actually belonged to one of our wallet addresses.
  const address =
    originalOutput.scriptPubkeyAddress || originalOutput.scriptPubkey;
  if (!address) {
    return null;
  }
  //  Check if that address is owned by any of our wallet slices.
  const slice = walletSlices.find(
    (s) => s.multisig?.address === address,
  );

  if (!slice || !slice.multisig) {
    // If not, we skip it — it's not part of our wallet.
    return null;
  }

  // Step 3: Extract Braid details (e.g., P2SH, P2WSH) to determine signing logic
  const { addressType }: { addressType: MultisigAddressType } = JSON.parse(
    slice.multisig.braidDetails
  )

  // Step 4: Build the reconstructed coin with all properties needed for signing
  return {
    // Basic Coin properties
    txid: input.txid,
    vout: input.vout,
    value: bitcoinsToSatoshis(originalOutput.value.toString()),
    prevTxHex: originalTransactionHex,
    address: address,
    confirmed: originalTransaction.status?.confirmed || false,

    // Wallet-specific
    addressType,
    bip32Derivations: slice.multisig.bip32Derivation,
    redeemScript: slice.multisig.redeem.output,
    witnessScript: slice.multisig.redeem.output,
    multisig: slice.multisig,

    // UI Metadata
    bip32Path: slice.bip32Path,
    change: slice.change
  };
}

/**
 * Orchestrates coin reconstruction from provided pending transactions.
 *
 * Given a set of known pending wallet transactions, this function attempts to
 * rebuild any coins referenced by the input PSBT but hidden due to Bitcoin Core’s
 * behavior with unconfirmed outputs.
 *
 * Steps:
 * 1. Iterate over pending transactions and their inputs.
 * 2. Match inputs against the set of coin identifiers we care about.
 * 3. For each match, fetch the original transaction that created the coin.
 * 4. Use `reconstructSinglecoin()` to rebuild a usable coin object.
 *
 * @param pendingTransactions - Unconfirmed transactions from our wallet (used as data source).
 * @param originalTxLookup - Lookup map of txid → original transaction and hex data.
 * @param allSlices - Wallet metadata (used to verify ownership of reconstructed coins).
 * @param neededInputIds - Set of coin input IDs (txid:vout) we want to reconstruct.
 *
 * @throws {Error} When network is unavailable or reconstruction fails
 */
export function reconstructCoinsFromPendingTransactions(
  pendingTransactions: TransactionDetails[],
  originalTxLookup: Map<
    string,
    { transaction: TransactionDetails; transactionHex: string }
  >,
  allSlices: Slice[],
  neededInputIds: Set<string>, // Derived from the PSBT
): { reconstructedCoins: ReconstructedCoin[]; hasPendingInputs: boolean } {
  const reconstructedCoins: ReconstructedCoin[] = [];
  let hasPendingInputs = false;

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
      hasPendingInputs = true;
      const originalTxData = originalTxLookup.get(input.txid);
      if (!originalTxData) continue;

      const coin = reconstructSingleCoin(
        { 
          txid: input.txid, 
          vout: input.vout 
        },
        originalTxData.transaction,
        originalTxData.transactionHex,
        allSlices,
      );

      // Only include valid reconstructions
      if (coin) {
        (coin as any)._pendingTxid = pendingTx.txid; // So we get a PSBT we don't know which pendingTX is it trying to fee Bump
        reconstructedCoins.push(coin as unknown as ReconstructedCoin);
      }
    }
  }

  return { reconstructedCoins, hasPendingInputs };
}

/*
 * Matches a PSBT's required inputs to available coins using a two-phase strategy.
 *
 * ## Context
 * When you import a normal PSBT, all the coins it references should be sitting
 * in your wallet as "spendable" - meaning Bitcoin Core's `listunspent` can find them.
 *
 * But when you import an RBF (Replace-By-Fee) PSBT, those same coins are now
 * "spent" in the original pending transaction, so `listunspent` won't return them.
 * Yet the RBF PSBT still needs to reference those exact same coins ...
 *
 * ## Matching Strategy
 *
 * 1. **Spendable Path**:
 *    - Checks coins from current wallet state (typically handles standard PSBTs).
 *
 * 2. **Reconstructed Path**:
 *    - Fallback if some inputs are not found in the wallet.
 *    - Matches against reconstructed coins (from analyzing pending transactions).
 *    - Designed for RBF PSBTs where inputs are already marked as spent.
 *
 * @param inputIdentifiers - Set of "txid:index" strings that the PSBT requires
 * @param availableInputs - Already formatted inputs from wallet (from selectAvailableInputsFromPSBT)
 * @param reconstructedcoins - coins rebuilt from pending transactions (the RBF case)
 * @returns Complete array of inputs with all metadata needed for transaction signing
 */
export function matchPsbtInputsToUtxos(
  inputIdentifiers: Set<string>,
  availableInputs: Input[] = [],
  reconstructedCoins: ReconstructedCoin[] = [],
) {
  const matchedInputs: Input[] = [];
  const alreadyFoundInputs = new Set<string>();

  // =====================================================================
  // STRATEGY 1: The Happy Path - Use Already Available Inputs
  // =====================================================================
  //
  // This is where we handle normal PSBT imports. If you just created a PSBT
  // for a fresh transaction, all the coins it references should be sitting
  // right here in your wallet's spendable slices.
  //
  //
  availableInputs.forEach((input) => {
    const coinIdentifier = createInputIdentifier(input.txid, input.index);
    if (inputIdentifiers.has(coinIdentifier)) {
      matchedInputs.push(input);
      alreadyFoundInputs.add(coinIdentifier);
    }
  });

  // =====================================================================
  // STRATEGY 2: The RBF Path - Check Reconstructed coins
  // =====================================================================
  //
  // This is where the magic happens for RBF PSBTs. If we get here, it means
  // Strategy 1 didn't find all the coins the PSBT needs. That's a strong
  // indicator we're dealing with an RBF scenario.
  //
  // The reconstructed coins come from analyzing pending transactions to
  // figure out "what coins were consumed by that pending transaction that
  // this new RBF PSBT wants to replace" and also prevent user from reconstructing any coin's given in PSBT.
  //
  reconstructedCoins.forEach(
    (coin) => {
    
      // Iterating over each Coin stored in reconstructedCoins
      const coinIdentifier = createInputIdentifier(coin.txid, coin.vout);

    // Two conditions must be met:
    // 1. The PSBT actually wants this coin
    // 2. We haven't already found it in Strategy 1 (avoid duplicates)
    const psbtWantsThis = inputIdentifiers.has(coinIdentifier);
    const notAlreadyFound = !alreadyFoundInputs.has(coinIdentifier);

    if (psbtWantsThis && notAlreadyFound) {
      // The reconstructed coin should already have all the wallet metadata
      // (multisig, bip32Path, etc.) from the reconstruction process.

      /**
       * Instead of casting the slice (which lacks txid/hex), 
       * we transform the reconstructed coin into a valid UTXO/Input.
       */

      // 1. Convert our coin to a formal UTXO structure
      const utxo = getUtxoFromCoin(coin)

      // 2. Map the UTXO input type
      // We use 'unknown' as the bridge to satisfy TS checks
      const formattedInput = (utxo as unknown) as Input;
      matchedInputs.push(formattedInput);
      alreadyFoundInputs.add(coinIdentifier);
    }
  });

  return matchedInputs;
}

/**
 * Hook to reconstruct a parent transaction output for Child-Pays-for-Parent (CPFP) spending.
 *
 * When you want to speed up a stuck Bitcoin transaction using CPFP, you need to create a new
 * transaction (the "child") that spends an output from your unconfirmed transaction (the "parent").
 *
 * The problem: While your wallet knows about the parent transaction's outputs, those outputs
 * don't have the detailed signing information (scripts, derivation paths, etc.) needed to
 * create a proper PSBT for spending them.
 *
 * ## What this hook does:
 * 1. **Identifies ownership**: Checks if the specified output actually belongs to user's wallet
 * 2. **Reconstructs metadata**: Adds all the missing signing information from user wallet's
 *    slice data (multisig scripts, BIP32 derivation paths, etc.)
 * 3. **Formats for fees package**: Converts the result to the coin format expected by
 *    the @caravan/transactions package for transaction creation
 *
 *
 * @param parentTransaction - The unconfirmed transaction containing the output we want to spend
 * @param spendableOutputIndex
 * @param txHex - The raw hex data of the parent transaction (needed for signing)
 * @returns A fully enriched coin ready for spending, or null if the output doesn't belong to the wallet
 */
export const buildCoinFromSpendingTransaction = (
  parentTransaction: TransactionDetails,
  spendableOutputIndex: number,
  txHex: string,
  walletSlices: Slice[],
): UTXO | null => {
  if (!parentTransaction || spendableOutputIndex === undefined || !txHex) {
    return null;
  }

  const coin = reconstructSingleCoin(
    {
      txid: parentTransaction.txid,
      vout: spendableOutputIndex,
    },
    parentTransaction,
    txHex,
    walletSlices,
  );

  if (!coin) return null

  try {
    return getUtxoFromCoin(coin)
  } catch (error) {
    console.error("Failed to convert reconstructed coin to UTXO format:", error);
    return null;
  }
};

// If reconstruction failed, this output doesn't belong to our wallet
//   if (!caravancoin) {
//     console.warn(
//       `Failed to reconstruct coin for output ${spendableOutputIndex} of transaction ${parentTransaction.txid}. ` +
//         `This output may not belong to the wallet or wallet slice data may be incomplete.`,
//     );
//     return null;
//   }
//   const coinForConversion = caravancoin;
//   try {
//     return getUtxoFromCoin(coinForConversion);
//   } catch (error) {
//     console.error(
//       "Failed to convert reconstructed coin to fees format:",
//       error,
//     );
//     return null;
//   }
// };

// Eliminating utxo to coin conversion method

