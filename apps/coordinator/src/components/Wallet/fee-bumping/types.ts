import { Network } from "@caravan/bitcoin";

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

export interface AnalyzedTransaction extends UTXO {
  timeElapsed: string;
  currentFeeRate: number;
  canRBF: boolean;
  canCPFP: boolean;
}

export interface WalletSlice {
  utxos: UTXO[];
}

export interface RootState {
  settings: {
    network: Network;
  };
  wallet: {
    deposits: {
      nodes: Record<string, WalletSlice>;
    };
    change: {
      nodes: Record<string, WalletSlice>;
    };
  };
}
