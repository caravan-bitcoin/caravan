import { SpendType } from "./types";

/*
    Name : Spend Type Determination

    Definition :
      The type of spend transaction is obtained based on the number of inputs and outputs which 
      influence the topology type of the transaction and has a role in determining the fingerprints
      behind privacy for wallets.

    Calculation :
      We have 5 categories of transaction type each with their own impact on privacy score
      - Perfect Spend (1 input, 1 output)
      - Simple Spend (1 input, 2 outputs)
      - UTXO Fragmentation (1 input, more than 2 standard outputs)
      - Consolidation (more than 1 input, 1 output)
      - CoinJoin or Mixing (more than 1 input, more than 1 output)
  */
export function determineSpendType(inputs: number, outputs: number): SpendType {
  if (inputs === 1) {
    if (outputs === 1) return SpendType.PerfectSpend;
    if (outputs === 2) return SpendType.SimpleSpend;
    return SpendType.UTXOFragmentation;
  } else {
    if (outputs === 1) return SpendType.Consolidation;
    return SpendType.MixingOrCoinJoin;
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
