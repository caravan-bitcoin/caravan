import { SpendType, MultisigAddressType, Network, Transaction } from "./types";
import { getAddressType } from "@caravan/bitcoin";
import { WalletMetrics } from "./wallet";
import { determineSpendType, getSpendTypeScore } from "./utility";

// Deniability Factor is a normalizing quantity that increases the score by a certain factor in cases of self-payment.
// More about deniability : https://www.truthcoin.info/blog/deniability/
const DENIABILITY_FACTOR = 1.5;

export class PrivacyMetrics extends WalletMetrics {
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
      numberOfInputs,
      numberOfOutputs,
    );

    if (spendType === SpendType.Consolidation) {
      return score;
    }
    for (const output of transaction.vout) {
      const address = output.scriptPubkeyAddress;
      const isResued = this.isReusedAddress(address);
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
  getMeanTopologyScore(): number {
    let privacyScore = 0;
    const transactions = this.transactions;
    for (const tx of transactions) {
      const topologyScore = this.getTopologyScore(tx);
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
  addressReuseFactor(): number {
    let reusedAmount: number = 0;
    let totalAmount: number = 0;
    const utxos = this.utxos;
    for (const address in utxos) {
      const addressUtxos = utxos[address];
      for (const utxo of addressUtxos) {
        totalAmount += utxo.value;
        const isReused = this.isReusedAddress(address);
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
      The address type factor evaluates the address type distribution of the wallet transactions. 
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
    const transactions = this.transactions;
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
  utxoSpreadFactor(): number {
    const amounts: number[] = [];
    const utxos = this.utxos;
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
    Name : UTXO Value Dispersion Factor

    Definition :
      The UTXO value dispersion factor is a combination of UTXO Spread Factor and UTXO Mass Factor.
      It signifies the combined effect of how much variance there is in the UTXO Set values and 
      the total number of UTXOs there are.

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
  utxoValueDispersionFactor(): number {
    const UMF: number = this.utxoMassFactor();
    const USF: number = this.utxoSpreadFactor();
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
    walletAddressType: MultisigAddressType,
    network: Network,
  ): number {
    const meanTopologyScore = this.getMeanTopologyScore();
    const ARF = this.addressReuseFactor();
    const ATF = this.addressTypeFactor(walletAddressType, network);
    const UVDF = this.utxoValueDispersionFactor();

    const WPS: number =
      (meanTopologyScore * (1 - 0.5 * ARF) + 0.1 * (1 - ARF)) * (1 - ATF) +
      0.1 * UVDF;

    return WPS;
  }
}
