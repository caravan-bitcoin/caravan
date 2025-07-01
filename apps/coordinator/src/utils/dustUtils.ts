/**
 * Helper functions for transaction analysis:
 * - Dust detection
 * - Wallet fingerprinting/privacy analysis
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
 * Wallet fingerprinting privacy analysis (Buck's review logic):
 * - Single output: never a privacy leak (no warning, no info)
 * - Multiple outputs: warn only if exactly one matches wallet type (or any of wallet types if array)
 * - All outputs wallet type, or none wallet type: no warning
 * - Multiple outputs match wallet type: no warning
 */
export function walletFingerprintAnalysis(
  outputs: Array<{ scriptType: string; amount: number }>,
  walletScriptType: string | string[],
) {
  const totalOutputs = outputs.length;
  const scriptTypes = [...new Set(outputs.map((output) => output.scriptType))];

  // Single output: never a privacy leak
  if (totalOutputs === 1) {
    return {
      hasWalletFingerprinting: false,
      matchingOutputCount: 1,
      scriptTypes,
      reason: "Single output transactions don't leak wallet information.",
      poisonedOutputIndex: null,
      info: "",
    };
  }

  // Support multiple wallet script types (future-proof)
  const isMatch = (o: { scriptType: string; amount: number }) =>
    Array.isArray(walletScriptType)
      ? walletScriptType.includes(o.scriptType)
      : o.scriptType === walletScriptType;
  const matchingOutputs = outputs.filter(isMatch);
  const matchingCount = matchingOutputs.length;

  // Only warn if exactly one output matches wallet type
  const hasWalletFingerprinting = matchingCount === 1;

  return {
    hasWalletFingerprinting,
    matchingOutputCount: matchingCount,
    scriptTypes,
    reason: hasWalletFingerprinting
      ? "Exactly one output matches the wallet's script type, making it easy to identify change and link future transactions."
      : "",
    poisonedOutputIndex: hasWalletFingerprinting
      ? outputs.findIndex(isMatch)
      : null,
    info: "",
  };
}
