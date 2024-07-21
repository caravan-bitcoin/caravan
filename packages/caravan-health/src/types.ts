import { UTXO } from "@caravan/clients";

export interface AddressUtxos {
  [address: string]: UTXO[];
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
  blocktime: number;
}

interface Input {
  txid: string;
  vout: number;
  witness: string[];
  sequence: number;
}

interface Output {
  scriptPubkeyHex: string;
  scriptPubkeyAddress: string;
  value: number;
}
