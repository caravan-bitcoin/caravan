/**
 * Calculate the minimum amount needed so an output isn't considered dust
 *
 * @param scriptType - Type of Bitcoin script (like P2PKH, P2SH, etc.)
 * @param feeRate - How much you pay per byte in fees
 * @return The minimum amount in satoshis to avoid being dust
 */
const DUST_FEE_MULTIPLIER = 3;

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
