import { Network } from "@caravan/bitcoin";
import {
  Transaction,
} from "bitcoinjs-lib-v5";

export interface FeeEstimate {
  feeRate: number;
  estimatedConfirmationTime: number;
}

export interface RBFOptions {
  transaction: Transaction;
  newFeeRate: number;
  inputs: UTXO[];
  outputs: TransactionOutput[];
  network: Network;
}

export interface CPFPOptions {
  parentTransaction: Transaction;
  childFeeRate: number;
  childOutputs: TransactionOutput[];
  network: Network;
}

// Add other necessary types
