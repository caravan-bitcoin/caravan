
import { getWitnessSize } from "@caravan/bitcoin";

import { MultisigAddressType, SpendType } from "./types";

/*
    Name : Spend Type Determination

    Definition :
      The type of spend transaction is obtained based on the number of inputs and outputs which 
      influence the topology type of the transaction and has a role in determining the fingerprints
      behind privacy for wallets.

    Calculation :
      We have 5 categories of transaction type each with their own impact on privacy score
      - Perfect Spend (1 input, 1 output)
      - Simple Spend (output=2 irrespective of input it is Simple Spend)
      - UTXO Fragmentation (1 input, more than 2 standard outputs)
      - Consolidation (more than 1 input, 1 output)
      - CoinJoin or Mixing (inputs more than equal to outputs, more than 2 output)
  */
export function determineSpendType(inputs: number, outputs: number): SpendType {
  if (outputs == 1) {
    if (inputs == 1) {
      return SpendType.PerfectSpend;
    } else {
      return SpendType.Consolidation;
    }
  } else if (outputs == 2) {
    return SpendType.SimpleSpend;
  } else {
    if (inputs < outputs) {
      return SpendType.UTXOFragmentation;
    } else {
      return SpendType.MixingOrCoinJoin;
    }
  }
}

/* 
    Name : Spend Type Score
    Definition :
      Statistical derivations are used to calculate the score based on the spend type of the transaction.

    Calculation : 
      - Perfect Spend :  P(“An output cannot be a self-payment) * (1 - P(“involvement of any change output”))
      - Simple Spend : P(“An output cannot be a self-payment) * (1 - P(“involvement of any change output”))
      - UTXO Fragmentation : 2/3 - 1/number of outputs
      - Consolidation : 1/number of inputs
      - Mixing or CoinJoin : (2/3) * (number of outputs^2) / number of inputs * (1 + (number of outputs^2) / number of inputs)

    Expected Range : [0,0.85]
    -> Very Poor : [0, 0.15]
    -> Poor : (0.15, 0.3]
    -> Moderate : (0.3, 0.45]
    -> Good : (0.45, 0.6]
    -> Very Good : (0.6, 0.85]
  */
export function getSpendTypeScore(
  numberOfInputs: number,
  numberOfOutputs: number,
): number {
  const spendType = determineSpendType(numberOfInputs, numberOfOutputs);
  switch (spendType) {
    case SpendType.PerfectSpend:
      return 1 / 2;
    case SpendType.SimpleSpend:
      return 4 / 9;
    case SpendType.UTXOFragmentation:
      return 2 / 3 - 1 / numberOfOutputs;
    case SpendType.Consolidation:
      return 1 / numberOfInputs;
    case SpendType.MixingOrCoinJoin: {
      const x = Math.pow(numberOfOutputs, 2) / numberOfInputs;
      return ((1 / 2) * x) / (1 + x);
    }
    default:
      throw new Error("Invalid spend type");
  }
}

export function getInputWeight(
      scriptType: MultisigAddressType,
  config: { requiredSignerCount: number; totalSignerCount: number },
):number {
    let vsize: number;
  if (scriptType === "P2SH") {
    const signatureLength = 72 + 1; // approx including push byte
    const keylength = 33 + 1; // push byte
    vsize =
      signatureLength * config.requiredSignerCount +
      keylength * config.totalSignerCount;
  } else if (scriptType === "P2WSH") {
    let total = 0;
    total += 1; // segwit marker
    total += 1; // segwit flag
    total += getWitnessSize(
      config.requiredSignerCount,
      config.totalSignerCount,
    );
    vsize = total;
  } else if (scriptType === "P2SH-P2WSH") {
    const signatureLength = 72;
    const keylength = 33;
    const witnessSize =
      signatureLength * config.requiredSignerCount +
      keylength * config.totalSignerCount;
    vsize = Math.ceil(0.25 * witnessSize);
  } else if (scriptType === "P2TR") {
    // Reference : https://bitcoin.stackexchange.com/questions/111395/what-is-the-weight-of-a-p2tr-input
    // Optimistic key-path-spend input size
    vsize = 57.5;
  } else if (scriptType === "P2PKH") {
    // Reference : https://medium.com/coinmonks/on-bitcoin-transaction-sizes-97e31bc9d816
    vsize = 131.5;
  } else {
    vsize = 546; // Worst Case
  }
  return vsize;
}