/**
 * Helper functions for transaction analysis:
 * - Dust detection (checking if outputs are too small to be worth spending)
 * - Wallet fingerprinting/privacy analysis (identifying privacy risks)
 */

// When checking for dust, we multiply the fee by 3 to be extra safe
// This follows Bitcoin Core's approach - if it costs more than 3x the normal
// fee to spend an output, it's considered dust (not worth spending)
const DUST_FEE_MULTIPLIER = 3;

/**
 * Calculate the minimum amount needed so an output isn't considered dust
 *
 * Think of it this way: if it costs more in fees to spend money than the money is worth,
 * then that money is basically "dust" - not worth touching
 *
 * @param scriptType - Type of Bitcoin script (like P2PKH, P2SH, etc.)
 * @param feeRate - How much you pay per byte in fees
 * @return The minimum amount in satoshis to avoid being dust
 */
export function calculateDustThreshold(
  scriptType: string,
  feeRate: number,
): number {
  // For now, we assume all inputs are about 148 bytes (typical for P2PKH)
  // TODO: We could make this more precise by using actual sizes for each script type
  const inputScriptSize = 148;

  // Calculate how much it would cost to spend this output later
  // We multiply by 3 to be conservative - better safe than sorry
  const costToSpend = (inputScriptSize * feeRate * DUST_FEE_MULTIPLIER) / 1000;

  return Math.ceil(costToSpend);
}

/**
 * Check if a UTXO is too small to be worth spending (aka "dust")
 *
 * @param amountSats - How many satoshis this output contains
 * @param scriptType - What type of Bitcoin script this is
 * @param feeRate - Current fee rate (sats per byte)
 * @return true if this output is dust (too expensive to spend)
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
 * Analyze a transaction for wallet fingerprinting risks
 *
 * Here's the privacy problem we're solving:
 * When you send Bitcoin, you usually have a "change" output that comes back to you.
 * If that change output uses a different script type than the payment output,
 * it's like leaving a fingerprint - anyone can tell which output is yours!
 *
 * Privacy rules we follow:
 * - Single output: No privacy risk (could be paying someone else entirely)
 * - Multiple outputs with exactly ONE matching your wallet type: BAD for privacy!
 *   (Everyone knows which one is your change)
 * - All outputs same type OR none matching your type: Much better for privacy
 * - Multiple outputs matching your type: Also good (creates confusion about which is change)
 *
 * @param outputs - All the outputs in this transaction
 * @param walletScriptType - The script type(s) your wallet uses
 * @return Analysis of privacy risks
 */
export function walletFingerprintAnalysis(
  outputs: Array<{ scriptType: string; amount: number }>,
  walletScriptType: string | string[],
) {
  const totalOutputs = outputs.length;
  const scriptTypes = [...new Set(outputs.map((output) => output.scriptType))];

  // Single output: This is always fine privacy-wise
  // Could be you paying someone else, no way to tell it's a change output
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

  // Handle both single wallet type and multiple wallet types
  // (some wallets might use multiple script types)
  const isMatch = (o: { scriptType: string; amount: number }) =>
    Array.isArray(walletScriptType)
      ? walletScriptType.includes(o.scriptType)
      : o.scriptType === walletScriptType;

  const matchingOutputs = outputs.filter(isMatch);
  const matchingCount = matchingOutputs.length;

  // The privacy problem: exactly one output matches your wallet type
  // This makes it obvious which output is your change!
  const hasWalletFingerprinting = matchingCount === 1;

  return {
    hasWalletFingerprinting,
    matchingOutputCount: matchingCount,
    scriptTypes,
    reason: hasWalletFingerprinting
      ? "Exactly one output matches the wallet's script type, making it easy to identify change and link future transactions."
      : "",
    // If there's fingerprinting, tell them which output is the problem
    poisonedOutputIndex: hasWalletFingerprinting
      ? outputs.findIndex(isMatch)
      : null,
    info: "",
  };
}
