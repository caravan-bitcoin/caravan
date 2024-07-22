import BigNumber from "bignumber.js";

export interface UTXO {
  txid: string;
  index: number;
  amountSats: BigNumber;
  address: string;
  bip32Path: string;
  checked?: boolean;
  confirmed?: boolean;
}

export interface TransactionOutput {
  address: string;
  value: BigNumber;
}

export interface TransactionAnalysis {
  canRBF: boolean;
  canCPFP: boolean;
  currentFeeRate: number;
  recommendedMethod: "RBF" | "CPFP" | null;
}

export interface FeeRate {
  satoshisPerByte: number;
  satoshisPerVbyte: number;
}

export interface FeeEstimate {
  lowFee: FeeRate;
  mediumFee: FeeRate;
  highFee: FeeRate;
}

export interface TransactionDetails {
  txid: string;
  version: number;
  locktime: number;
  vin: any[];
  vout: any[];
  size: number;
  weight: number;
  fee: BigNumber;
}

export interface BlockchainClientInterface {
  getFeeEstimate: () => Promise<FeeEstimate>;
  getTransaction: (txid: string) => Promise<TransactionDetails>;
  broadcastTransaction: (txHex: string) => Promise<string>;
}

export interface RBFOptions {
  newFeeRate: FeeRate;
  inputs: UTXO[];
  outputs: {
    address: string;
    value: BigNumber;
  }[];
  changeAddress: string;
}

export interface CPFPOptions {
  parentTxid: string;
  newFeeRate: FeeRate;
  inputs: UTXO[];
  outputs: {
    address: string;
    value: BigNumber;
  }[];
  changeAddress: string;
}
