import { Transaction } from "bitcoinjs-lib-v5";
import BigNumber from "bignumber.js";
import { UTXO } from "./types";
import { DEFAULT_RBF_SEQUENCE } from "./constants";

export function calculateEffectiveFeeRate(
  transaction: Transaction,
  utxos: UTXO[]
): number {
  const fee = calculateTransactionFee(transaction, utxos);
  const weight = transaction.weight();
  return fee.dividedBy(weight).multipliedBy(4).toNumber(); // Convert to sat/vB
}

export function calculateTransactionFee(
  transaction: Transaction,
  inputs: UTXO[]
): BigNumber {
  const totalIn = inputs.reduce(
    (sum, input) => sum.plus(input.amountSats),
    new BigNumber(0)
  );
  const totalOut = transaction.outs.reduce(
    (sum, output) => sum.plus(new BigNumber(output.value)),
    new BigNumber(0)
  );
  return totalIn.minus(totalOut);
}

export function isRBFSignaled(transaction: Transaction): boolean {
  return transaction.ins.some((input) => input.sequence < DEFAULT_RBF_SEQUENCE);
}

export function enableRBFSignaling(transaction: Transaction): Transaction {
  const rbfTransaction = transaction.clone();
  rbfTransaction.ins.forEach((input) => {
    input.sequence = DEFAULT_RBF_SEQUENCE;
  });
  return rbfTransaction;
}
