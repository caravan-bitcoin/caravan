import { UTXO as FeeUTXO } from "@caravan/fees";
import { PsbtV2 } from "@caravan/psbt";

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
export const validateTransactionInputs = (
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

// TODO: remove this function when we do cleanup elsewhere around old rbf code
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

/**
 * Converts a PSBT (Partially Signed Bitcoin Transaction) between different versions.
 *
 * @description This function handles conversion between PSBT v0 and v2 formats.
 * Currently only supports converting from v2 to v0, as RBF functions return v2 PSBTs.
 * If conversion fails, the original PSBT is returned unchanged.
 *
 * @param {string} psbtBase64 - The PSBT encoded as a base64 string
 * @param {"v0" | "v2"} targetVersion - The desired PSBT version to convert to
 * @returns {string} The converted PSBT as a base64 string, or the original if conversion fails
 *
 * @example
 * ```typescript
 * const v2Psbt = "cHNidP8BAH0CAAAAAe..."; // v2 PSBT
 * const v0Psbt = convertPSBT(v2Psbt, "v0");
 * ```
 *
 * @throws {Error} Logs conversion errors to console but doesn't throw - returns original PSBT
 *
 * @since 1.0.0
 */
export const convertPSBT = (
  psbtBase64: string,
  targetVersion: "v0" | "v2",
): string => {
  try {
    if (targetVersion === "v0") {
      // Convert from v2 to v0
      const psbt = new PsbtV2(psbtBase64);
      return psbt.toV0("base64");
    }
    // Return as-is for v2 target since RBF functions already return v2 PSBTs
    return psbtBase64;
  } catch (error) {
    console.error("Error converting PSBT:", error);
    return psbtBase64; // Return original if conversion fails
  }
};
