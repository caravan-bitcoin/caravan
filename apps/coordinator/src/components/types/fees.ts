import { TransactionAnalyzer } from "@caravan/fees";
import BigNumber from "bignumber.js";

export interface WalletSliceUTXO {
  amount: string;
  amountSats: BigNumber;
  checked: boolean;
  confirmed: boolean;
  index: number;
  time: number;
  transactionHex: string;
  txid: string;
}

export interface ExtendedAnalyzer {
  analyzer: TransactionAnalyzer;
  timeElapsed: string;
  txHex: string;
  txId: string;
  canRBF: boolean; // Indicates if Replace-By-Fee is possible for this transaction
  canCPFP: boolean; // Indicates if Child-Pays-For-Parent is possible for this transaction
}

export interface WalletSlice {
  utxos: WalletSliceUTXO[];
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

export type PendingTransactionsResult = {
  pendingTransactions: ExtendedAnalyzer[];
  currentNetworkFeeRate: number | null;
  isLoading: boolean;
  error: string | null;
};
