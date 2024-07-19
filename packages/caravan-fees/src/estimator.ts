import { FeeEstimate } from "./types";
import { MIN_FEE_RATE, MAX_FEE_RATE } from "./constants";

export class FeeEstimator {
  private apiUrl: string;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
  }

  async estimateFee(targetConfirmationBlocks: number): Promise<FeeEstimate> {
    try {
      const response = await fetch(
        `${this.apiUrl}/estimatefee/${targetConfirmationBlocks}`
      );
      const data = await response.json();

      const feeRate = Math.max(
        MIN_FEE_RATE,
        Math.min(data.feeRate, MAX_FEE_RATE)
      );

      return {
        feeRate,
        estimatedConfirmationTime: targetConfirmationBlocks * 10, // Assuming 10 minutes per block
      };
    } catch (error) {
      console.error("Error estimating fee:", error);
      throw new Error("Failed to estimate fee");
    }
  }

  async getOptimalFeeRate(
    currentFeeRate: number,
    urgency: "low" | "medium" | "high"
  ): Promise<FeeEstimate> {
    const targetBlocks = {
      low: 6,
      medium: 3,
      high: 1,
    };

    const estimate = await this.estimateFee(targetBlocks[urgency]);

    // Ensure the new fee rate is higher than the current one
    estimate.feeRate = Math.max(estimate.feeRate, currentFeeRate * 1.1);

    return estimate;
  }
}
