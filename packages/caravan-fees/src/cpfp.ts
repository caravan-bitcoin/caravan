import { Transaction, networks } from "bitcoinjs-lib";
import BigNumber from "bignumber.js";
import {
  UTXO,
  TransactionOutput,
  MultisigDetails,
  CPFPOptions,
  FeeBumpingResult,
} from "./types";
import { calculateTransactionFee, estimateTransactionVsize } from "./utils";
import { FeeEstimator } from "./estimator";
import { MIN_DUST_AMOUNT } from "./constants";

export class CPFPHandler {
  private network: networks.Network;
  private feeEstimator: FeeEstimator;

  constructor(network: networks.Network, feeEstimator: FeeEstimator) {
    this.network = network;
    this.feeEstimator = feeEstimator;
  }

  async bumpFee(
    parentTransaction: Transaction,
    parentInputs: UTXO[],
    unspentOutputIndex: number,
    multisigDetails: MultisigDetails,
    options: CPFPOptions
  ): Promise<FeeBumpingResult> {
    const parentFee = calculateTransactionFee(parentTransaction, parentInputs);
    const parentVsize = estimateTransactionVsize(
      parentInputs.length,
      parentTransaction.outs.length,
      multisigDetails
    );
    const parentFeeRate = parentFee.dividedBy(parentVsize).toNumber();

    const { feeRate: desiredFeeRate } =
      await this.feeEstimator.getOptimalFeeRate(parentFeeRate, "medium");

    if (options.maxFeeRate && desiredFeeRate > options.maxFeeRate) {
      throw new Error("Desired fee rate exceeds the maximum allowed rate");
    }

    const childInput: UTXO = {
      txid: parentTransaction.getId(),
      vout: unspentOutputIndex,
      value: new BigNumber(parentTransaction.outs[unspentOutputIndex].value),
      script: parentTransaction.outs[unspentOutputIndex].script.toString("hex"),
    };

    const childVsize = estimateTransactionVsize(1, 2, multisigDetails); // Assuming 1 input and 2 outputs for the child
    const totalVsize = parentVsize + childVsize;

    const desiredTotalFee = new BigNumber(desiredFeeRate).multipliedBy(
      totalVsize
    );
    const childFee = desiredTotalFee.minus(parentFee);

    if (options.maxTotalFee && desiredTotalFee.gt(options.maxTotalFee)) {
      throw new Error("New total fee exceeds the maximum allowed fee");
    }

    const changeAmount = childInput.value.minus(childFee);

    if (changeAmount.lt(MIN_DUST_AMOUNT)) {
      throw new Error("CPFP transaction would create dust output");
    }

    const childTransaction = new Transaction();
    childTransaction.addInput(
      Buffer.from(childInput.txid, "hex").reverse(),
      childInput.vout
    );
    childTransaction.addOutput(
      Buffer.from(options.childOutputAddress, "hex"),
      changeAmount.toNumber()
    );

    return {
      method: "CPFP",
      newTransaction: childTransaction,
      newFeeRate: desiredFeeRate,
      totalFee: desiredTotalFee,
      estimatedConfirmationTime: 30, // Assuming medium priority (3 blocks * 10 minutes)
    };
  }

  findCPFPCandidates(
    transaction: Transaction,
    ownAddresses: string[]
  ): number[] {
    return transaction.outs
      .map((out, index) => ({ index, address: out.script.toString("hex") }))
      .filter((out) => ownAddresses.includes(out.address))
      .map((out) => out.index);
  }
}
