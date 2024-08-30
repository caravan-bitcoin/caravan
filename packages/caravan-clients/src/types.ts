export interface UTXO {
  txid: string;
  vout: number;
  value: number;
  status: {
    confirmed: boolean;
    block_time: number;
  };
}

export interface Transaction {
  txid: string;
  vin: Input[];
  vout: Output[];
  size: number;
  weight: number;
  fee: number;
  isSend: boolean;
  amount: number;
  block_time: number;
}

interface Input {
  prevTxId: string;
  vout: number;
  sequence: number;
}

interface Output {
  scriptPubkeyHex: string;
  scriptPubkeyAddress: string;
  value: number;
}

export interface FeeRatePercentile {
  avgHeight: number;
  timestamp: number;
  avgFee_0: number;
  avgFee_10: number;
  avgFee_25: number;
  avgFee_50: number;
  avgFee_75: number;
  avgFee_90: number;
  avgFee_100: number;
}
