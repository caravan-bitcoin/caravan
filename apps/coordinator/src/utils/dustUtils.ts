import { WasteMetrics } from "@caravan/health";
import type { MultisigAddressType } from "@caravan/bitcoin";

const waste = new WasteMetrics();

/**
 * Calculate the minimum amount needed so an output isn't considered dust
 *
 * @param scriptType - Type of Bitcoin script (like P2PKH, P2SH, etc.)
 * @param feeRate - How much you pay per byte in fees
 * @param requiredSignerCount - Number of required signers for multisig
 * @param totalSignerCount - Total number of signers for multisig
 * @param riskMultiplier - Optional risk multiplier (default 2)
 * @return The minimum amount in satoshis to avoid being dust
 */
export function calculateDustThreshold(
  scriptType: MultisigAddressType,
  feeRate: number,
  requiredSignerCount: number,
  totalSignerCount: number,
  riskMultiplier: number = 2,
): number {
  const { lowerLimit } = waste.calculateDustLimits(
    feeRate,
    scriptType,
    { requiredSignerCount, totalSignerCount },
    riskMultiplier,
  );
  return lowerLimit;
}

/**
 * Check if a UTXO is too small to be worth spending (aka "dust")
 *
 * @param amountSats - How many satoshis this output contains
 * @param scriptType - What type of Bitcoin script this is
 * @param feeRate - Current fee rate (sats per byte)
 * @param requiredSignerCount - Number of required signers for multisig
 * @param totalSignerCount - Total number of signers for multisig
 * @param riskMultiplier - Optional risk multiplier (default 2)
 * @return true if this output is dust (too expensive to spend)
 */
export function isDustUTXO(
  amountSats: number,
  scriptType: MultisigAddressType,
  feeRate: number,
  requiredSignerCount: number,
  totalSignerCount: number,
  riskMultiplier: number = 2,
): boolean {
  const minAmount = calculateDustThreshold(
    scriptType,
    feeRate,
    requiredSignerCount,
    totalSignerCount,
    riskMultiplier,
  );
  return amountSats <= minAmount;
}
