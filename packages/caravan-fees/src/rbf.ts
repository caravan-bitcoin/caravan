import { Transaction, networks } from "bitcoinjs-lib";
import BigNumber from "bignumber.js";
import {
  UTXO,
  TransactionOutput,
  MultisigDetails,
  RBFOptions,
  FeeBumpingResult,
} from "./types";
import {
  calculateTransactionFee,
  estimateTransactionVsize,
  isRBFSignaled,
  enableRBFSignaling,
} from "./utils";
import { FeeEstimator } from "./estimator";
import { DEFAULT_FEE_INCREASE_THRESHOLD, MIN_DUST_AMOUNT } from "./constants";

export class RBFHandler {
  private network: networks.Network;
  private feeEstimator: FeeEstimator;

  constructor(network: networks.Network, feeEstimator: FeeEstimator) {
    this.network = network;
    this.feeEstimator = feeEstimator;
  }

  async bumpFee(
    transaction: Transaction,
    inputs: UTXO[],
    outputs: TransactionOutput[],
    multisigDetails: MultisigDetails,
    options: RBFOptions = {}
  ): Promise<FeeBumpingResult> {
    if (!isRBFSignaled(transaction)) {
      throw new Error("Transaction is not signaling RBF");
    }

    const currentFeeRate = this.calculateEffectiveFeeRate(
      transaction,
      inputs,
      multisigDetails
    );
    const { feeRate: newFeeRate } = await this.feeEstimator.getOptimalFeeRate(
      currentFeeRate,
      "medium"
    );

    const feeIncreaseThreshold =
      options.feeIncreaseThreshold || DEFAULT_FEE_INCREASE_THRESHOLD;
    if (newFeeRate < currentFeeRate * feeIncreaseThreshold) {
      throw new Error(
        "New fee rate does not meet the minimum increase threshold"
      );
    }

    if (options.maxFeeRate && newFeeRate > options.maxFeeRate) {
      throw new Error("New fee rate exceeds the maximum allowed rate");
    }

    const newTransaction = transaction.clone();
    newTransaction.outs = [];

    const totalInputValue = inputs.reduce(
      (sum, input) => sum.plus(input.value),
      new BigNumber(0)
    );
    const desiredFee = new BigNumber(newFeeRate).multipliedBy(
      estimateTransactionVsize(inputs.length, outputs.length, multisigDetails)
    );

    if (options.maxTotalFee && desiredFee.gt(options.maxTotalFee)) {
      throw new Error("New total fee exceeds the maximum allowed fee");
    }

    let availableForOutputs = totalInputValue.minus(desiredFee);

    // Reconstruct outputs with new fee
    for (const output of outputs) {
      if (availableForOutputs.lt(output.value)) {
        // Reduce the last output to accommodate the new fee
        const newValue = BigNumber.max(availableForOutputs, MIN_DUST_AMOUNT);
        newTransaction.addOutput(output.address, newValue.toNumber());
        break;
      } else {
        newTransaction.addOutput(output.address, output.value.toNumber());
        availableForOutputs = availableForOutputs.minus(output.value);
      }
    }

    // Ensure RBF signaling is enabled
    enableRBFSignaling(newTransaction);

    return {
      method: "RBF",
      newTransaction,
      newFeeRate,
      totalFee: desiredFee,
      estimatedConfirmationTime: 30, // Assuming medium priority (3 blocks * 10 minutes)
    };
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
