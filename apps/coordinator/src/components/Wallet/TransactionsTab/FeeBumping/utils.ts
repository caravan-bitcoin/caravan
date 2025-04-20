import { Network } from "@caravan/bitcoin";
import {
  TransactionAnalyzer,
  UTXO as FeeUTXO,
  TxAnalysis,
} from "@caravan/fees";
import { FeePriority } from "./types";
import { BlockchainClient } from "@caravan/clients";

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
  HIGH: 1, // Next block (~10 min)
  MEDIUM: 3, // Within Next 3 blocks ~30 min
  LOW: 6, // Within Next 6 blocks ~1 hour
};

/**
 * Gets fee estimate from the blockchain client with fallback mechanisms
 *
 * This function retrieves fee estimates from the blockchain client and provides
 * fallback values if the API call fails. It ensures that we always have reasonable
 * fee values to work with as our fee-package needs a targetFeeRate it should target achieving
 *
 * @param blockchainClient - The initialized blockchain client
 * @param feeTarget - Target blocks for confirmation (default: 3)
 * @returns Promise resolving to fee rate in sat/vB
 */
export const getFeeEstimate = async (
  blockchainClient: BlockchainClient,
  withinBlocks: number = CONFIRMATION_TARGETS.MEDIUM,
): Promise<number> => {
  try {
    if (!blockchainClient) {
      throw new Error("Blockchain client not initialized");
    }

    // Get fee estimate from the clients
    const feeRate = await blockchainClient.getFeeEstimate(withinBlocks);
    return Math.max(1, Math.ceil(feeRate)); // Ensure we have at least 1 sat/vB
  } catch (error) {
    console.error("Error fetching fee estimate:", error);

    // Fallback values based on :
    // https://b10c.me/blog/003-a-list-of-public-bitcoin-feerate-estimation-apis/
    // These values are reasonable defaults but will be less accurate
    switch (withinBlocks) {
      case CONFIRMATION_TARGETS.HIGH:
        return 32.75; // Higher priority
      case CONFIRMATION_TARGETS.MEDIUM:
        return 32.75; // Medium priority
      case CONFIRMATION_TARGETS.LOW:
        return 20.09; // Lower priority
      default:
        return 32.75; // Default medium priority
    }
  }
};

/**
 * Analyzes a transaction and provides fee bumping recommendations based on
 * current network fee estimates and transaction characteristics
 *
 * @param txHex - The raw transaction hex string
 * @param fee - The current transaction fee in satoshis
 * @param network - The Bitcoin network being used
 * @param availableUtxos - Available UTXOs for fee bumping
 * @param blockchainClient - The blockchain client for fee estimation
 * @param walletConfig - Wallet configuration parameters
 * @returns Fee bumping analysis and recommendations
 */
export const analyzeTransaction = async (
  txHex: string,
  fee: number,
  network: Network,
  availableUtxos: FeeUTXO[],
  blockchainClient: BlockchainClient,
  walletConfig: {
    requiredSigners: number;
    totalSigners: number;
    addressType: string;
  },
  feePriority: FeePriority = FeePriority.MEDIUM,
): Promise<
  TxAnalysis & {
    networkFeeEstimates: {
      highPriority: number;
      mediumPriority: number;
      lowPriority: number;
    };
    userSelectedFeeRate: number;
    userSelectedPriority: FeePriority;
  }
> => {
  // Get fee estimates for different confirmation targets
  const highPriorityFee = await getFeeEstimate(
    blockchainClient,
    CONFIRMATION_TARGETS.HIGH,
  );
  const mediumPriorityFee = await getFeeEstimate(
    blockchainClient,
    CONFIRMATION_TARGETS.MEDIUM,
  );
  const lowPriorityFee = await getFeeEstimate(
    blockchainClient,
    CONFIRMATION_TARGETS.LOW,
  );

  // Select target fee rate based on user priority
  let targetFeeRate: number;
  switch (feePriority) {
    case FeePriority.HIGH:
      targetFeeRate = highPriorityFee;
      break;
    case FeePriority.MEDIUM:
      targetFeeRate = mediumPriorityFee;
      break;
    case FeePriority.LOW:
      targetFeeRate = lowPriorityFee;
      break;
    default:
      targetFeeRate = mediumPriorityFee; // Default to medium if somehow invalid
  }

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

  // Return the analysis from the analyzer with added network fee estimates
  return {
    ...analysis,
    networkFeeEstimates: {
      highPriority: highPriorityFee,
      mediumPriority: mediumPriorityFee,
      lowPriority: lowPriorityFee,
    },
    userSelectedFeeRate: targetFeeRate,
    userSelectedPriority: feePriority,
  };
};
