import { Transaction } from "@caravan/clients";
import { AddressUtxos } from "./types";
import { MultisigAddressType, Network, getAddressType } from "@caravan/bitcoin";

export class PrivacyMetric {
  /*
    Name : Topology Score

    Definition :
      The score is calculated based on the number of inputs and outputs which 
      influence the topology type of the transaction.

    Calculation :
      We have 5 categories of transaction type each with their own impact on privacy score
      - Perfect Spend (1 input, 1 output)
      - Simple Spend (1 input, 2 outputs)
      - UTXO Fragmentation (1 input, more than 2 standard outputs)
      - Consolidation (more than 1 input, 1 output)
      - CoinJoin or Mixing (more than 1 input, more than 1 output)
  */
  getTopologyScore(transaction: Transaction): number {
    const numberOfInputs: number = transaction.vin.length;
    const numberOfOutputs: number = transaction.vout.length;

    const spendType: SpendType = determineSpendType(
      numberOfInputs,
      numberOfOutputs,
    );
    const score: number = getSpendTypeScore(
      spendType,
      numberOfInputs,
      numberOfOutputs,
    );

    if (spendType === SpendType.Consolidation) {
      return score;
    }
    for (let output of transaction.vout) {
      let address = output.scriptPubkeyAddress;
      let isResued = isReusedAddress(address);
      if (isResued === true) {
        return score;
      }
    }
    return score * DENIABILITY_FACTOR;
  }

  /*
    Name : Mean Transaction Topology Privacy Score (MTPS)

    Definition :
      The mean topology is evaluated for entire wallet history based on 
      the tx toplogy score for each transaction. It signifies how well the 
      transactions were performed to maintain privacy.
    
    Calculation :
      The mean topology score is calculated by evaluating the topology score for each transaction.

    Expected Range : [0, 0.75]
    -> Very Poor : [0, 0.15]
    -> Poor : (0.15, 0.3]
    -> Moderate : (0.3, 0.45]
    -> Good : (0.45, 0.6]
    -> Very Good : (0.6, 0.75)
  */
  getMeanTopologyScore(transactions: Transaction[]): number {
    let privacyScore = 0;
    for (let tx of transactions) {
      let topologyScore = this.getTopologyScore(tx);
      privacyScore += topologyScore;
    }
    return privacyScore / transactions.length;
  }

  /*
    Name : Address Reuse Factor (ARF)

    Definition :
      The address reuse factor is evaluates the amount being held by reused addresses with respect 
      to the total amount. It signifies the privacy health of the wallet based on address reuse.

    Calculation : 
      The factor is calculated by summing the amount held by reused addresses and dividing it 
      by the total amount.

    Expected Range : [0,1]
    -> Very Poor : (0.8, 1]
    -> Poor : [0.6, 0.8)
    -> Moderate : [0.4, 0.6)
    -> Good : [0.2, 0.4)
    -> Very Good : [0 ,0.2) 
  */
  addressReuseFactor(utxos: AddressUtxos): number {
    let reusedAmount: number = 0;
    let totalAmount: number = 0;

    for (const address in utxos) {
      const addressUtxos = utxos[address];
      for (const utxo of addressUtxos) {
        totalAmount += utxo.value;
        let isReused = isReusedAddress(address);
        if (isReused) {
          reusedAmount += utxo.value;
        }
      }
    }
    return reusedAmount / totalAmount;
  }

