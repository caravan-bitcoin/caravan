import { Network } from "@caravan/bitcoin";
import { BlockchainClient } from "@caravan/clients";
import { FeeEstimate } from "./types";

export async function estimateFee(
  desiredConfirmationTime: number,
  network: Network,
  client: BlockchainClient
): Promise<FeeEstimate> {
  // Use the BlockchainClient to fetch current fee estimates
  const feeRate = await client.getFeeEstimate(desiredConfirmationTime);

  return {
    feeRate,
    estimatedConfirmationTime: desiredConfirmationTime,
  };
}

export function suggestFeeBump(currentFeeRate: number): number {
  // Implement logic to suggest a higher fee rate for bumping
  // This could use constants from @caravan/bitcoin if available
  return currentFeeRate;
}
