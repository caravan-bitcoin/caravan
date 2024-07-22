import { Transaction } from "bitcoinjs-lib-v5";
import { TransactionAnalysis, UTXO } from "./types";
import { isRBFSignaled, calculateEffectiveFeeRate } from "./utils";

export function analyzeTransaction(
  transaction: Transaction,
  utxos: UTXO[]
): TransactionAnalysis {
  const canRBF = isRBFSignaled(transaction);
  const canCPFP = transaction.outs.some(out => out.value > 546);

  const currentFeeRate = calculateEffectiveFeeRate(transaction, utxos);

  let recommendedMethod: 'RBF' | 'CPFP' | null = null;
  if (canRBF && canCPFP) {
    recommendedMethod = currentFeeRate < 5 ? 'RBF' : 'CPFP';
  } else if (canRBF) {
    recommendedMethod = 'RBF';
  } else if (canCPFP) {
    recommendedMethod = 'CPFP';
  }

  return {
    canRBF,
    canCPFP,
    currentFeeRate,
    recommendedMethod
  };
}