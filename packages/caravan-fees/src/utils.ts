import {
  P2SH,
  P2SH_P2WSH,
  P2WSH,
  estimateMultisigP2SHTransactionVSize,
  estimateMultisigP2SH_P2WSHTransactionVSize,
  estimateMultisigP2WSHTransactionVSize,
} from "@caravan/bitcoin";
import { Transaction } from "bitcoinjs-lib-v5";
import BigNumber from "bignumber.js";
import { UTXO, FeeRate } from "./types";
import { DEFAULT_RBF_SEQUENCE } from "./constants";
import { Network, address as bitcoinjsAddress } from "bitcoinjs-lib";
import { Output } from "bitcoinjs-lib/src/transaction";

export function deriveAddress(output: Output, network: Network): string {
  try {
    return bitcoinjsAddress.fromOutputScript(output.script, network);
  } catch (error) {
    console.error("Failed to derive address from output:", error);
    return "Unable to derive address";
  }
}

/**
 * Calculate the effective fee rate of a transaction.
 * @param transaction The transaction to analyze
 * @param utxos The UTXOs spent in the transaction
 * @returns The effective fee rate in satoshis per byte
 */
export function calculateEffectiveFeeRate(
  transaction: Transaction,
  utxos: UTXO[]
): FeeRate {
  const totalInput = utxos.reduce(
    (sum, utxo) => sum.plus(utxo.value),
    new BigNumber(0)
  );
  const totalOutput = transaction.outs.reduce(
    (sum, output) => sum.plus(output.value),
    new BigNumber(0)
  );
  const fee = totalInput.minus(totalOutput);
  const feeRate = fee
    .dividedBy(transaction.virtualSize())
    .integerValue(BigNumber.ROUND_CEIL);

  return { satoshisPerByte: feeRate.toNumber() };
}

/**
 * Check if a transaction is signaling RBF.
 * @param transaction The transaction to check
 * @returns True if the transaction is RBF-enabled, false otherwise
 */
export function isRBFSignaled(transaction: Transaction): boolean {
  return transaction.ins.some((input) => input.sequence < 0xfffffffe);
}

/**
 * Estimate the virtual size of a transaction based on its address type and input/output count.
 * @param addressType The type of address (P2SH, P2SH_P2WSH, or P2WSH)
 * @param inputCount Number of inputs
 * @param outputCount Number of outputs
 * @param m Number of required signers
 * @param n Total number of signers
 * @returns Estimated virtual size in vbytes
 */
export function estimateVirtualSize(
  addressType: string,
  inputCount: number,
  outputCount: number,
  m: number,
  n: number
): number {
  const config = {
    numInputs: inputCount,
    numOutputs: outputCount,
    m,
    n,
  };

  switch (addressType) {
    case P2SH:
      return estimateMultisigP2SHTransactionVSize(config);
    case P2SH_P2WSH:
      return estimateMultisigP2SH_P2WSHTransactionVSize(config);
    case P2WSH:
      return estimateMultisigP2WSHTransactionVSize(config);
    default:
      throw new Error("Unsupported address type");
  }
}

export function enableRBFSignaling(transaction: Transaction): Transaction {
  const rbfTransaction = transaction.clone();
  rbfTransaction.ins.forEach((input) => {
    input.sequence = DEFAULT_RBF_SEQUENCE;
  });
  return rbfTransaction;
}
