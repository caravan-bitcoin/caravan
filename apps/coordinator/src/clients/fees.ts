import { BlockchainClient } from "@caravan/clients";
import { useQuery } from "@tanstack/react-query";
import { useGetClient } from "hooks/client";

export enum FeePriority {
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
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

const useGetFeeEstimate = async (
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
    queryFn: () => useGetFeeEstimate(priority, blockchainClient),
    enabled: !!blockchainClient,
  });
};

export const useFeeEstimates = () => {
  const highQuery = useFeeEstimate(FeePriority.HIGH);
  const mediumQuery = useFeeEstimate(FeePriority.MEDIUM);
  const lowQuery = useFeeEstimate(FeePriority.LOW);

  const isLoading =
    highQuery.isLoading || mediumQuery.isLoading || lowQuery.isLoading;
  const error = highQuery.error || mediumQuery.error || lowQuery.error;

  const feeEstimates = {
    [FeePriority.HIGH]: highQuery.data,
    [FeePriority.MEDIUM]: mediumQuery.data,
    [FeePriority.LOW]: lowQuery.data,
  };

  return {
    data: feeEstimates,
    isLoading,
    error,
  };
};
