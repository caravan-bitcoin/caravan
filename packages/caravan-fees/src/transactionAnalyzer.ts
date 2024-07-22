import { Transaction } from "bitcoinjs-lib-v5";
import { TransactionAnalysis, UTXO, FeeRate } from "./types";
import { isRBFSignaled, calculateEffectiveFeeRate } from "./utils";

/**
 * Analyze a transaction to determine fee bumping options.
 * @param transaction The transaction to analyze
 * @param utxos The UTXOs spent in the transaction
 * @param client The blockchain client
 * @returns An analysis of the transaction's fee bumping options
 */
export async function analyzeTransaction(
  transaction: Transaction,
  utxos: UTXO[],
  currentNetworkFeeRate: FeeRate
): Promise<TransactionAnalysis> {
  const canRBF = isRBFSignaled(transaction);
  const canCPFP = transaction.outs.some((out) => out.value > 546); // 546 satoshis is typically considered dust

  const currentFeeRate = calculateEffectiveFeeRate(transaction, utxos);

  let recommendedMethod: "RBF" | "CPFP" | null = null;
  let reason = "";

  if (canRBF && canCPFP) {
    if (
      currentFeeRate.satoshisPerByte < currentNetworkFeeRate.satoshisPerByte
    ) {
      recommendedMethod = "RBF";
      reason =
        "RBF is recommended as it's more efficient for increasing the fee of this transaction.";
    } else {
      recommendedMethod = "CPFP";
      reason =
        "CPFP is recommended as the current fee rate is already close to the network rate.";
    }
  } else if (canRBF) {
    recommendedMethod = "RBF";
    reason = "Only RBF is available for this transaction.";
  } else if (canCPFP) {
    recommendedMethod = "CPFP";
    reason = "Only CPFP is available for this transaction.";
  } else {
    reason = "This transaction cannot be fee bumped using RBF or CPFP.";
  }

  return {
    canRBF,
    canCPFP,
    currentFeeRate,
    recommendedMethod,
    reason,
  };
}
