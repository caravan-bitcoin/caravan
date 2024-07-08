import { utxoSetLengthWeight } from "./privacy";

function getFeeRateForTransaction(transaction: any): number {
  // TODO : Please check that do we really get the fee rate and weight both from the transaction object
  let fees: number = transaction.fee;
  let weight: number = transaction.weight;
  return fees / weight;
}

// Function to call the Mempool block fee rates
async function getFeeRatePercentileForTransaction(
  timestamp: any,
  feeRate: number
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

export function RelativeFeesScore(transactions: Array<any>): number {
  let sumRFS: number = 0;
  let numberOfSendTx: number = 0;
  transactions.forEach(async (tx: any) => {
    if (tx.category == "send") {
      numberOfSendTx++;
      let feeRate: number = getFeeRateForTransaction(tx);
      let RFS: number = await getFeeRatePercentileForTransaction(
        tx.blocktime,
        feeRate
      );
      sumRFS += RFS;
    }
  });
  return sumRFS / numberOfSendTx;
}

export function feesToAmountRatio(transactions: Array<any>): number {
  let sumFeesToAmountRatio: number = 0;
  let numberOfSendTx: number = 0;
  transactions.forEach((tx: any) => {
    if (tx.category === "send") {
      sumFeesToAmountRatio += tx.fee / tx.amount;
      numberOfSendTx++;
    }
  });
  return sumFeesToAmountRatio / numberOfSendTx;
}

export function feesScore(transactions: Array<any>, utxos: Array<any>): number {
  let RFS: number = RelativeFeesScore(transactions);
  let FAR: number = feesToAmountRatio(transactions);
  let W : number = utxoSetLengthWeight(utxos);
  return (0.35* RFS) + (0.35 * FAR) + (0.3 * W);
}
