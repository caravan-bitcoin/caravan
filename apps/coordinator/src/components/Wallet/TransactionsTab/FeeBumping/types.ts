import { FeeBumpStrategy, Satoshis } from "@caravan/transactions";
import { FeePriority } from "clients/fees";

/**
 * Result of the fee bumping operation
 */
export interface FeeBumpResult {
  /**
   * The base64-encoded PSBT of the fee-bumped transaction
   */
  psbtBase64: string;

  /**
   * The estimated new fee in satoshis
   */
  newFee: Satoshis;

  /**
   * The new fee rate in sat/vB
   */
  newFeeRate: number;

  /**
   * The strategy used for fee bumping
   */
  strategy: FeeBumpStrategy;

  /**
   * Whether this is a cancel transaction (vs. acceleration)
   */
  isCancel?: boolean;

  createdAt: string;
}

// Component related

export type RbfType = "accelerate" | "cancel" | null;

export const RBF_TYPES = {
  ACCELERATE: "accelerate",
  CANCEL: "cancel",
} as const;

export const FEE_LEVELS = {
  LOW: FeePriority.LOW,
  MEDIUM: FeePriority.MEDIUM,
  HIGH: FeePriority.HIGH,
  CUSTOM: "custom",
} as const;

export type FeeLevelType = (typeof FEE_LEVELS)[keyof typeof FEE_LEVELS];

export const FEE_LEVEL_COLORS = {
  [FEE_LEVELS.LOW]: "#4caf50", // Green
  [FEE_LEVELS.MEDIUM]: "#ff9800", // Orange
  [FEE_LEVELS.HIGH]: "#f44336", // Red
  [FEE_LEVELS.CUSTOM]: "#2196f3", // Blue
};
