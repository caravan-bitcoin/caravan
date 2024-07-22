import { BlockchainClient } from "@caravan/clients";
import { utxoSetLengthScore } from "./privacy";
import { Transaction, AddressUtxos } from "./types";

// Utility function that helps to obtain the fee rate of the transaction
function getFeeRateForTransaction(transaction: Transaction): number {
  // TODO : Please check that do we really get the fee rate and weight both from the transaction object
  // No we don't get fees
  let fees: number = transaction.fee;
  let weight: number = transaction.weight;
  return fees / weight;
}

// Utility function that helps to obtain the percentile of the fees paid by user in tx block
async function getFeeRatePercentileScore(
  timestamp: number,
  feeRate: number,
  client: BlockchainClient
) {
  let percentile: number = await client.getFeeRatePercentileForTransaction(
    timestamp,
    feeRate
  );
  switch (percentile) {
    case 10:
      return 1;
    case 25:
      return 0.9;
    case 50:
      return 0.75;
    case 75:
      return 0.5;
    case 90:
      return 0.25;
    case 100:
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
export async function relativeFeesScore(
  transactions: Transaction[],
  client: BlockchainClient
): Promise<number> {
  let sumRFS: number = 0;
  let numberOfSendTx: number = 0;
  for (const tx of transactions) {
    if (tx.isSend === true) {
      numberOfSendTx++;
      let feeRate: number = getFeeRateForTransaction(tx);
      let RFS: number = await getFeeRatePercentileScore(
        tx.blocktime,
        feeRate,
        client
      );
      sumRFS += RFS;
    }
  }
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
35% Weightage of fees score depends on Percentile of fees paid
35% Weightage of fees score depends fees paid with respect to amount spend
30% Weightage of fees score depends on the number of UTXOs present in the wallet.

Q : What role does W plays in the fees score?
Assume the wallet is being consolidated, Thus number of UTXO will decrease and thus 
W (Weightage of number of UTXO) will increase and this justifies that, consolidation 
increases the fees health since you don’t overpay them in long run.
*/
export async function feesScore(
  transactions: Transaction[],
  utxos: AddressUtxos,
  client: BlockchainClient
): Promise<number> {
  let RFS: number = await relativeFeesScore(transactions, client);
  let FAR: number = feesToAmountRatio(transactions);
  let W: number = utxoSetLengthScore(utxos);
  return 0.35 * RFS + 0.35 * FAR + 0.3 * W;
}
