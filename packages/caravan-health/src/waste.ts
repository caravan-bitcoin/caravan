import { FeeRatePercentile, Transaction, MultisigAddressType } from "./types";
import { WalletMetrics } from "./wallet";
import { getWitnessSize } from "@caravan/bitcoin";

export class WasteMetrics extends WalletMetrics {
  /*
    Name : 
      Relative Fees Score (R.F.S)

    Definition : 
      Comparision of the fees paid by the wallet transactions in a block relative to 
      the fees paid by other transactions in the same block on the same network.

    Calculation : 
      We take the percentile value of the fees paid by the user in the block of the transaction. 
      And then we obtain the mean percentile score for all the transaction done in a wallet.

    Expected Range : [0, 1]
    -> Very Poor : [0, 0.2]
    -> Poor : (0.2, 0.4]
    -> Moderate : (0.4, 0.6]
    -> Good : (0.6, 0.8]
    -> Very Good : (0.8, 1]
  */
  relativeFeesScore(feeRatePercentileHistory: FeeRatePercentile[]): number {
    let sumRFS: number = 0;
    let numberOfSendTx: number = 0;
    const transactions = this.transactions;
    for (const tx of transactions) {
      if (tx.isSend === true) {
        numberOfSendTx++;
        const feeRate: number = this.getFeeRateForTransaction(tx);
        const RFS: number = this.getFeeRatePercentileScore(
          tx.block_time,
          feeRate,
          feeRatePercentileHistory,
        );
        sumRFS += RFS;
      }
    }
    return sumRFS / numberOfSendTx;
  }

  /*
    Name : 
      Fees To Amount Ratio (F.A.R)

    Definition : 
      Ratio of the fees paid by the wallet transactions to the amount spent in the transaction.
      
      In the future, we can make this more accurate by comparing fees to the fee market at the time the transaction was sent. This will indicate if transactions typically pay within or out of the range of the rest of the market. 

    Calculation : 
      We can compare this ratio against the fiat charges for cross-border transactions.
      Mastercard charges 0.6% cross-border fee for international transactions in US dollars, 
      but if the transaction is in any other currency the fee goes up to 1%. 
      Source : https://www.clearlypayments.com/blog/what-are-cross-border-fees-in-credit-card-payments/

    Expected Range : [0, 1]
    -> Very Poor : [1, 0.01] // More than 1% amount paid as fees. In ratio 1% is 0.01 and so on for other range
    -> Poor : (0.01, 0.0075]
    -> Moderate : (0.0075, 0.006]
    -> Good : (0.006, 0.001]
    -> Very Good : (0.001, 0)
  */
  feesToAmountRatio(): number {
    let sumFeesToAmountRatio: number = 0;
    let numberOfSendTx: number = 0;
    const transactions = this.transactions;
    transactions.forEach((tx: Transaction) => {
      if (tx.isSend === true) {
        sumFeesToAmountRatio += tx.fee / tx.amount;
        numberOfSendTx++;
      }
    });
    return sumFeesToAmountRatio / numberOfSendTx;
  }