  /*
    Name : Address Type Factor (ATF)

    Definition :
      The address type factor evaluates the address type distribution of the wallet. 
      It signifies the privacy health of the wallet based on the address types used.

    Calculation :
      It is calculated as 
        ATF= 1/(same+1)
      where "same" denotes the number of output address types matching the input address type. 
      A higher "same" value results in a lower ATF, indicating reduced privacy due to less variety in address types.
      If all are same or all are different address type then there will be no change in the privacy score.

    Expected Range : (0,1]
      -> Very Poor : (0, 0.1]
      -> Poor : [0.1, 0.3)
      -> Moderate : [0.3, 0.4)
      -> Good : [0.4, 0.5)
      -> Very Good : [0.5 ,1] 

  */
  addressTypeFactor(
    transactions: Transaction[],
    walletAddressType: MultisigAddressType,
    network: Network,
  ): number {
    const addressCounts: Record<MultisigAddressType, number> = {
      P2WSH: 0,
      P2SH: 0,
      P2PKH: 0,
      P2TR: 0,
      UNKNOWN: 0,
      "P2SH-P2WSH": 0,
    };

    transactions.forEach((tx) => {
      tx.vout.forEach((output) => {
        const addressType = getAddressType(output.scriptPubkeyAddress, network);
        addressCounts[addressType]++;
      });
    });

    const totalAddresses = Object.values(addressCounts).reduce(
      (a, b) => a + b,
      0,
    );
    const walletTypeCount = addressCounts[walletAddressType];

    if (walletTypeCount === 0 || totalAddresses === walletTypeCount) {
      return 1;
    }
    return 1 / (walletTypeCount + 1);
  }

  /* 
    Name : UTXO Spread Factor

    Definition :
      The spread factor using standard deviation helps in assessing the dispersion of UTXO values.
      In Bitcoin privacy, spreading UTXOs reduces traceability by making it harder for adversaries
      to link transactions and deduce the ownership and spending patterns of users.

    Calculation :
      The spread factor is calculated by evaluating the standard deviation of UTXO values.
      It is calculated as the standard deviation divided by the sum of the standard deviation with 1.

    Expected Range : [0,1)
    -> Very Poor : (0, 0.2]
    -> Poor : [0.2, 0.4)
    -> Moderate : [0.4, 0.6)
    -> Good : [0.6, 0.8)
    -> Very Good : [0.8 ,1] 
  */
  utxoSpreadFactor(utxos: AddressUtxos): number {
    const amounts: number[] = [];
    for (const address in utxos) {
      const addressUtxos = utxos[address];
      addressUtxos.forEach((utxo) => {
        amounts.push(utxo.value);
      });
    }

    const mean: number =
      amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
    const variance: number =
      amounts.reduce((sum, amount) => sum + Math.pow(amount - mean, 2), 0) /
      amounts.length;
    const stdDev: number = Math.sqrt(variance);
    return stdDev / (stdDev + 1);
  }

  /*
    Name : UTXO Mass Factor

    Calculation :
      The mass factor is calculated based on the number of UTXOs in the set.

    Expected Range : [0,1]
    - 0 for UTXO set length >= 50
    - 0.25 for UTXO set length >= 25 and <= 49
    - 0.5 for UTXO set length >= 15 and <= 24
    - 0.75 for UTXO set length >= 5 and <= 14
    - 1 for UTXO set length < 5
  */
  utxoMassFactor(utxos: AddressUtxos): number {
    return utxoSetLengthMass(utxos);
  }

  /*
    Name : UTXO Value Dispersion Factor

    Definition :
      The UTXO value dispersion factor is a combination of UTXO Spread Factor and UTXO Set Length Weight.
      It signifies the combined effect of how much variance is there in the UTXO Set values is and 
      how many number of UTXOs are there.

    Calculation :
      The U.V.D.F is calculated as a combination of UTXO Spread Factor and UTXO Set Length Weight.
      It is calculated as (USF + UMF) * 0.15 - 0.15.

    Expected Range : [-0.15,0.15]
    -> Very Poor : [-0.15, -0.1]
    -> Poor : (-0.1, -0.075]
    -> Moderate : (-0.075, 0)
    -> Good : (0, 0.075]
    -> Very Good : (0.075, 0.15]
  */
  utxoValueDispersionFactor(utxos: AddressUtxos): number {
    let UMF: number = this.utxoMassFactor(utxos);
    let USF: number = this.utxoSpreadFactor(utxos);
    return (USF + UMF) * 0.15 - 0.15;
  }

