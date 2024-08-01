import { PsbtV2 } from "@caravan/psbt";
import { Network } from "@caravan/bitcoin";
import BigNumber from "bignumber.js";
import { createOutputScript } from "./utils";
import { DEFAULT_DUST_THRESHOLD, RBF_SEQUENCE } from "./constants";
import { RbfOptions, FeeRate, UrgencyLevel } from "./types";

/**
 * RbfTransaction Class
 *
 * This class implements the Replace-By-Fee (RBF) functionality for Bitcoin transactions,
 * adhering to BIP125 (https://github.com/bitcoin/bips/blob/master/bip-0125.mediawiki).
 * It allows for the creation of replacement transactions with higher fees, either to
 * accelerate confirmation or to cancel a previous transaction.
 *
 * The class supports both transaction acceleration and cancellation, with configurable
 * fee rates based on network conditions and user-defined urgency levels.
 *
 * Key Features:
 * - Supports PSBTv2 and PSBTv0 formats
 * - Implements BIP125 rules for RBF
 * - Allows fee subtraction from specific outputs or proportional distribution
 * - Supports additional input selection for fee coverage
 * - Provides transaction cancellation functionality
 *
 * Usage:
 * const rbfTx = new RbfTransaction(psbt, feeMarket, options, network);
 * const acceleratedPsbt = rbfTx.prepareAccelerated();
 * // or
 * const canceledPsbt = rbfTx.prepareCanceled(destinationAddress);
 */
export class RbfTransaction {
  private originalPsbt: PsbtV2;
  private newPsbt: PsbtV2;
  private options: RbfOptions;
  private feeMarket: FeeRate;
  private urgencyMultipliers: Record<UrgencyLevel, number>;
  private network: Network;

  /**
   * Constructor for RbfTransaction
   *
   * @param {PsbtV2 | string | Buffer} psbt - The original PSBT to be replaced
   * @param {FeeRate} feeMarket - Current fee market rates
   * @param {RbfOptions} options - Configuration options for the RBF transaction
   * @param {Network} network - The Bitcoin network (mainnet, testnet, etc.)
   *
   * @throws {Error} If the PSBT is not in a valid format or not signaling RBF
   */
  constructor(
    psbt: PsbtV2 | string | Buffer,
    feeMarket: FeeRate,
    options: RbfOptions,
    network: Network,
  ) {
    this.originalPsbt = this.initializePsbt(psbt);
    this.newPsbt = new PsbtV2(); // Create a new empty PsbtV2
    this.originalPsbt.copy(this.newPsbt); // Copy the original PSBT to the new one
    this.feeMarket = feeMarket;
    this.network = network;
    this.options = {
      urgency: "medium",
      subtractFeeFromOutput: undefined,
      dustThreshold: DEFAULT_DUST_THRESHOLD,
      additionalUtxos: [],
      ...options,
    };
    this.urgencyMultipliers = {
      low: 1.2,
      medium: 1.5,
      high: 2,
      ...options.urgencyMultipliers,
    };
    this.validatePsbt();
  }

  private initializePsbt(psbt: PsbtV2 | string | Buffer): PsbtV2 {
    if (psbt instanceof PsbtV2) {
      return psbt;
    }
    try {
      return new PsbtV2(psbt);
    } catch (error) {
      try {
        return PsbtV2.FromV0(psbt);
      } catch (conversionError) {
        throw new Error(
          "Unable to initialize PSBT. Neither V2 nor V0 format recognized.",
        );
      }
    }
  }

  private validatePsbt(): void {
    if (!this.newPsbt.isRBFSignaled) {
      throw new Error("This transaction is not signaling RBF.");
    }
  }

  /**
   * Prepares an accelerated replacement transaction
   *
   * This method creates a new PSBT with increased fees to accelerate confirmation.
   * It adheres to BIP125 rules and adjusts outputs or adds inputs as necessary.
   *
   * @returns {PsbtV2} A new PSBT representing the accelerated transaction
   * @throws {Error} If unable to create a valid replacement transaction
   */
  public prepareAccelerated(): PsbtV2 {
    this.updateSequenceNumbers();
    this.adjustOutputs();
    this.addAdditionalInputsIfNeeded();
    this.updateFeeRate();
    return this.newPsbt;
  }

