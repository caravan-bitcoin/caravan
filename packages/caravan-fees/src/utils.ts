import { Transaction } from "bitcoinjs-lib-v5";
import BigNumber from "bignumber.js";
import { UTXO } from "./types";
import { SATS_PER_BTC, DEFAULT_RBF_SEQUENCE } from "./constants";

export function calculateTransactionFee(
  transaction: Transaction,
  inputs: UTXO[]
): BigNumber {
  const totalIn = inputs.reduce(
    (sum, input) => sum.plus(input.value),
    new BigNumber(0)
  );
  const totalOut = transaction.outs.reduce(
    (sum, output) => sum.plus(new BigNumber(output.value)),
    new BigNumber(0)
  );
  return totalIn.minus(totalOut);
}

export function estimateTransactionVsize(
  inputCount: number,
  outputCount: number
): number {
  // Will need to update this
  const baseSize = 10; // Version (4 bytes) + Locktime (4 bytes) + Input count (1 byte) + Output count (1 byte)
  const inputSize = 180; // Assuming P2SH multisig input
  const outputSize = 34; // Assuming P2PKH output

  return Math.ceil(
    (baseSize + inputCount * inputSize + outputCount * outputSize) * 1.05
  ); // Adding 5% buffer
}

export function satoshisToBitcoins(satoshis: BigNumber): BigNumber {
  return satoshis.dividedBy(SATS_PER_BTC);
}

export function bitcoinsToSatoshis(bitcoins: BigNumber): BigNumber {
  return bitcoins.multipliedBy(SATS_PER_BTC);
}

export function isRBFSignaled(transaction: Transaction): boolean {
  return transaction.ins.some((input) => input.sequence < 0xfffffffe);
}

export function enableRBFSignaling(transaction: Transaction): Transaction {
  const rbfTransaction = transaction.clone();
  rbfTransaction.ins.forEach((input) => {
    input.sequence = DEFAULT_RBF_SEQUENCE;
  });
  return rbfTransaction;
}
