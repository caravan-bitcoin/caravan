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
  scriptType?: string;
}