  /**
   * Prepares a cancellation replacement transaction
   *
   * This method creates a new PSBT that attempts to cancel the original transaction
   * by redirecting all funds (minus the new fee) to a specified address.
   *
   * @param {string} destinationAddress - The address to send funds to in the cancellation transaction
   * @returns {PsbtV2} A new PSBT representing the cancellation transaction
   * @throws {Error} If unable to create a valid cancellation transaction
   */
  public prepareCanceled(destinationAddress: string): PsbtV2 {
    this.updateSequenceNumbers();
    this.createCancelOutput(destinationAddress);
    this.updateFeeRate();
    return this.newPsbt;
  }

  /**
   * Updates sequence numbers for all inputs
   *
   * This method ensures that all inputs have a sequence number that signals RBF,
   * as required by BIP125.
   *
   * @private
   */
  private updateSequenceNumbers(): void {
    for (let i = 0; i < this.newPsbt.PSBT_GLOBAL_INPUT_COUNT; i++) {
      const currentSequence = this.newPsbt.PSBT_IN_SEQUENCE[i];
      if (currentSequence === null || currentSequence >= 0xfffffffe) {
        this.newPsbt.PSBT_IN_SEQUENCE[i] = RBF_SEQUENCE;
      }
    }
  }

  /**
   * Adjusts transaction outputs to accommodate the increased fee
   *
   * This method implements the logic for subtracting the fee increase from outputs,
   * either from a specific output or proportionally from all non-change outputs.
   *
   * @private
   * @throws {Error} If fee subtraction would create dust outputs
   */
  private adjustOutputs(): void {
    const feeIncrease = this.calculateFeeIncrease();
    if (this.options.subtractFeeFromOutput !== undefined) {
      this.subtractFeeFromSpecificOutput(feeIncrease);
    } else {
      this.subtractFeeProportionally(feeIncrease);
    }
  }

  private subtractFeeFromSpecificOutput(feeIncrease: BigNumber): void {
    const outputIndex = this.options.subtractFeeFromOutput!;
    const output = this.newPsbt.PSBT_OUT_AMOUNT[outputIndex];
    if (output === undefined) {
      throw new Error(`Output at index ${outputIndex} does not exist`);
    }
    const outputAmount = new BigNumber(output.toString());
    const newAmount = BigNumber.max(
      outputAmount.minus(feeIncrease),
      new BigNumber(0),
    );
    if (newAmount.isLessThan(this.options.dustThreshold!)) {
      throw new Error(
        `Output ${outputIndex} would become dust after fee subtraction`,
      );
    }
    // Create a new output with the updated amount
    const newOutput = {
      amount: Number(newAmount.toString()),
      script: Buffer.from(this.newPsbt.PSBT_OUT_SCRIPT[outputIndex], "hex"),
    };

    // Remove the old output and add the new one
    this.newPsbt.deleteOutput(outputIndex);
    this.newPsbt.addOutput(newOutput);
  }

  private subtractFeeProportionally(feeIncrease: BigNumber): void {
    const nonChangeOutputs = this.newPsbt.PSBT_OUT_AMOUNT.filter(
      (_, index) => !this.options.changeOutputIndices.includes(index),
    );
    const totalNonChangeAmount = nonChangeOutputs.reduce(
      (sum, amount) => sum.plus(new BigNumber(amount.toString())),
      new BigNumber(0),
    );
    const newOutputs = this.newPsbt.PSBT_OUT_AMOUNT.map((amount, index) => {
      if (!this.options.changeOutputIndices.includes(index)) {
        const outputAmount = new BigNumber(amount.toString());
        const feeShare = feeIncrease
          .multipliedBy(outputAmount)
          .dividedBy(totalNonChangeAmount);
        const newAmount = outputAmount.minus(feeShare);
        if (newAmount.isLessThan(this.options.dustThreshold!)) {
          throw new Error(
            `Output ${index} would become dust after fee subtraction`,
          );
        }
        return {
          amount: Number(newAmount.integerValue().toString()),
          script: Buffer.from(this.newPsbt.PSBT_OUT_SCRIPT[index], "hex"),
        };
      }
      return {
        amount: Number(amount.toString()),
        script: Buffer.from(this.newPsbt.PSBT_OUT_SCRIPT[index], "hex"),
      };
    });

    // Remove all existing outputs and add the new ones
    for (let i = this.newPsbt.PSBT_GLOBAL_OUTPUT_COUNT - 1; i >= 0; i--) {
      this.newPsbt.deleteOutput(i);
    }
    newOutputs.forEach((output) => this.newPsbt.addOutput(output));
  }

