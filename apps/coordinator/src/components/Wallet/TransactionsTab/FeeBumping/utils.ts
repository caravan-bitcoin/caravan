import { Network, satoshisToBitcoins } from "@caravan/bitcoin";
import {
  FeeBumpStrategy,
  TransactionAnalyzer,
  UTXO as FeeUTXO,
} from "@caravan/fees";
import { Transaction } from "bitcoinjs-lib-v6";
import { BigNumber } from "bignumber.js";
import { TransactionT } from "../types";
import { FeeBumpRecommendation } from "./types";
import { BlockchainClient } from "@caravan/clients";
import { Prompt } from "react-router";

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
