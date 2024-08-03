import { PsbtV2 } from "@caravan/psbt";
import { Network } from "@caravan/bitcoin";
import BigNumber from "bignumber.js";
import { createOutputScript } from "./utils";
import { DEFAULT_DUST_THRESHOLD, RBF_SEQUENCE } from "./constants";
import { RbfTransactionOptions, FeeRateSatsPerVByte, UTXO } from "./types";

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
  private readonly originalPsbt: PsbtV2;
  private newPsbt: PsbtV2;
  private readonly network: Network;
  private _targetFeeRate: FeeRateSatsPerVByte;
  private readonly feeOutputIndex?: number;
  private readonly dustThreshold: BigNumber;
  private readonly additionalUtxos: UTXO[];
  private readonly requiredSigners: number;
  private readonly totalSigners: number;
  private readonly changeOutputIndices: number[];

  /**
   * Constructor for RbfTransaction
   *
   * @param {RbfTransactionOptions} options - Configuration options for the RBF transaction
   * @throws {Error} If the PSBT is not in a valid format or not signaling RBF
   */
  constructor(options: RbfTransactionOptions) {
    this.originalPsbt = this.initializePsbt(options.psbt);
    this.newPsbt = new PsbtV2();
    this.originalPsbt.copy(this.newPsbt);
    this.network = options.network;
    this._targetFeeRate = options.targetFeeRate;
    this.feeOutputIndex = options.feeOutputIndex;
    this.dustThreshold = new BigNumber(
      options.dustThreshold || DEFAULT_DUST_THRESHOLD,
    );
    this.additionalUtxos = options.additionalUtxos || [];
    this.requiredSigners = options.requiredSigners;
    this.totalSigners = options.totalSigners;
    this.changeOutputIndices = options.changeOutputIndices;
    this.validatePsbt();
  }

  /**
   * Initializes the parent PSBT from various input formats.
   *
   * This method supports initializing from a PsbtV2 object, a serialized PSBT string,
   * or a Buffer. It attempts to parse the input as a PsbtV2 and falls back to PsbtV0
   * if necessary, providing backwards compatibility.
   *
   * @private
   * @param {PsbtV2 | string | Buffer} psbt - The parent PSBT in various formats
   * @returns {PsbtV2} An initialized PsbtV2 object
   * @throws {Error} If the PSBT cannot be parsed or converted
   */
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
   * Sets a new target fee rate for the RBF transaction.
   *
   * @param {FeeRateSatsPerVByte} feeRate - The new target fee rate
   * @returns {RbfTransaction} A new instance with the updated fee rate
   */
  public setTargetFeeRate(feeRate: FeeRateSatsPerVByte): RbfTransaction {
    //The spread operator { ...this } doesn't work as intended in this context because
    // the RbfTransaction instance doesn't have all the properties required by RbfTransactionOptions
    const newInstance = new RbfTransaction({
      psbt: this.originalPsbt,
      network: this.network,
      targetFeeRate: feeRate,
      feeOutputIndex: this.feeOutputIndex,
      dustThreshold: this.dustThreshold.toNumber(),
      additionalUtxos: this.additionalUtxos,
      requiredSigners: this.requiredSigners,
      totalSigners: this.totalSigners,
      changeOutputIndices: this.changeOutputIndices,
    });
    newInstance._targetFeeRate = feeRate;
    return newInstance;
  }

  public getFinalPsbt(): PsbtV2 {
    return this.newPsbt;
  }

  get targetFeeRate(): FeeRateSatsPerVByte {
    return this._targetFeeRate;
  }

  get totalInputValue(): string {
    return this.newPsbt.PSBT_IN_WITNESS_UTXO.reduce(
      (sum, utxo) => sum.plus(utxo ? new BigNumber(utxo.split(",")[0]) : 0),
      new BigNumber(0),
    ).toString();
  }

  get totalOutputValue(): string {
    return this.newPsbt.PSBT_OUT_AMOUNT.reduce(
      (sum, amount) => sum.plus(new BigNumber(amount.toString())),
      new BigNumber(0),
    ).toString();
  }

  get currentFee(): string {
    return new BigNumber(this.totalInputValue)
      .minus(this.totalOutputValue)
      .toString();
  }

  get requiredFee(): string {
    return new BigNumber(this.estimateVsize())
      .multipliedBy(this.targetFeeRate)
      .toString();
  }

  get feeIncrease(): string {
    return new BigNumber(this.requiredFee).minus(this.currentFee).toString();
  }

  /**
   * Prepares an accelerated replacement transaction
   *
   * This method creates a new PSBT with increased fees to accelerate confirmation.
   * It adheres to BIP125 rules and adjusts outputs or adds inputs as necessary.
   *
   * @returns {RbfTransaction} A new instance with the accelerated transaction
   * @throws {Error} If unable to create a valid replacement transaction
   */
  public prepareAccelerated(): RbfTransaction {
    const newInstance = new RbfTransaction({
      psbt: this.originalPsbt,
      network: this.network,
      targetFeeRate: this.targetFeeRate,
      feeOutputIndex: this.feeOutputIndex,
      dustThreshold: this.dustThreshold.toNumber(),
      additionalUtxos: this.additionalUtxos,
      requiredSigners: this.requiredSigners,
      totalSigners: this.totalSigners,
      changeOutputIndices: this.changeOutputIndices,
    });
    newInstance.updateSequenceNumbers();
    newInstance.adjustOutputs();
    newInstance.addAdditionalInputsIfNeeded();
    newInstance.updateFeeRate();
    return newInstance;
  }

  /**
   * Prepares a cancellation replacement transaction
   *
   * This method creates a new PSBT that attempts to cancel the original transaction
   * by redirecting all funds (minus the new fee) to a specified address.
   *
   * @param {string} destinationAddress - The address to send funds to in the cancellation transaction
   * @returns {RbfTransaction} A new instance with the cancellation transaction
   * @throws {Error} If unable to create a valid cancellation transaction
   */
  public prepareCanceled(destinationAddress: string): RbfTransaction {
    const newInstance = new RbfTransaction({
      psbt: this.originalPsbt,
      network: this.network,
      targetFeeRate: this.targetFeeRate,
      feeOutputIndex: this.feeOutputIndex,
      dustThreshold: this.dustThreshold.toNumber(),
      additionalUtxos: this.additionalUtxos,
      requiredSigners: this.requiredSigners,
      totalSigners: this.totalSigners,
      changeOutputIndices: this.changeOutputIndices,
    });
    newInstance.updateSequenceNumbers();
    newInstance.createCancelOutput(destinationAddress);
    newInstance.updateFeeRate();
    return newInstance;
  }

  public costToAccelerate(): string {
    return new BigNumber(this.requiredFee).minus(this.currentFee).toString();
  }

  public costToCancel(destinationAddress: string): string {
    const cancelInstance = this.prepareCanceled(destinationAddress);
    return new BigNumber(cancelInstance.requiredFee)
      .minus(this.currentFee)
      .toString();
  }

  public getAbsFees(customFeeRate?: FeeRateSatsPerVByte): string {
    const feeRate = customFeeRate || this.targetFeeRate;
    return new BigNumber(feeRate).multipliedBy(this.estimateVsize()).toString();
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
    if (this.feeOutputIndex !== undefined) {
      this.subtractFeeFromSpecificOutput();
    } else {
      this.subtractFeeProportionally();
    }
  }

  /**
   * Subtracts the fee from a specific output
   *
   * This method reduces the amount of a specific output to cover the increased fee.
   * If the resulting output would be dust, it throws an error.
   *
   * @private
   * @throws {Error} If the specified output would become dust after fee subtraction
   */
  private subtractFeeFromSpecificOutput(): void {
    const outputIndex = this.feeOutputIndex!;
    const output = this.newPsbt.PSBT_OUT_AMOUNT[outputIndex];
    if (output === undefined) {
      throw new Error(`Output at index ${outputIndex} does not exist`);
    }
    const outputAmount = new BigNumber(output.toString());
    const newAmount = BigNumber.max(
      outputAmount.minus(this.feeIncrease),
      new BigNumber(0),
    );
    if (newAmount.isLessThan(this.dustThreshold)) {
      throw new Error(
        `Output ${outputIndex} would become dust after fee subtraction`,
      );
    }
    const newOutput = {
      amount: Number(newAmount.toString()),
      script: Buffer.from(this.newPsbt.PSBT_OUT_SCRIPT[outputIndex], "hex"),
    };

    this.newPsbt.deleteOutput(outputIndex);
    this.newPsbt.addOutput(newOutput);
  }

  /**
   * Subtracts the fee proportionally from all non-change outputs
   *
   * This method reduces the amount of all non-change outputs proportionally
   * to cover the increased fee. If any resulting output would be dust, it throws an error.
   *
   * @private
   * @throws {Error} If any output would become dust after fee subtraction
   */
  private subtractFeeProportionally(): void {
    const nonChangeOutputs = this.newPsbt.PSBT_OUT_AMOUNT.filter(
      (_, index) => !this.changeOutputIndices.includes(index),
    );
    const totalNonChangeAmount = nonChangeOutputs.reduce(
      (sum, amount) => sum.plus(new BigNumber(amount.toString())),
      new BigNumber(0),
    );
    const newOutputs = this.newPsbt.PSBT_OUT_AMOUNT.map((amount, index) => {
      if (!this.changeOutputIndices.includes(index)) {
        const outputAmount = new BigNumber(amount.toString());
        const feeShare = new BigNumber(this.feeIncrease)
          .multipliedBy(outputAmount)
          .dividedBy(totalNonChangeAmount);
        const newAmount = outputAmount.minus(feeShare);
        if (newAmount.isLessThan(this.dustThreshold)) {
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
    const totalInputValue = new BigNumber(this.totalInputValue);
    const totalOutputValue = new BigNumber(this.totalOutputValue);
    const requiredFee = new BigNumber(this.requiredFee);

    if (totalInputValue.isLessThan(totalOutputValue.plus(requiredFee))) {
      this.addAdditionalInputs(
        totalOutputValue.plus(requiredFee).minus(totalInputValue),
      );
    }
  }

  private addAdditionalInputs(requiredAmount: BigNumber): void {
    let addedAmount = new BigNumber(0);
    for (const utxo of this.additionalUtxos) {
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
    const cancelAmount = new BigNumber(this.totalInputValue).minus(
      this.requiredFee,
    );
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
    if (new BigNumber(this.requiredFee).isLessThanOrEqualTo(this.currentFee)) {
      throw new Error("New fee must be higher than the current fee");
    }
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
      const m = this.requiredSigners;
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
        1 + (73 * this.requiredSigners + 34 * this.totalSigners);
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
  options: RbfTransactionOptions,
): RbfTransaction {
  const rbfTx = new RbfTransaction(options);
  return rbfTx.prepareAccelerated();
}

export function prepareCancelTransaction(
  options: RbfTransactionOptions,
  destinationAddress: string,
): RbfTransaction {
  const rbfTx = new RbfTransaction(options);
  return rbfTx.prepareCanceled(destinationAddress);
}
