import { Transaction } from "bitcoinjs-lib-v5";
import BigNumber from "bignumber.js";

export interface UTXO {
  txid: string;
  vout: number;
  value: BigNumber;
  script: string;
}

export interface TransactionOutput {
  address: string;
  value: BigNumber;
}

export interface MultisigDetails {
  addressType: string;
  requiredSigners: number;
  totalSigners: number;
}

export interface FeeEstimate {
  feeRate: number;
  estimatedConfirmationTime: number;
}

export interface FeeBumpingAnalysis {
  canRBF: boolean;
  canCPFP: boolean;
  recommendedMethod: "RBF" | "CPFP" | null;
  currentFeeRate: number;
  recommendedFeeRate: number;
  estimatedNewConfirmationTime: number;
}

export interface RBFOptions {
  maxFeeRate?: number;
  maxTotalFee?: BigNumber;
  feeIncreaseThreshold?: number;
}

export interface CPFPOptions {
  maxFeeRate?: number;
  maxTotalFee?: BigNumber;
  childOutputAddress: string;
}

export interface FeeBumpingResult {
  method: "RBF" | "CPFP";
  newTransaction: Transaction;
  newFeeRate: number;
  totalFee: BigNumber;
  estimatedConfirmationTime: number;
}
