import { FeeRatePercentile, Transaction } from "@caravan/clients";
import { AddressUtxos } from "./types";
import { WalletMetrics } from "../dist";

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
  relativeFeesScore(
    transactions: Transaction[],
    feeRatePercentileHistory: FeeRatePercentile[],
  ): number {
    let sumRFS: number = 0;
    let numberOfSendTx: number = 0;
    for (const tx of transactions) {
      if (tx.isSend === true) {
        numberOfSendTx++;
        let feeRate: number = this.getFeeRateForTransaction(tx);
        let RFS: number = this.getFeeRatePercentileScore(
          tx.blocktime,
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
      Fees To Amount Ration (F.A.R)

    Definition : 
      Ratio of the fees paid by the wallet transactions to the amount spent in the transaction.

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
  feesToAmountRatio(transactions: Transaction[]): number {
    let sumFeesToAmountRatio: number = 0;
    let numberOfSendTx: number = 0;
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
      Spend Waste Score (S.W.S)

    Definition : 
      A score that indicates whether it is economical to spend a particular output now 
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
      spend waste score = consolidation factor + cost of transaction
      spend waste score = weight (fee rate - estimatedLongTermFeeRate) + change + excess

    Observation :
      Depending on the fee rate in the long term, the consolidation factor can either be positive or negative.		
		    fee rate (current) < estimatedLongTermFeeRate (long-term fee rate)  –-> Consolidate now (-ve)
		    fee rate (current) > estimatedLongTermFeeRate (long-term fee rate)  –-> Wait for later when fee rate go low (+ve) 

  */
  spendWasteAmount(
    weight: number, // Estimated weight of the transaction
    feeRate: number, // Current Fee rate for the transaction
    inputAmountSum: number, // Sum of amount for each coin in input of the transaction
    spendAmount: number, // Exact Amount wanted to be spent in the transaction
    estimatedLongTermFeeRate: number, // Long term estimated fee-rate
  ): number {
    let costOfTx: number = Math.abs(spendAmount - inputAmountSum);
    return weight * (feeRate - estimatedLongTermFeeRate) + costOfTx;
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
  weightedWasteScore(
    transactions: Transaction[],
    utxos: AddressUtxos,
    feeRatePercentileHistory: FeeRatePercentile[],
  ): number {
    let RFS = this.relativeFeesScore(transactions, feeRatePercentileHistory);
    let FAR = this.feesToAmountRatio(transactions);
    let UMF = 0;
    return 0.35 * RFS + 0.35 * FAR + 0.3 * UMF;
  }
}
