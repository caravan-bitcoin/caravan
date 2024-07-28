import { UTXO } from "@caravan/clients";

// Represents the Unspent Outputs of the address
export interface AddressUtxos {
  [address: string]: UTXO[];
}
