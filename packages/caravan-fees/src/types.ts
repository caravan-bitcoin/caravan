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
  feeOutputIndex?: number;
  dustThreshold?: string | number;
  additionalUtxos?: UTXO[];
  requiredSigners: number;
  totalSigners: number;
  changeOutputIndices: number[];
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
