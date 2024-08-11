import { FeeRatePercentile, Transaction } from "@caravan/clients";

/*
Utility function that helps to obtain the fee rate of the transaction

Expected Range : [0, 0.75]
-> Very Poor : [0, 0.15]
-> Poor : (0.15, 0.3]
-> Moderate : (0.3, 0.45]
-> Good : (0.45, 0.6]
-> Very Good : (0.6, 0.75]
*/
export function getFeeRateForTransaction(transaction: Transaction): number {
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
export function getFeeRatePercentileScore(
  timestamp: number,
  feeRate: number,
  feeRatePercentileHistory: FeeRatePercentile[],
): number {
  let percentile: number = getPercentile(
    timestamp,
    feeRate,
    feeRatePercentileHistory,
  );
  return 1 - percentile / 100;
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
