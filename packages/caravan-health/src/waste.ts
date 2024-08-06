import { FeeRatePercentile, Transaction } from "@caravan/clients";
import { utxoSetLengthScore } from "./privacy";
import { AddressUtxos } from "./types";

/*
Utility function that helps to obtain the fee rate of the transaction

Expected Range : [0, 0.75]
-> Very Poor : [0, 0.15]
-> Poor : (0.15, 0.3]
-> Moderate : (0.3, 0.45]
-> Good : (0.45, 0.6]
-> Very Good : (0.6, 0.75]
*/
function getFeeRateForTransaction(transaction: Transaction): number {
  let fees: number = transaction.fee;
  let weight: number = transaction.weight;
  return fees / weight;
}

/* 
Utility function that helps to obtain the percentile of the fees paid by user in tx block

Expected Range : [0, 0.75]
-> 0% tile : 1
-> 10% tile : 0.9
-> 25% tile : 0.75
-> 50% tile : 0.5
-> 75% tile : 0.25
-> 90% tile : 0.1
-> 100% tile : 0.05
*/
function getFeeRatePercentileScore(
  timestamp: number,
  feeRate: number,
  feeRatePercentileHistory: FeeRatePercentile[],
): number {
  let percentile: number = getPercentile(
    timestamp,
    feeRate,
    feeRatePercentileHistory,
  );
  return 1-(percentile/100);
}

function getPercentile(
  timestamp: number,
  feeRate: number,
  feeRatePercentileHistory: FeeRatePercentile[],
): number {
  // Find the closest entry by timestamp
  let closestBlock: FeeRatePercentile | null = null;
  let closestDifference: number = Infinity;

  for (const block of feeRatePercentileHistory) {
    const difference = Math.abs(block.timestamp - timestamp);
    if (difference <= closestDifference) {
      closestDifference = difference;
      closestBlock = block;
    }
  }
  if (!closestBlock) {
    throw new Error("No fee rate data found");
  }
  // Find the closest fee rate percentile
  switch (true) {
    case feeRate <= closestBlock.avgFee_0:
      return 0;
    case feeRate <= closestBlock.avgFee_10:
      return 10;
    case feeRate <= closestBlock.avgFee_25:
      return 25;
    case feeRate <= closestBlock.avgFee_50:
      return 50;
    case feeRate <= closestBlock.avgFee_75:
      return 75;
    case feeRate <= closestBlock.avgFee_90:
      return 90;
    case feeRate <= closestBlock.avgFee_100:
      return 100;
    default:
      throw new Error("Invalid fee rate");
  }
}

/*
R.F.S can be associated with all the transactions and we can give a measure 
if any transaction was done at expensive fees or nominal fees.

This can be done by calculating the percentile of the fees paid by the user
in the block of the transaction.

Expected Range : [0, 1]
-> Very Poor : [0, 0.2]
-> Poor : (0.2, 0.4]
-> Moderate : (0.4, 0.6]
-> Good : (0.6, 0.8]
-> Very Good : (0.8, 1]
*/
export function relativeFeesScore(
  transactions: Transaction[],
  feeRatePercentileHistory: FeeRatePercentile[],
): number {
  let sumRFS: number = 0;
  let numberOfSendTx: number = 0;
  for (const tx of transactions) {
    if (tx.isSend === true) {
      numberOfSendTx++;
      let feeRate: number = getFeeRateForTransaction(tx);
      let RFS: number = getFeeRatePercentileScore(
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
The measure of how much the wallet is affected by fees is determined by the ratio of the amount paid to the fees incurred.

Mastercard charges 0.6% cross-border fee for international transactions in US dollars, 
but if the transaction is in any other currency the fee goes up to 1%. 
Source : https://www.clearlypayments.com/blog/what-are-cross-border-fees-in-credit-card-payments/

This ratio is a measure of transaction fees compared with market rates for fiat processing fees.
*/
export function feesToAmountRatio(transactions: Transaction[]): number {
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
Consider the waste score of the transaction which can inform whether or not it is economical to spend a
particular output now (assuming fees are currently high) or wait to consolidate it later when fees are low.

waste score = consolidation factor + cost of transaction
waste score = weight (fee rate - L) + change + excess

weight: Transaction weight units
feeRate: the transaction's target fee rate
L: the long-term fee rate estimate which the wallet might need to pay to redeem remaining UTXOs
change: the cost of creating and spending a change output
excess: the amount by which we exceed our selection target when creating a changeless transaction, 
mutually exclusive with cost of change

“excess” is if we don't make a change output and instead add the difference to the fees.
If there is a change in output then the excess should be 0. 
“change” includes the fees paid on this transaction's change output plus the fees that 
will need to be paid to spend it later. Thus the quantity cost of  transaction is always a positive number.

Depending on the fee rate in the long term, the consolidation factor can either be positive or negative.		
		fee rate (current) < L (long-term fee rate)  –-> Consolidate now (-ve)
		fee rate (current) > L (long-term fee rate)  –-> Wait for later when fee rate go low (+ve)
*/
export function wasteMetric(
  transaction: Transaction, // Amount that UTXO holds
  amount: number, // Amount to be spent in the transaction
  L: number, // Long term estimated fee-rate
): number {
  let weight: number = transaction.weight;
  let feeRate: number = getFeeRateForTransaction(transaction);
  let costOfTx: number = Math.abs(amount - transaction.amount);
  return weight * (feeRate - L) + costOfTx;
}

/*
35% Weightage of fees score depends on Percentile of fees paid
35% Weightage of fees score depends fees paid with respect to amount spend
30% Weightage of fees score depends on the number of UTXOs present in the wallet.

Q : What role does W plays in the fees score?
Assume the wallet is being consolidated, Thus number of UTXO will decrease and thus 
W (Weightage of number of UTXO) will increase and this justifies that, consolidation 
increases the fees health since you don’t overpay them in long run.

Expected Range : [0, 1]
-> Very Poor : [0, 0.2]
-> Poor : (0.2, 0.4]
-> Moderate : (0.4, 0.6]
-> Good : (0.6, 0.8]
-> Very Good : (0.8, 1]
*/
export async function feesScore(
  transactions: Transaction[],
  utxos: AddressUtxos,
  feeRatePercentileHistory: FeeRatePercentile[],
): Promise<number> {
  let RFS: number = relativeFeesScore(transactions, feeRatePercentileHistory);
  let FAR: number = feesToAmountRatio(transactions);
  let W: number = utxoSetLengthScore(utxos);
  return 0.35 * RFS + 0.35 * FAR + 0.3 * W;
}