  /*
    Name : 
      Spend Waste Amount (S.W.A)

    Definition : 
      A quantity that indicates whether it is economical to spend a particular output now in a given transaction
      or wait to consolidate it later when fees could be low.
      
    Important Terms:
      - Weight:
          Transaction weight units
      - Fee Rate:
          The transaction's target fee rate (current fee-rate of the network)
      - Estimated Long Term Fee Rate:
          The long-term fee rate estimate which the wallet might need to pay 
          to redeem remaining UTXOs.
          Reference : https://bitcoincore.reviews/17331#l-164
          It is the upper bound for spending the UTXO in the future.
      - Change:
          The cost of creating and spending a change output. It includes the fees paid 
          on this transaction's change output plus the fees that will need to be paid 
          to spend it later.
      - Excess:
          The amount by which we exceed our selection target when creating a changeless transaction, 
          mutually exclusive with cost of change. It is extra fees paid if we don't make a change output 
          and instead add the difference to the fees.
      - Input Amount :
          Sum of amount for each coin in input of the transaction
      - Spend Amount :
          Exact amount wanted to be spent in the transaction.

    Calculation :
      spend waste amount = consolidation factor + cost of transaction
      spend waste amount = weight (fee rate - estimatedLongTermFeeRate) + change + excess

    Observation :
      Depending on the fee rate in the long term, the consolidation factor can either be positive or negative.		
		    fee rate (current) < estimatedLongTermFeeRate (long-term fee rate)  –-> Consolidate now (-ve)
		    fee rate (current) > estimatedLongTermFeeRate (long-term fee rate)  –-> Wait for later when fee rate go low (+ve) 

  */
  spendWasteAmount(
    weight: number, // Estimated weight of the transaction
    feeRate: number, // Current fee rate for the transaction
    inputAmountSum: number, // Sum of amount for each coin in input of the transaction
    spendAmount: number, // Exact amount wanted to be spent in the transaction
    estimatedLongTermFeeRate: number, // Long term estimated fee-rate
  ): number {
    const costOfTx: number = Math.abs(spendAmount - inputAmountSum);
    return weight * (feeRate - estimatedLongTermFeeRate) + costOfTx;
  }

  /*
    Name : calculateDustLimits
    Definition : 
      Dust limits are the limits that help to determine the lower and upper limit of the UTXO 
      that can be spent economically.
      The lower limit is below which the UTXO will actually behave as a dust output and the 
      upper limit is above which the UTXO will be safe and economical to spend.

    Calculation :
      lowerLimit - Below which the UTXO will actually behave as a dust output.
      upperLimit - Above which the UTXO will be safe and economical to spend.
      config - It takes two parameters, requiredSignerCount and totalSignerCount
        Eg : For a 2-of-3 Multisig wallet the config will be 
        config : {requiredSignerCount: 2, totalSignerCount: 3}
      riskMultiplier - 
        The riskMultiplier is a factor that scales the lower limit of a UTXO to determine its 
        upper limit. Based on their risk tolerance and expected fee volatility, a higher 
        multiplier provides a greater buffer but may unnecessarily categorize some UTXOs as 
        safe that could otherwise be considered risky.  The default value is set to 2 as a 
        balanced approach. It doubles the lower limit, providing a reasonable buffer for most 
        common fee scenarios without being overly conservative.


      lowerLimit = input_size (vB) * feeRate (sats/vByte)
      upperLimit = lowerLimit * riskMultiplier

  */
  calculateDustLimits(
    feeRate: number,
    scriptType: MultisigAddressType,
    config: {
      requiredSignerCount: number;
      totalSignerCount: number;
    },
    riskMultiplier: number = 2,
  ): { lowerLimit: number; upperLimit: number } {
    if (riskMultiplier <= 1) {
      throw new Error("Risk Multiplier should be greater than 1");
    }

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
    const lowerLimit: number = vsize * feeRate;
    const upperLimit: number = lowerLimit * riskMultiplier;
    return { lowerLimit, upperLimit };
  }

  /* 
    Name : 
      Weighted Waste Score (W.W.S)

    Definition : 
      A score that indicates the overall waste of the wallet based on the relative fees score, 
      fees to amount ratio and the UTXO mass factor.

    Calculation : 
      weighted waste score = 0.35 * RFS + 0.35 * FAR + 0.3 * UMF

    Expected Range : [0, 1]
    -> Very Poor : [0, 0.2]
    -> Poor : (0.2, 0.4]
    -> Moderate : (0.4, 0.6]
    -> Good : (0.6, 0.8]
    -> Very Good : (0.8, 1]
  */

  weightedWasteScore(feeRatePercentileHistory: FeeRatePercentile[]): number {
    const RFS = this.relativeFeesScore(feeRatePercentileHistory);
    const FAR = this.feesToAmountRatio();
    const UMF = this.utxoMassFactor();
    return 0.35 * RFS + 0.35 * FAR + 0.3 * UMF;
  }
}
