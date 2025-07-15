import { Network } from "@caravan/bitcoin";
import { FeeBumpStrategy, Satoshis, TxAnalysis, UTXO } from "@caravan/fees";
import { FeePriority } from "clients/fees";
import { TransactionT } from "../types";

/**
 * Fee bumping options provided to the user
 */
export interface FeeBumpOptions {
  /**
   * The original transaction that needs to be fee-bumped
   */
  transaction: TransactionT;

  /**
   * The raw hex of the original transaction
   */
  originalTxHex: string;

  /**
   * The chosen strategy for fee bumping
   */
  strategy: FeeBumpStrategy;

  /**
   * The suggested fee rate in sat/vB
   */
  suggestedFeeRate: number;

  /**
   * The user-selected fee rate in sat/vB
   */
  selectedFeeRate: number;

  /**
   * The minimum fee required according to the chosen strategy
   */
  minimumFee: Satoshis;

  /**
   * The estimated fee that will be paid with the selected fee rate
   */
  estimatedFee: Satoshis;

  /**
   * The Bitcoin network being used
   */
  network: Network;
}

/**
 * Status of the fee bumping operation
 */
export enum FeeBumpStatus {
  IDLE = "idle",
  ANALYZING = "analyzing",
  READY = "ready",
  CREATING = "creating",
  SUCCESS = "success",
  ERROR = "error",
}

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

  priority: FeePriority;
  createdAt: string;
}

/**
 * Context for the RBF operation
 */
export interface RBFContext {
  /**
   * The original transaction to be replaced
   */
  transaction: TransactionT;

  /**
   * The raw hex of the original transaction
   */
  originalTxHex: string;

  /**
   * The chosen fee rate in sat/vB
   */
  feeRate: number;

  /**
   * The change address to use for the new transaction
   */
  changeAddress?: string;

  /**
   * The index of the change output in the original transaction
   */
  changeIndex?: number;

  /**
   * Whether to create a cancel transaction
   */
  isCancel: boolean;

  /**
   * The address to send funds to if cancelling
   */
  cancelAddress?: string;
}

export interface FeeBumpRecommendation extends TxAnalysis {
  currentFeeRate?: number;
  suggestedRBFFeeRate?: number;
  suggestedCPFPFeeRate?: number;
  networkFeeEstimates?: {
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
  };
  userSelectedFeeRate: number;
  userSelectedPriority: FeePriority;
}

export interface UtxoExtractionResult {
  utxos: UTXO[];
  errors: string[];
}

// Component related

export type RbfType = "accelerate" | "cancel" | null;

export const RBF_TYPES = {
  ACCELERATE: "accelerate",
  CANCEL: "cancel",
} as const;

export type RbfTypeValues = (typeof RBF_TYPES)[keyof typeof RBF_TYPES];

export const FEE_LEVELS = {
  LOW: FeePriority.LOW,
  MEDIUM: FeePriority.MEDIUM,
  HIGH: FeePriority.HIGH,
  CUSTOM: "custom",
} as const;

export type FeeLevelType = (typeof FEE_LEVELS)[keyof typeof FEE_LEVELS];

export const PRIORITY_TO_FEE_LEVEL = {
  [FeePriority.LOW]: FEE_LEVELS.LOW,
  [FeePriority.MEDIUM]: FEE_LEVELS.MEDIUM,
  [FeePriority.HIGH]: FEE_LEVELS.HIGH,
};

export const FEE_LEVEL_TO_PRIORITY_MAP = {
  [FEE_LEVELS.LOW]: FeePriority.LOW,
  [FEE_LEVELS.MEDIUM]: FeePriority.MEDIUM,
  [FEE_LEVELS.HIGH]: FeePriority.HIGH,
} as const;

export const FEE_LEVEL_COLORS = {
  [FEE_LEVELS.LOW]: "#4caf50", // Green
  [FEE_LEVELS.MEDIUM]: "#ff9800", // Orange
  [FEE_LEVELS.HIGH]: "#f44336", // Red
  [FEE_LEVELS.CUSTOM]: "#2196f3", // Blue
};
