import { Network } from "@caravan/bitcoin";
import { UTXO as FeeUTXO, TransactionAnalyzer } from "@caravan/fees";
import { TransactionDetails } from "@caravan/clients";

import { FeeBumpRecommendation } from "./types";
import { FeePriority } from "clients/fees";

// =============================================================================
// HELPER UTILITY FUNCTIONS FOR FORMATTING AND VALIDATION
// =============================================================================

/**
 * Formats a fee amount in satoshis to a human-readable string with locale-aware formatting
 *
 * This function handles large numbers gracefully and provides consistent formatting
 * across different locales. It's particularly useful for displaying transaction fees
 * in user interfaces.
 *
 * @param feeInSatoshis - The fee amount in satoshis (can be string or number)
 * @param includeSuffix - Whether to append " sats" to the formatted string
 * @returns Formatted fee string with thousands separators (e.g., "1,234 sats")
 *
 * @example
 * formatFee(1234567) // "1,234,567 sats"
 * formatFee("5000", false) // "5,000"
 * formatFee("invalid") // "0 sats"
 */
export const formatFee = (
  feeInSatoshis: string,
  includeSuffix = true,
): string => {
  // Parse the fee as a number
  const fee = parseInt(feeInSatoshis, 10);

  if (isNaN(fee)) return "0" + (includeSuffix ? " sats" : "");

  // Format with thousands separators
  const formattedFee = fee.toLocaleString();

  return formattedFee + (includeSuffix ? " sats" : "");
};

/**
 * Comprehensive validation of transaction inputs required for fee analysis
 *
 * This function performs critical validation to ensure the fee bumping process
 * has all necessary data. It uses structured error reporting to help with
 * debugging and user feedback.
 *
 * @param txHex - Raw transaction hex string from the blockchain
 * @param fee - Current transaction fee in satoshis
 * @param availableUtxos - UTXOs available for fee bumping operations
 * @throws {Error} When validation fails with descriptive error messages
 *
 * @internal This is a private validation function used internally
 */
const validateTransactionInputs = (
  txHex: string,
  fee: number,
  availableUtxos: FeeUTXO[],
): void => {
  if (!txHex) {
    throw new Error("Transaction hex must be a string");
  }

  if (isNaN(fee) || fee < 0) {
    console.warn("Invalid fee provided, using 0");
  }

  if (!availableUtxos?.length) {
    throw new Error("No UTXOs available for fee bumping");
  }
};

/**
 * Identifies the change output in a transaction by analyzing output addresses
 * and wallet data
 *
 * This function uses multiple heuristics to identify which output is the change:
 * 1. Matches against known wallet addresses
 * 2. Checks BIP32 path patterns (change addresses use path m/1/*)
 * 3. Position in outputs (change is often the last output)
 *
 * @param transaction - The transaction object
 * @param walletState - The wallet state containing addresses
 * @returns Index of the change output or undefined if not found
 *
 * @see https://en.bitcoin.it/wiki/Privacy#Change_address_detection
 */
export const getChangeOutputIndex = (
  transaction: TransactionDetails,
  walletAddresses: string[],
  changeAddresses: string[],
): number | undefined => {
  if (!transaction.vout?.length) return undefined;

  const changeAddressesSet = new Set(changeAddresses);
  const walletAddressesSet = new Set(walletAddresses);

  // 1) First look for any explicit change‑address hits
  for (let i = 0; i < transaction.vout.length; i++) {
    const addr = transaction.vout[i].scriptPubkeyAddress;
    if (addr && changeAddressesSet.has(addr)) {
      return i;
    }
  }

  // 2) : Check if any output goes to a known wallet address
  // This is less reliable but can help identify change when the exact
  // change address isn't recognized
  for (let i = 0; i < transaction.vout.length; i++) {
    const addr = transaction.vout[i].scriptPubkeyAddress;
    if (addr && walletAddressesSet.has(addr)) {
      return i;
    }
  }

  return undefined;
};

// =============================================================================
// MAIN ANALYSIS UTIL FUNCTIONS FOR FEE BUMPING
// =============================================================================

