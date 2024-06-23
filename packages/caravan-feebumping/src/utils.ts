import { Transaction } from "bitcoinjs-lib-v5";

export function calculateTransactionSize(transaction: Transaction): number {
  // Use bitcoinjs-lib's Transaction.virtualSize() method
  return transaction.virtualSize();
}

export function calculateEffectiveFeeRate(transaction: Transaction): number {
  const size = calculateTransactionSize(transaction);
  const fee =
    transaction.ins.reduce((total, input) => {
      // will need to fetch the input amounts
      return total + 0; // Placeholder
    }, 0) - transaction.outs.reduce((total, output) => total + output.value, 0);

  return Math.floor(fee / size);
}

export function isTransactionConfirmed(
  transaction: Transaction,
  client: BlockchainClient
): Promise<boolean> {
  // Check if the transaction is confirmed
}
