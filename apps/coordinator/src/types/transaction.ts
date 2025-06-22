export interface UTXO {
  txid: string;
  index: number;
  amountSats: number;
  scriptType: string;
  confirmed: boolean;
  address?: string;
}

export interface TransactionOutput {
  address: string;
  amountSats: number;
  scriptType: string;
}

export interface TransactionInput extends UTXO {
  sequence?: number;
  scriptSig?: string;
  witness?: string[];
}

export interface Transaction {
  inputs: TransactionInput[];
  outputs: TransactionOutput[];
  feeRate: number;
  totalFee: number;
  size: number;
} 