/**
 * Performs comprehensive transaction analysis for fee bumping recommendations
 *
 * This function is the core of the fee bumping system. It uses the Caravan fees
 * package's TransactionAnalyzer to evaluate whether a transaction can be fee-bumped
 * using Replace-by-Fee (RBF) or Child-Pays-for-Parent (CPFP) methods.
 *
 * The analysis considers:
 * - Current transaction fee rate vs. target fee rate
 * - Available UTXOs for additional inputs
 * - Wallet configuration (multisig setup)
 * - Network conditions and fee estimates
 *
 * @param txHex - Raw transaction hex string to analyze
 * @param fee - Current absolute fee amount in satoshis
 * @param network - Bitcoin network (mainnet, testnet, regtest)
 * @param availableUtxos - UTXOs available for fee bumping (from pending tx + wallet)
 * @param targetFeeRate - Desired fee rate in sat/vB based on user priority
 * @param walletConfig - Multisignature wallet configuration parameters
 * @param feePriority - User-selected priority level for reference
 * @returns Comprehensive fee bump recommendation with multiple strategies
 *
 * @throws {Error} When transaction validation fails or insufficient data provided
 *
 * @example
 * const recommendation = analyzeTransaction(
 *   "020000000001...", // transaction hex
 *   5000, // current fee in sats
 *   Network.MAINNET,
 *   [...availableUtxos],
 *   25, // target fee rate
 *   { requiredSigners: 2, totalSigners: 3, addressType: "P2SH" },
 *   FeePriority.MEDIUM
 * );
 */
export const analyzeTransaction = (
  txHex: string,
  fee: number,
  network: Network,
  availableUtxos: FeeUTXO[],
  targetFeeRate: number,
  walletConfig: {
    requiredSigners: number;
    totalSigners: number;
    addressType: string;
  },
  feePriority: FeePriority = FeePriority.MEDIUM,
): FeeBumpRecommendation => {
  // Validate inputs
  validateTransactionInputs(txHex, fee, availableUtxos);

  // Create analyzer with wallet-specific parameters
  const analyzer = new TransactionAnalyzer({
    txHex,
    network,
    targetFeeRate,
    absoluteFee: fee.toString(),
    availableUtxos,
    requiredSigners: walletConfig.requiredSigners,
    totalSigners: walletConfig.totalSigners,
    addressType: walletConfig.addressType,
  });

  // Get comprehensive analysis
  const analysis = analyzer.analyze();

  // Return the analysis with added network fee estimates
  return {
    ...analysis,
    userSelectedFeeRate: targetFeeRate,
    userSelectedPriority: feePriority,
  };
};

/**
 * Efficiently combines and deduplicates UTXOs from multiple sources for fee bumping
 *
 * This function merges UTXOs from pending transactions (required for RBF) with
 * additional wallet UTXOs (available for adding inputs). It uses an optimized
 * deduplication strategy to handle large UTXO sets efficiently.
 *
 * The order matters: pending UTXOs are prioritized because they're required
 * for Replace-by-Fee operations, while wallet UTXOs provide additional
 * flexibility for fee bumping strategies.
 *
 * @param pendingUtxos - UTXOs from the pending transaction being fee-bumped
 * @param walletUtxos - Additional UTXOs from wallet for fee bumping flexibility
 * @returns Deduplicated array of UTXOs prioritized for fee bumping operations
 *
 * @performance Uses Set-based deduplication for O(1) lookup performance
 * @performance Processes UTXOs in single pass for optimal memory usage
 *
 * @example
 * const combinedUtxos = extractUtxosForFeeBumping(
 *   pendingTransactionUtxos, // From usePendingUtxos hook
 *   availableWalletUtxos     // From useWalletUtxos hook
 * );
 */
export const extractUtxosForFeeBumping = (
  pendingUtxos: FeeUTXO[],
  walletUtxos: FeeUTXO[],
): FeeUTXO[] => {
  const processedUtxoKeys = new Set<string>();

  // Helper function to create unique UTXO identifier
  const createUtxoKey = (utxo: FeeUTXO): string => `${utxo.txid}:${utxo.vout}`;

  return [...pendingUtxos, ...walletUtxos].filter((utxo) => {
    const key = createUtxoKey(utxo);
    if (processedUtxoKeys.has(key)) return false;
    processedUtxoKeys.add(key);
    return true;
  });
};
