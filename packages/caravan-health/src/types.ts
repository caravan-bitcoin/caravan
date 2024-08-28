import { UTXO } from "@caravan/clients";
export type { MultisigAddressType } from "@caravan/bitcoin";
export type { Transaction, UTXO, FeeRatePercentile } from "@caravan/clients";
export { Network } from "@caravan/bitcoin";

// Represents the Unspent Outputs of the address
export interface AddressUtxos {
  [address: string]: UTXO[];
}

/*
The p_score is calculated by evaluating the likelihood of self-payments, the involvement of 
change outputs and the type of transaction based on number of inputs and outputs.

We have 5 categories of transaction type each with their own impact on privacy score
- Perfect Spend (1 input, 1 output)
- Simple Spend (1 input, 2 outputs)
- UTXO Fragmentation (1 input, more than 2 standard outputs)
- Consolidation (more than 1 input, 1 output)
- CoinJoin or Mixing (more than 1 input, more than 1 output)
*/
export enum SpendType {
  PerfectSpend = "PerfectSpend",
  SimpleSpend = "SimpleSpend",
  UTXOFragmentation = "UTXOFragmentation",
  Consolidation = "Consolidation",
  MixingOrCoinJoin = "MixingOrCoinJoin",
}
