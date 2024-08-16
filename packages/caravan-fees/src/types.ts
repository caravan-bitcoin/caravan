import { PsbtV2 } from "@caravan/psbt";
import { Network } from "@caravan/bitcoin";

export interface UTXO {
  txid: string;
  vout: number;
  value: number;
  script: Buffer;
  additionalData?: any; // For any additional data required for the input
}

export interface TransactionAnalyzerOptions {
  psbt: PsbtV2 | string | Buffer;
  network: Network;
  dustThreshold?: number;
  targetFeeRate: number; // FeeRateSatsPerVByte as a plain number
  additionalUtxos?: UTXO[];
  spendableOutputs: { index: number; amount: number }[]; // Amount in satoshis
  changeOutputs: { index: number; amount: number }[]; // Amount in satoshis
  requiredSigners: number;
  totalSigners: number;
}

export enum FeeBumpStrategy {
  RBF = "RBF",
  CPFP = "CPFP",
  NONE = "NONE",
}

export type FeeRateSatsPerVByte = number;

export interface RbfTransactionOptions {
  psbt: PsbtV2 | string | Buffer;
  network: Network;
  targetFeeRate: FeeRateSatsPerVByte;
  /**
   * The index of the output from which to subtract the increased fee.
   * If specified, the fee increase will be subtracted entirely from this output.
   * If not specified, the fee increase will be subtracted proportionally from all non-change outputs.
   * Note: This should typically be the index of a change output to avoid modifying recipient amounts.
   */
  feeOutputIndex?: number;
  dustThreshold?: string | number;
  additionalUtxos?: UTXO[];
  requiredSigners: number;
  totalSigners: number;
  changeOutputIndices: number[];
  incrementalRelayFee: number;
  changeAddress?: string;
  useExistingChangeOutput: boolean;
}

export interface RbfTransactionInfo {
  state: TransactionState;
  originalFee: string;
  newFee: string;
  feeIncrease: string;
  vsize: number;
  canAccelerate: boolean;
  canCancel: boolean;
  error: string | null;
}

export interface CPFPOptions {
  parentPsbt: PsbtV2 | string | Buffer;
  spendableOutputs: number[];
  destinationAddress: string;
  targetFeeRate: FeeRateSatsPerVByte;
  network: Network;
  maxAdditionalInputs?: number;
  maxChildTxSize?: number;
  dustThreshold?: number;
  additionalUtxos?: UTXO[];
  requiredSigners: number;
  totalSigners: number;
}

export enum CPFPState {
  INITIALIZED,
  PARENT_ANALYZED,
  CHILD_CREATED,
  INPUTS_ADDED,
  OUTPUTS_ADJUSTED,
  FINALIZED,
  ERROR,
}

export enum TransactionState {
  INITIALIZED = "INITIALIZED",
  ANALYZING = "ANALYZING",
  ANALYZED = "ANALYZED",
  MODIFYING = "MODIFYING",
  FINALIZING = "FINALIZING",
  FINALIZED = "FINALIZED",
  ERROR = "ERROR",
}

// Base error types
export enum BaseErrorType {
  INVALID_STATE = "INVALID_STATE",
  INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS",
  DUST_OUTPUT = "DUST_OUTPUT",
  INVALID_FEE_RATE = "INVALID_FEE_RATE",
  PSBT_MODIFICATION_ERROR = "PSBT_MODIFICATION_ERROR",
  INVALID_TRANSACTION = "INVALID_TRANSACTION",
  UNSUPPORTED_OPERATION = "UNSUPPORTED_OPERATION",
}

// RBF specific error types
export enum RbfErrorType {
  INVALID_PSBT = "INVALID_PSBT",
  ACCELERATION_FAILED = "ACCELERATION_FAILED",
  CANCELLATION_FAILED = "CANCELLATION_FAILED",
  ANALYSIS_FAILED = "ANALYSIS_FAILED",
}

// CPFP specific error types
export enum CpfpErrorType {
  PARENT_TX_INVALID = "PARENT_TX_INVALID",
  CHILD_TX_CREATION_FAILED = "CHILD_TX_CREATION_FAILED",
  ANALYSIS_FAILED = "ANALYSIS_FAILED",
  INPUT_ADDITION_FAILED = "INPUT_ADDITION_FAILED",
}

// Combine all error types
export type ErrorType = BaseErrorType | RbfErrorType | CpfpErrorType;

export type ErrorMessage<
  T extends ErrorType,
  S extends TransactionState,
> = T extends BaseErrorType
  ? BaseErrorMessage<T, S>
  : T extends RbfErrorType
    ? RbfErrorMessage<T, S>
    : T extends CpfpErrorType
      ? CpfpErrorMessage<T, S>
      : never;

type BaseErrorMessage<
  T extends BaseErrorType,
  S extends TransactionState,
> = T extends BaseErrorType.INVALID_STATE
  ? `Invalid state: ${S}. Expected a different state.`
  : T extends BaseErrorType.INSUFFICIENT_FUNDS
    ? "Insufficient funds to cover the required amount"
    : T extends BaseErrorType.DUST_OUTPUT
      ? "Operation would result in a dust output"
      : T extends BaseErrorType.INVALID_FEE_RATE
        ? "Invalid fee rate specified"
        : T extends BaseErrorType.PSBT_MODIFICATION_ERROR
          ? "Error modifying the PSBT"
          : T extends BaseErrorType.INVALID_TRANSACTION
            ? "The transaction is invalid or malformed"
            : T extends BaseErrorType.UNSUPPORTED_OPERATION
              ? "This operation is not supported in the current context"
              : "An unknown error occurred";

type RbfErrorMessage<
  T extends RbfErrorType,
  S extends TransactionState,
> = T extends RbfErrorType.ACCELERATION_FAILED
  ? "Failed to accelerate the transaction"
  : T extends RbfErrorType.INVALID_PSBT
    ? "This transaction is not signaling RBF."
    : T extends RbfErrorType.ANALYSIS_FAILED
      ? "Error in Analyzing the Transaction for RBF"
      : T extends RbfErrorType.CANCELLATION_FAILED
        ? "Failed to cancel the transaction"
        : "An unknown RBF error occurred";

type CpfpErrorMessage<
  T extends CpfpErrorType,
  S extends TransactionState,
> = T extends CpfpErrorType.PARENT_TX_INVALID
  ? "The parent transaction is invalid"
  : T extends RbfErrorType.ANALYSIS_FAILED
    ? "Error in Analyzing the Transaction for CPFP"
    : T extends CpfpErrorType.INPUT_ADDITION_FAILED
      ? "Unable to add additional Inputs"
      : T extends CpfpErrorType.CHILD_TX_CREATION_FAILED
        ? "Failed to create the child transaction"
        : "An unknown CPFP error occurred";
