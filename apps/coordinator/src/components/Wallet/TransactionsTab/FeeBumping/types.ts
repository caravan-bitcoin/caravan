import { Network } from "@caravan/bitcoin";
import { FeeBumpStrategy, Satoshis, TxAnalysis } from "@caravan/fees";
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
}

/**
 * Fee priority options for transaction fee selection
 */
export enum FeePriority {
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
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
