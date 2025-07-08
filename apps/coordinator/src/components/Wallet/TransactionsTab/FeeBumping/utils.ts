import { Network } from "@caravan/bitcoin";
import {
  UTXO as FeeUTXO,
  GlobalXpub,
  TransactionAnalyzer,
} from "@caravan/fees";

import { Slice } from "selectors/wallet";
import { FeePriority, FeeBumpRecommendation } from "./types";

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
 * Selects the appropriate fee rate based on user priority and network conditions
 *
 * This function maps user-friendly priority levels to actual fee rates obtained
 * from network fee estimation. It provides a clean abstraction over the complexity
 * of Bitcoin fee estimation.
 *
 * @param priority - User-selected priority level (HIGH, MEDIUM, LOW)
 * @param feeRates - Current network fee estimates for different priorities
 * @returns Target fee rate in satoshis per virtual byte (sat/vB)
 *
 * @example
 * const targetRate = selectTargetFeeRate(FeePriority.HIGH, {
 *   high: 50, medium: 25, low: 10
 * }); // Returns 50
 */
export const selectTargetFeeRate = (
  priority: FeePriority,
  feeRates: { high: number; medium: number; low: number },
): number => {
  switch (priority) {
    case FeePriority.HIGH:
      return feeRates.high;
    case FeePriority.LOW:
      return feeRates.low;
    case FeePriority.MEDIUM:
    default:
      return feeRates.medium;
  }
};

// =============================================================================
// GLOBAL EXTENDED PUBLIC KEY (XPUB) PROCESSING
// =============================================================================

/**
 * Safely parses braid details JSON to extract extended public key information
 *
 * Braid details contain crucial cryptographic information for multisignature
 * wallets, including extended public keys (xpubs) that are needed for proper
 * PSBT (Partially Signed Bitcoin Transaction) construction.
 *
 * @param braidDetailsJson - JSON string containing wallet braid configuration
 * @returns Array of extended public key objects, empty array on parse failure
 *
 * @internal This function handles the low-level parsing of wallet configuration
 */
const processBraidDetails = (braidDetailsJson: string): any[] => {
  try {
    const braidDetails = JSON.parse(braidDetailsJson);
    return braidDetails.extendedPublicKeys || [];
  } catch (error) {
    console.warn("Error parsing braidDetails:", error);
    return [];
  }
};

/**
 * Creates a standardized GlobalXpub object from extended public key data
 *
 * GlobalXpub objects are used in PSBTs to provide derivation information
 * that allows signers to properly derive the correct keys for transaction
 * inputs and outputs.
 *
 * @param epk - Extended public key data with various possible field names
 * @returns Standardized GlobalXpub object with normalized field names
 *
 * @see {@link https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki BIP 174}
 */
const createGlobalXpub = (epk: any): GlobalXpub => ({
  xpub: epk.base58String || epk.xpub,
  masterFingerprint: epk.rootFingerprint || epk.masterFingerprint || "00000000",
  // Default to master derivation path if not specified
  path: epk.path || "m",
});

/**
 * Processes a single wallet node to extract unique GlobalXpub objects
 *
 * This function handles the extraction and deduplication of extended public keys
 * from individual wallet nodes. It's designed to work with the complex nested
 * structure of multisignature wallet configurations we have in caravan
 *
 * @param node - Individual wallet node containing multisig configuration
 * @param seenXpubs - Set to track already processed xpubs (prevents duplicates)
 * @returns Array of unique GlobalXpub objects from this node
 */
export const processNodeForGlobalXpubs = (
  node: any,
  seenXpubs: Set<string>,
): GlobalXpub[] => {
  if (!node?.multisig?.braidDetails) return [];

  const extendedPublicKeys = processBraidDetails(node.multisig.braidDetails);
  const globalXpubs: GlobalXpub[] = [];

  for (const epk of extendedPublicKeys) {
    const xpubString = epk.base58String || epk.xpub;
    if (!xpubString || seenXpubs.has(xpubString)) continue;

    seenXpubs.add(xpubString);
    globalXpubs.push(createGlobalXpub(epk));
  }

  return globalXpubs;
};

/**
 * Extracts all unique extended public keys from deposit and change wallet nodes
 *
 * This is a critical function for PSBT construction in multisignature wallets.
 * It aggregates all unique extended public keys from both deposit and change
 * address nodes, ensuring proper signing capability across the entire wallet.
 *
 * @param depositNodes - Record of deposit address nodes from wallet state
 * @param changeNodes - Record of change address nodes from wallet state
 * @returns Deduplicated array of GlobalXpub objects for PSBT inclusion
 */
export const extractGlobalXpubsFromWallet = (
  depositNodes: Record<string, Slice>,
  changeNodes: Record<string, Slice>,
): GlobalXpub[] => {
  const globalXpubs: GlobalXpub[] = [];
  const seenXpubs = new Set<string>();

  // Process deposit nodes
  if (depositNodes) {
    Object.values(depositNodes).forEach((node) => {
      globalXpubs.push(...processNodeForGlobalXpubs(node, seenXpubs));
    });
  }

  // Process change nodes
  if (changeNodes) {
    Object.values(changeNodes).forEach((node) => {
      globalXpubs.push(...processNodeForGlobalXpubs(node, seenXpubs));
    });
  }

  return globalXpubs;
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
  const combinedUtxos: FeeUTXO[] = [];
  const processedUtxoKeys = new Set<string>();

  // Helper function to create unique UTXO identifier
  const createUtxoKey = (utxo: FeeUTXO): string => `${utxo.txid}:${utxo.vout}`;

  // Add pending UTXOs first (these are required for RBF)
  for (const utxo of pendingUtxos) {
    const utxoKey = createUtxoKey(utxo);

    if (!processedUtxoKeys.has(utxoKey)) {
      combinedUtxos.push(utxo);
      processedUtxoKeys.add(utxoKey);
    }
  }

  // Add wallet UTXOs (additional UTXOs for fee bumping)
  for (const utxo of walletUtxos) {
    const utxoKey = createUtxoKey(utxo);
    if (!processedUtxoKeys.has(utxoKey)) {
      combinedUtxos.push(utxo);
      processedUtxoKeys.add(utxoKey);
    }
  }

  return combinedUtxos;
};
