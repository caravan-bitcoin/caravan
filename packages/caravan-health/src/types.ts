import { UTXO } from "@caravan/clients";

// Represents the Unspent Outputs of the address
export interface AddressUtxos {
  [address: string]: UTXO[];
}

// Expected Transaction object which should be built in order to consume @caravan-health functionalities
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
  sequence: number;
}

interface Output {
  scriptPubkeyHex: string;
  scriptPubkeyAddress: string;
  value: number;
}
