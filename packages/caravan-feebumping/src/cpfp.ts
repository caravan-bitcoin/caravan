import { unsignedMultisigTransaction } from "@caravan/bitcoin";
import { Transaction } from "bitcoinjs-lib-v5";
import { CPFPOptions } from "./types";
import { calculateTransactionSize } from "./utils";

export async function createCPFPTransaction(
  options: CPFPOptions
): Promise<Transaction> {
  const { parentTransaction, childFeeRate, network, client } = options;

  // Find the change output from the parent transaction
  const changeOutput = parentTransaction.outs.find((output) => {
    // Logic to determine if this is the change output
    // This might involve checking if the address belongs to the wallet
  });

  if (!changeOutput) {
    throw new Error("No suitable output found for CPFP");
  }

  const childInput = {
    txid: parentTransaction.getId(),
    index: parentTransaction.outs.indexOf(changeOutput),
    amountSats: changeOutput.value,
    transactionHex: parentTransaction.toHex(),
    multisig: null, // will need to provide the correct multisig info here
  };

  const childOutput = {
    address: "CHANGE_ADDRESS", // will need to provide a proper change address
    amountSats: changeOutput.value, // This will be adjusted for the fee
  };

  const childTransaction = unsignedMultisigTransaction(
    network,
    [childInput],
    [childOutput]
  );

  // Calculate and set the fee
  const transactionSize = calculateTransactionSize(childTransaction);
  const fee = Math.ceil(transactionSize * childFeeRate);
  childTransaction.outs[0].value -= fee;

  return childTransaction;
}

export function canApplyCPFP(transaction: Transaction): boolean {
  // Check if the transaction has any outputs that we control
  // This might involve checking if any output addresses belong to the wallet
  return transaction.outs.some((output) => {
    // Logic to determine if we control this output
  });
}