  /**
   * Adds additional inputs if necessary to cover the increased fee
   *
   * This method selects additional UTXOs from the provided list if the current
   * inputs are insufficient to cover the new fee.
   *
   * @private
   * @throws {Error} If insufficient funds are available to cover the new fee
   */
  private addAdditionalInputsIfNeeded(): void {
    const currentInputValue = this.calculateTotalInputValue();
    const currentOutputValue = this.calculateTotalOutputValue();
    const requiredFee = this.calculateRequiredFee();
    if (currentInputValue.isLessThan(currentOutputValue.plus(requiredFee))) {
      this.addAdditionalInputs(
        currentOutputValue.plus(requiredFee).minus(currentInputValue),
      );
    }
  }

  private addAdditionalInputs(requiredAmount: BigNumber): void {
    let addedAmount = new BigNumber(0);
    for (const utxo of this.options.additionalUtxos!) {
      if (addedAmount.isGreaterThanOrEqualTo(requiredAmount)) break;
      this.newPsbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
          script: utxo.script,
          value: utxo.value,
        },
        ...utxo.additionalData,
      });
      addedAmount = addedAmount.plus(utxo.value);
    }
    if (addedAmount.isLessThan(requiredAmount)) {
      throw new Error(
        "Insufficient funds in additional UTXOs to cover new fee rate.",
      );
    }
  }

  private createCancelOutput(destinationAddress: string): void {
    const totalInput = this.calculateTotalInputValue();
    const fee = this.calculateRequiredFee();
    const cancelAmount = totalInput.minus(fee);
    // Remove all existing outputs
    for (let i = this.newPsbt.PSBT_GLOBAL_OUTPUT_COUNT - 1; i >= 0; i--) {
      this.newPsbt.deleteOutput(i);
    }

    // Add the new cancel output
    this.newPsbt.addOutput({
      amount: Number(cancelAmount.toString()),
      script: createOutputScript(destinationAddress, this.network),
    });
  }

  private updateFeeRate(): void {
    const vsize = this.estimateVsize();
    const newFee = new BigNumber(this.calculateNewFeeRate().satoshisPerByte)
      .multipliedBy(vsize)
      .integerValue(BigNumber.ROUND_CEIL);
    const currentFee = this.calculateCurrentFee();
    if (newFee.isLessThanOrEqualTo(currentFee)) {
      throw new Error("New fee must be higher than the current fee");
    }
  }

  /**
   * Calculates the new fee rate based on market conditions and urgency
   *
   * This method implements a fee calculation strategy that adheres to BIP125
   * anti-DDoS rules by incorporating user-defined urgency and market rates.
   *
   * @private
   * @returns {FeeRate} The calculated new fee rate
   */
  private calculateNewFeeRate(): FeeRate {
    return {
      satoshisPerByte: Math.ceil(
        this.feeMarket.satoshisPerByte *
          this.urgencyMultipliers[this.options.urgency!],
      ),
    };
  }

  private calculateFeeIncrease(): BigNumber {
    const currentFee = this.calculateCurrentFee();
    const newFee =
      this.calculateNewFeeRate().satoshisPerByte * this.estimateVsize();
    return new BigNumber(newFee).minus(currentFee);
  }

  private calculateCurrentFee(): BigNumber {
    const inputValue = this.calculateTotalInputValue();
    const outputValue = this.calculateTotalOutputValue();
    return inputValue.minus(outputValue);
  }

  private calculateRequiredFee(): BigNumber {
    const vsize = this.estimateVsize();
    return new BigNumber(vsize).multipliedBy(
      this.calculateNewFeeRate().satoshisPerByte,
    );
  }

  private calculateTotalInputValue(): BigNumber {
    return this.newPsbt.PSBT_IN_WITNESS_UTXO.reduce(
      (sum, utxo) => sum.plus(utxo ? new BigNumber(utxo.split(",")[0]) : 0),
      new BigNumber(0),
    );
  }

  private calculateTotalOutputValue(): BigNumber {
    return this.newPsbt.PSBT_OUT_AMOUNT.reduce(
      (sum, amount) => sum.plus(new BigNumber(amount.toString())),
      new BigNumber(0),
    );
  }

  /**
   * Estimates the virtual size (vsize) of the transaction
   *
   * This method calculates an estimate of the transaction's vsize, which is
   * used for fee calculations. It accounts for different input types (segwit, legacy)
   * and the complexity of the multisig setup.
   *
   * @private
   * @returns {number} Estimated vsize in virtual bytes
   */
  private estimateVsize(): number {
    let totalWeight = 0;

    // Base transaction overhead
    totalWeight += 10 * 4; // version, locktime, input count, output count

    // Calculate weight for inputs
    for (let i = 0; i < this.newPsbt.PSBT_GLOBAL_INPUT_COUNT; i++) {
      totalWeight += this.estimateInputWeight(i);
    }

    // Calculate weight for outputs
    for (let i = 0; i < this.newPsbt.PSBT_GLOBAL_OUTPUT_COUNT; i++) {
      totalWeight += this.estimateOutputWeight(i);
    }

    // Convert weight to vsize (rounded up)
    return Math.ceil(totalWeight / 4);
  }

  private estimateInputWeight(inputIndex: number): number {
    // Base input weight
    let weight = 41 * 4; // outpoint (36) + sequence (4) + count (1)

    const witnessUtxo = this.newPsbt.PSBT_IN_WITNESS_UTXO[inputIndex];
    const redeemScript = this.newPsbt.PSBT_IN_REDEEM_SCRIPT[inputIndex];
    const witnessScript = this.newPsbt.PSBT_IN_WITNESS_SCRIPT[inputIndex];

    if (witnessUtxo) {
      // Segwit input
      const m = this.options.requiredSigners;
      weight += (73 * m + 34) * 4; // signatures + pubkeys + OP_m + OP_n + OP_CHECKMULTISIG
      if (redeemScript) {
        // P2SH-P2WSH
        weight += redeemScript.length * 4;
      }
      if (witnessScript) {
        weight += witnessScript.length;
      }
    } else {
      // Legacy P2SH input
      const scriptSigSize =
        1 +
        (73 * this.options.requiredSigners + 34 * this.options.totalSigners);
      weight += scriptSigSize * 4;
    }

    return weight;
  }

  private estimateOutputWeight(outputIndex: number): number {
    // 8 bytes for value, 1 byte for script length
    let weight = 9 * 4;

    const script = Buffer.from(
      this.newPsbt.PSBT_OUT_SCRIPT[outputIndex],
      "hex",
    );
    weight += script.length * 4;

    return weight;
  }
}

export function prepareRbfTransaction(
  psbt: PsbtV2 | string | Buffer,
  feeMarket: FeeRate,
  options: RbfOptions,
  network: Network,
): PsbtV2 {
  const rbfTx = new RbfTransaction(psbt, feeMarket, options, network);
  return rbfTx.prepareAccelerated();
}

export function prepareCancelTransaction(
  psbt: PsbtV2 | string | Buffer,
  feeMarket: FeeRate,
  destinationAddress: string,
  options: RbfOptions,
  network: Network,
): PsbtV2 {
  const rbfTx = new RbfTransaction(psbt, feeMarket, options, network);
  return rbfTx.prepareCanceled(destinationAddress);
}