  /*
    Name : Weighted Privacy Score

    Definition :
      The weighted privacy score is a combination of all the factors calculated above.
      It signifies the overall privacy health of the wallet based on the address reuse, 
      address types and UTXO set fingerprints etc.
    
    Calculation :
      The weighted privacy score is calculated by 
        WPS = (MTPS * (1 - 0.5 * ARF) + 0.1 * (1 - ARF)) * (1 - ATF) + 0.1 * UVDF


  */
  getWalletPrivacyScore(
    transactions: Transaction[],
    utxos: AddressUtxos,
    walletAddressType: MultisigAddressType,
    network: Network,
  ): number {
    let meanTopologyScore = this.getMeanTopologyScore(transactions);
    let ARF = this.addressReuseFactor(utxos);
    let ATF = this.addressTypeFactor(transactions, walletAddressType, network);
    let UVDF = this.utxoValueDispersionFactor(utxos);

    let WPS: number =
      (meanTopologyScore * (1 - 0.5 * ARF) + 0.1 * (1 - ARF)) * (1 - ATF) +
      0.1 * UVDF;

    return WPS;
  }
}

/*
The methodology for calculating a privacy score (p_score) for Bitcoin transactions based 
on the number of inputs and outputs is the primary point to define wallet health for privacy. 
The score is further influenced by several factors such as address reuse, 
address types and UTXO set fingerprints etc.
*/

// A normalizing quantity that increases the score by a certain factor in cases of self-payment.
// More about deniability : https://www.truthcoin.info/blog/deniability/
const DENIABILITY_FACTOR = 1.5;

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
enum SpendType {
  PerfectSpend = "PerfectSpend",
  SimpleSpend = "SimpleSpend",
  UTXOFragmentation = "UTXOFragmentation",
  Consolidation = "Consolidation",
  MixingOrCoinJoin = "MixingOrCoinJoin",
}

function determineSpendType(inputs: number, outputs: number): SpendType {
  if (inputs === 1) {
    if (outputs === 1) return SpendType.PerfectSpend;
    if (outputs === 2) return SpendType.SimpleSpend;
    return SpendType.UTXOFragmentation;
  } else {
    if (outputs === 1) return SpendType.Consolidation;
    return SpendType.MixingOrCoinJoin;
  }
}

export function getSpendTypeScore(
  spendType: SpendType,
  numberOfInputs: number,
  numberOfOutputs: number,
): number {
  switch (spendType) {
    case SpendType.PerfectSpend:
      return 1 / 2;
    case SpendType.SimpleSpend:
      return 4 / 9;
    case SpendType.UTXOFragmentation:
      return 2 / 3 - 1 / numberOfOutputs;
    case SpendType.Consolidation:
      return 1 / numberOfInputs;
    case SpendType.MixingOrCoinJoin:
      let x = Math.pow(numberOfOutputs, 2) / numberOfInputs;
      return ((2 / 3) * x) / (1 + x);
    default:
      throw new Error("Invalid spend type");
  }
}

function isReusedAddress(address: string): boolean {
  // TODO :  Implement a function to check if the address is reused
  return false;
}

export function utxoSetLengthMass(utxos: AddressUtxos): number {
  let utxoSetLength = 0;
  for (const address in utxos) {
    const addressUtxos = utxos[address];
    utxoSetLength += addressUtxos.length;
  }
  let utxoMassFactor: number;
  if (utxoSetLength >= 50) {
    utxoMassFactor = 0;
  } else if (utxoSetLength >= 25 && utxoSetLength <= 49) {
    utxoMassFactor = 0.25;
  } else if (utxoSetLength >= 15 && utxoSetLength <= 24) {
    utxoMassFactor = 0.5;
  } else if (utxoSetLength >= 5 && utxoSetLength <= 14) {
    utxoMassFactor = 0.75;
  } else {
    utxoMassFactor = 1;
  }
  return utxoMassFactor;
}
