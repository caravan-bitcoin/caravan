import BigNumber from "bignumber.js";
import { Transaction } from "bitcoinjs-lib-v5";
import { Network } from "@caravan/bitcoin";

export interface UTXO {
  txid: string;
  vout: number;
  value: BigNumber;
  address: string;
  scriptPubKey: string;
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

export interface FeeRate {
  satoshisPerByte: number;
}

export interface RbfOptions {
  subtractFeeFromOutput?: number;
  dustThreshold?: string;
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
  getFeeEstimate: () => Promise<FeeRate>;
  getTransaction: (txid: string) => Promise<Transaction>;
  broadcastTransaction: (txHex: string) => Promise<string>;
}

export interface RBFOptions {
  transaction: Transaction;
  newFeeRate: FeeRate;
  utxos: UTXO[];
  subtractFromOutput?: boolean;
  cancelTransaction?: boolean;
  destinationAddress?: string;
  network: Network;
}

export interface CPFPOptions {
  parentTransaction: Transaction;
  newFeeRate: FeeRate;
  availableUTXOs: UTXO[];
  destinationAddress: string;
  network: Network;
  multisigDetails: MultisigDetails;
}

export interface MultisigDetails {
  addressType: string;
  requiredSigners: number;
  totalSigners: number;
}
