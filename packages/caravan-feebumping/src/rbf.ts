import { unsignedMultisigTransaction } from "@caravan/bitcoin";
import { Transaction } from "bitcoinjs-lib-v5";
import { RBFOptions } from "./types";
import { calculateTransactionSize } from "./utils";

export async function createRBFTransaction(
  options: RBFOptions
): Promise<Transaction> {
  const {
    originalTransaction,
    newFeeRate,
    cancelTransaction,
    network,
    client,
  } = options;

  // Use unsignedMultisigTransaction from @caravan/bitcoin to create the new transaction
  const newInputs = originalTransaction.ins.map((input) => ({
    txid: input.hash.reverse().toString("hex"),
    index: input.index,
    // need to fetch or calculate these values
    amountSats: 0, // Placeholder
    transactionHex: "", // Placeholder
    multisig: null, // Placeholder
  }));

  const newOutputs = cancelTransaction
    ? [{ address: "CHANGE_ADDRESS", amountSats: 0 }] // Placeholder
    : originalTransaction.outs.map((output) => ({
        address: "", // Placeholder
        amountSats: output.value,
      }));

  const newTransaction = unsignedMultisigTransaction(
    network,
    newInputs,
    newOutputs
  );

  // Set nSequence to signal RBF
  newTransaction.ins.forEach((input) => {
    input.sequence = 0xfffffffd;
  });

  // Calculate and set the new fee
  const transactionSize = calculateTransactionSize(newTransaction);
  const newFee = Math.ceil(transactionSize * newFeeRate);

  // Adjust output amounts to account for the new fee
  // This is a simplified version and might need more complex logic
  if (!cancelTransaction) {
    newTransaction.outs[newTransaction.outs.length - 1].value -= newFee;
  }

  return newTransaction;
}

export function isTransactionRBF(transaction: Transaction): boolean {
  return transaction.ins.some((input) => input.sequence < 0xfffffffe);
}
