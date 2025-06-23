/**
 * Helper functions for checking dust outputs and privacy issues
 */

// How much extra we multiply the fee by when checking for dust
// This follows Bitcoin Core's approach - if it costs more than 3x the normal
// fee to spend an output, it's considered dust
const DUST_FEE_MULTIPLIER = 3;

/**
 * Figure out the minimum amount needed to not be considered dust
 * Basically, if it costs more to spend than it's worth, it's dust
 */
export function calculateDustThreshold(
  scriptType: string,
  feeRate: number,
): number {
  // TODO: Use actual input script size for each scriptType if needed
  // For now, use a typical input size (e.g., 148 for P2PKH)
  const inputScriptSize = 148;
  // Calculate how much it would cost to spend this output later
  // We use a higher fee rate (3x) to be safe
  const costToSpend = (inputScriptSize * feeRate * DUST_FEE_MULTIPLIER) / 1000;
  return Math.ceil(costToSpend);
}

/**
 * Check if a UTXO is too small to be worth spending (dust)
 */
export function isDustUTXO(
  amountSats: number,
  scriptType: string,
  feeRate: number,
): boolean {
  const minAmount = calculateDustThreshold(scriptType, feeRate);
  return amountSats <= minAmount;
}

/**
 * Check if transaction outputs mix different address types
 * This can be a privacy issue since it makes transactions more identifiable
 */
export function analyzeOutputFingerprinting(
  outputs: Array<{ scriptType: string; amount: number }>,
) {
  const addressTypes = outputs.map((output) => output.scriptType);
  const uniqueTypes = [...new Set(addressTypes)];

  const hasPrivacyIssue = uniqueTypes.length > 1;

  return {
    hasFingerprinting: hasPrivacyIssue,
    scriptTypes: uniqueTypes,
    primaryScriptType: addressTypes[0],
    mixedTypes: hasPrivacyIssue ? uniqueTypes : null,
  };
}
