import { Network } from "@caravan/bitcoin";
import { FeeBumpStrategy, Satoshis } from "@caravan/fees";
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
 * Recommendations for fee bumping based on analysis
 *
 * Contains comprehensive information about fee bumping options,
 * including current network fee estimates, transaction characteristics,
 * and strategy recommendations.
 */
export interface FeeBumpRecommendation {
  /**
   * The recommended strategy for fee bumping
   */
  recommendedStrategy: FeeBumpStrategy;

  /**
   * Whether RBF is possible for this transaction
   */
  canRBF: boolean;

  /**
   * Whether CPFP is possible for this transaction
   */
  canCPFP: boolean;

  /**
   * The suggested fee rate for RBF in sat/vB
   */
  suggestedRBFFeeRate: number;

  /**
   * The minimum required fee for RBF in satoshis
   */
  minimumRBFFee: Satoshis;

  /**
   * The suggested fee rate for CPFP in sat/vB
   */
  suggestedCPFPFeeRate: number;

  /**
   * The minimum required fee for CPFP in satoshis
   */
  minimumCPFPFee: Satoshis;

  /**
   * The current fee rate of the transaction in sat/vB
   */
  currentFeeRate?: number;

  /**
   * Current network fee estimates for different priorities
   */
  networkFeeEstimates?: {
    /**
     * High priority fee rate (likely to confirm in next block)
     */
    highPriority: number;

    /**
     * Medium priority fee rate (likely to confirm in ~3 blocks)
     */
    mediumPriority: number;
  };

  /**
   * The transaction's virtual size in vbytes
   */
  txVsize?: number;
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
