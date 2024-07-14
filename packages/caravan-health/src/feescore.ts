import { utxoSetLengthWeight } from "./privacy";

// Utility function that helps to obtain the fee rate of the transaction
function getFeeRateForTransaction(transaction: any): number {
  // TODO : Please check that do we really get the fee rate and weight both from the transaction object
  let fees: number = transaction.fee;
  let weight: number = transaction.weight;
  return fees / weight;
}

// TODO : Implement Caching or Ticker based mechanism to reduce network latency
// Utility function that helps to obtain the percentile of the fees paid by user in tx block
async function getFeeRatePercentileForTransaction(
  timestamp: any,
  feeRate: number,
) {
  const url: string =
    "https://mempool.space/api/v1/mining/blocks/fee-rates/all";
  const headers: Headers = new Headers();
  headers.set("Content-Type", "application/json");

  const response: Response = await fetch(url, {
    method: "GET",
    headers: headers,
  });

  const data: Array<any> = await response.json();

  // Find the closest entry by timestamp
  let closestEntry: any;
  let closestDifference: number = Infinity;

  data.forEach((item) => {
    const difference = Math.abs(item.timestamp - timestamp);
    if (difference < closestDifference) {
      closestDifference = difference;
      closestEntry = item;
    }
  });

  switch (true) {
    case feeRate < closestEntry.avgFee_10:
      return 1;
    case feeRate < closestEntry.avgFee_25:
      return 0.9;
    case feeRate < closestEntry.avgFee_50:
      return 0.75;
    case feeRate < closestEntry.avgFee_75:
      return 0.5;
    case feeRate < closestEntry.avgFee_90:
      return 0.25;
    case feeRate < closestEntry.avgFee_100:
      return 0.1;
    default:
      return 0;
  }
}

/*
R.F.S can be associated with all the transactions and we can give a measure 
if any transaction was done at expensive fees or nominal fees.

This can be done by calculating the percentile of the fees paid by the user
in the block of the transaction.
*/
export function relativeFeesScore(transactions: Array<any>): number {
  let sumRFS: number = 0;
  let numberOfSendTx: number = 0;
  transactions.forEach(async (tx: any) => {
    if (tx.category == "send") {
      numberOfSendTx++;
      let feeRate: number = getFeeRateForTransaction(tx);
      let RFS: number = await getFeeRatePercentileForTransaction(
        tx.blocktime,
        feeRate,
      );
      sumRFS += RFS;
    }
  });
  return sumRFS / numberOfSendTx;
}

/* 
Measure of how much the wallet is burning in fees is that we take the ratio of 
amount being paid and the fees consumed.

Mastercard charges 0.6% cross-border fee for international transactions in US dollars, 
but if the transaction is in any other currency the fee goes up to 1%. 
Source : https://www.clearlypayments.com/blog/what-are-cross-border-fees-in-credit-card-payments/

This ratio is a measure of our fees spending against the fiat charges we pay.
*/
export function feesToAmountRatio(transactions: Array<any>): number {
  let sumFeesToAmountRatio: number = 0;
  let numberOfSendTx: number = 0;
  transactions.forEach((tx: any) => {
    if (tx.category === "send") {
      sumFeesToAmountRatio += tx.fee / tx.amount;
      numberOfSendTx++;
    }
  });
  return 100 * (sumFeesToAmountRatio / numberOfSendTx);
}

/*
35% Weightage of fees score depends on Percentile of fees paid
35% Weightage of fees score depends fees paid with respect to amount spend
30% Weightage of fees score depends on the number of UTXOs present in the wallet.

Q : What role does W plays in the fees score?
Assume the wallet is being consolidated, Thus number of UTXO will decrease and thus 
W (Weightage of number of UTXO) will increase and this justifies that, consolidation 
increases the fees health since you don’t overpay them in long run.
*/
export function feesScore(transactions: Array<any>, utxos: Array<any>): number {
  let RFS: number = relativeFeesScore(transactions);
  let FAR: number = feesToAmountRatio(transactions);
  let W: number = utxoSetLengthWeight(utxos);
  return 0.35 * RFS + 0.35 * FAR + 0.3 * W;
}
