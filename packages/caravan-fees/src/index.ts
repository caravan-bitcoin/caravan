import { Transaction, networks } from "bitcoinjs-lib";
import { FeeEstimator } from "./estimator";
import { RBFHandler } from "./rbf";
import { CPFPHandler } from "./cpfp";
import {
  FeeBumpingAnalysis,
  UTXO,
  TransactionOutput,
  MultisigDetails,
  RBFOptions,
  CPFPOptions,
  FeeBumpingResult,
} from "./types";
import {
  calculateTransactionFee,
  estimateTransactionVsize,
  isRBFSignaled,
} from "./utils";

export * from "./types";
export * from "./constants";
export * from "./utils";

export class FeeBumping {
  private network: networks.Network;
  private feeEstimator: FeeEstimator;
  private rbfHandler: RBFHandler;
  private cpfpHandler: CPFPHandler;

  constructor(network: networks.Network, apiUrl: string) {
    this.network = network;
    this.feeEstimator = new FeeEstimator(apiUrl);
    this.rbfHandler = new RBFHandler(network, this.feeEstimator);
    this.cpfpHandler = new CPFPHandler(network, this.feeEstimator);
  }

  async analyzeTransaction(
    transaction: Transaction,
    inputs: UTXO[],
    outputs: TransactionOutput[],
    multisigDetails: MultisigDetails,
    ownAddresses: string[]
  ): Promise<FeeBumpingAnalysis> {
    const currentFeeRate = this.calculateEffectiveFeeRate(
      transaction,
      inputs,
      multisigDetails
    );
    const { feeRate: recommendedFeeRate, estimatedConfirmationTime } =
      await this.feeEstimator.getOptimalFeeRate(currentFeeRate, "medium");

    const canRBF = isRBFSignaled(transaction);
    const canCPFP =
      this.cpfpHandler.findCPFPCandidates(transaction, ownAddresses).length > 0;

    let recommendedMethod: "RBF" | "CPFP" | null = null;
    if (canRBF && canCPFP) {
      recommendedMethod =
        currentFeeRate < recommendedFeeRate * 0.5 ? "RBF" : "CPFP";
    } else if (canRBF) {
      recommendedMethod = "RBF";
    } else if (canCPFP) {
      recommendedMethod = "CPFP";
    }

    return {
      canRBF,
      canCPFP,
      recommendedMethod,
      currentFeeRate,
      recommendedFeeRate,
      estimatedNewConfirmationTime: estimatedConfirmationTime,
    };
  }

  async bumpFee(
    transaction: Transaction,
    inputs: UTXO[],
    outputs: TransactionOutput[],
    multisigDetails: MultisigDetails,
    method: "RBF" | "CPFP",
    options: RBFOptions | CPFPOptions
  ): Promise<FeeBumpingResult> {
    if (method === "RBF") {
      return this.rbfHandler.bumpFee(
        transaction,
        inputs,
        outputs,
        multisigDetails,
        options as RBFOptions
      );
    } else if (method === "CPFP") {
      const cpfpOptions = options as CPFPOptions;
      const unspentOutputIndex = this.cpfpHandler.findCPFPCandidates(
        transaction,
        [cpfpOptions.childOutputAddress]
      )[0];
      if (unspentOutputIndex === undefined) {
        throw new Error("No suitable output found for CPFP");
      }
      return this.cpfpHandler.bumpFee(
        transaction,
        inputs,
        unspentOutputIndex,
        multisigDetails,
        cpfpOptions
      );
    } else {
      throw new Error("Invalid fee bumping method");
    }
  }

  private calculateEffectiveFeeRate(
    transaction: Transaction,
    inputs: UTXO[],
    multisigDetails: MultisigDetails
  ): number {
    const fee = calculateTransactionFee(transaction, inputs);
    const vsize = estimateTransactionVsize(
      inputs.length,
      transaction.outs.length,
      multisigDetails
    );
    return fee.dividedBy(vsize).toNumber();
  }
}

// Additional utility functions

export function calculateFeeDifference(
  oldTransaction: Transaction,
  newTransaction: Transaction,
  inputs: UTXO[]
): BigNumber {
  const oldFee = calculateTransactionFee(oldTransaction, inputs);
  const newFee = calculateTransactionFee(newTransaction, inputs);
  return newFee.minus(oldFee);
}

export function estimateConfirmationTime(feeRate: number): number {
  // This is a simplified estimation. In a real-world scenario, you'd use more sophisticated logic
  if (feeRate >= 100) return 10; // 1 block, ~10 minutes
  if (feeRate >= 50) return 20; // 2 blocks, ~20 minutes
  if (feeRate >= 20) return 60; // 6 blocks, ~1 hour
  return 120; // 12 blocks, ~2 hours
}

export function suggestFeeBumpStrategy(
  transaction: Transaction,
  currentFeeRate: number,
  targetFeeRate: number,
  hasChangeOutput: boolean
): "RBF" | "CPFP" | null {
  if (isRBFSignaled(transaction)) {
    return "RBF";
  } else if (hasChangeOutput && currentFeeRate < targetFeeRate * 0.5) {
    return "CPFP";
  }
  return null;
}

export function validateFeeBump(
  oldTransaction: Transaction,
  newTransaction: Transaction,
  inputs: UTXO[],
  minIncreaseRate: number = 1.1
): boolean {
  const oldFee = calculateTransactionFee(oldTransaction, inputs);
  const newFee = calculateTransactionFee(newTransaction, inputs);
  return newFee.gte(oldFee.multipliedBy(minIncreaseRate));
}
