import BigNumber from "bignumber.js";
import { PsbtV2 } from "@caravan/psbt";
import { Network } from "@caravan/bitcoin";

export interface UTXO {
  txid: string;
  vout: number;
  value: number;
  script: Buffer;
  additionalData?: any; // For any additional data required for the input
}

export interface TransactionOutput {
  address: string;
  amountSats: BigNumber;
}

export interface TransactionAnalysis {
  canRBF: boolean;
  canCPFP: boolean;
  currentFeeRate: FeeRate;
  recommendedMethod: "RBF" | "CPFP" | null;
  reason: string;
}

export type UrgencyLevel = "low" | "medium" | "high";

export type AddressType = "P2SH" | "P2SH-P2WSH" | "P2WSH";

export interface FeeRate {
  satoshisPerByte: number;
}

export interface RbfOptions {
  urgency?: UrgencyLevel;
  subtractFeeFromOutput?: number | undefined;
  dustThreshold?: string | number;
  additionalUtxos?: UTXO[];
  urgencyMultipliers?: Record<UrgencyLevel, number>;
  requiredSigners: number;
  totalSigners: number;
  changeOutputIndices: number[];
}

export interface FeeEstimate {
  lowFee: FeeRate;
  mediumFee: FeeRate;
  highFee: FeeRate;
}

export interface TransactionDetails {
  inputs: {
    txid: string;
    vout: number;
    amount: BigNumber;
  }[];
  outputs: {
    address: string;
    amount: BigNumber;
  }[];
  fee: BigNumber;
}

export interface RbfTransactionResult {
  psbt: string; // Base64 encoded PSBT
  details: TransactionDetails;
  feeRate: FeeRate;
}

export interface CancelTransactionResult extends RbfTransactionResult {
  destinationAddress: string;
}

export interface CPFPOptions {
  parentPsbt: PsbtV2 | string | Buffer;
  spendableOutputs: number[];
  destinationAddress: string;
  feeRate: FeeRate;
  network: Network;
  urgency?: UrgencyLevel;
  maxAdditionalInputs?: number;
  maxChildTxSize?: number;
  dustThreshold?: number;
  additionalUtxos?: UTXO[];
  urgencyMultipliers?: Record<UrgencyLevel, number>;
  requiredSigners: number;
  totalSigners: number;
  addressType: string;
}

export interface MultisigDetails {
  requiredSigners: number;
  totalSigners: number;
  addressType: AddressType;
}

export interface WalletConfig {
  addressType: string;
  requiredSigners: number;
  totalSigners: number;
  addresses: string[];
  // Add any other relevant wallet configuration details
}
