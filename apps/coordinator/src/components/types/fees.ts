import { TransactionAnalyzer } from "@caravan/fees";

export interface UTXO {
  txid: string;
  vout: number;
  amount: number;
  amountSats: number;
  address: string;
  confirmed: boolean;
  transactionHex: string;
  time: number;
}

export type AnalyzerWithTimeElapsed = TransactionAnalyzer & {
  timeElapsed: string;
};

export interface WalletSlice {
  utxos: UTXO[];
}

export interface RootState {
  settings: any;
  wallet: {
    deposits: {
      nodes: Record<string, WalletSlice>;
    };
    change: {
      nodes: Record<string, WalletSlice>;
    };
  };
}
