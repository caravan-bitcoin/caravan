import { BlockchainClient } from "@caravan/clients";
import { useQuery } from "@tanstack/react-query";
import { useGetClient } from "hooks/client";

export enum FeePriority {
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
}

/**
 * Confirmation targets for fee estimation in blocks
 *
 * These values align with common confirmation targets used generally:
 * - HIGH: Next block (10 minutes)
 * - MEDIUM: ~3 blocks (30 minutes)
 * - LOW: ~6 blocks (1 hour)
 *
 * @see https://gist.github.com/morcos/d3637f015bc4e607e1fd10d8351e9f41
 */
export const CONFIRMATION_TARGETS = {
  [FeePriority.HIGH]: 1, // Next block (~10 min)
  [FeePriority.MEDIUM]: 3, // Within Next 3 blocks ~30 min
  [FeePriority.LOW]: 6, // Within Next 6 blocks ~1 hour
};

/**
 * Default fee rates for different priority levels (in sat/vB)
 * Used as fallback when blockchain client fails
 *
 * Fallback values based on :
 * https://b10c.me/blog/003-a-list-of-public-bitcoin-feerate-estimation-apis/
 * These values are reasonable defaults but will be less accurate
 */
const DEFAULT_FEE_RATES = {
  [FeePriority.HIGH]: 32.75,
  [FeePriority.MEDIUM]: 32.75,
  [FeePriority.LOW]: 20.09,
};

const feeEstimateKeys = {
  all: ["fees"] as const,
  feeEstimate: (priority: FeePriority) =>
    [...feeEstimateKeys.all, priority] as const,
};

const fetchFeeEstimate = async (
  priority: FeePriority,
  blockchainClient: BlockchainClient,
) => {
  try {
    const feeRate = await blockchainClient.getFeeEstimate(
      CONFIRMATION_TARGETS[priority],
    );

    // Return default if the API call returns invalid data
    if (!feeRate || isNaN(feeRate)) {
      return DEFAULT_FEE_RATES[priority];
    }

    return Math.max(1, Math.ceil(feeRate)); // Ensure we have at least 1 sat/vB
  } catch (error) {
    console.error("Error fetching fee estimate:", error);
    return DEFAULT_FEE_RATES[priority];
  }
};

export const useFeeEstimate = (priority: FeePriority) => {
  const blockchainClient = useGetClient();
  return useQuery({
    queryKey: feeEstimateKeys.feeEstimate(priority),
    queryFn: () => fetchFeeEstimate(priority, blockchainClient),
    enabled: !!blockchainClient,
  });
};

export const useFeeEstimates = () => {
  const highPriority = useFeeEstimate(FeePriority.HIGH);
  const mediumPriority = useFeeEstimate(FeePriority.MEDIUM);
  const lowPriority = useFeeEstimate(FeePriority.LOW);

  const isLoading =
    highPriority.isLoading || mediumPriority.isLoading || lowPriority.isLoading;
  const error = highPriority.error || mediumPriority.error || lowPriority.error;

  const feeEstimates: Record<FeePriority, number> = {
    [FeePriority.HIGH]: highPriority.data ?? 1,
    [FeePriority.MEDIUM]: mediumPriority.data ?? 1,
    [FeePriority.LOW]: lowPriority.data ?? 1,
  };

  return {
    data: feeEstimates,
    isLoading,
    error,
  };
};
