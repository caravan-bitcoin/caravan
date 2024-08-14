import { PsbtV2 } from "@caravan/psbt";
import { Network, sortInputs } from "@caravan/bitcoin";
import BigNumber from "bignumber.js";
import {
  createOutputScript,
  initializePsbt,
  calculateTotalInputValue,
  calculateTotalOutputValue,
} from "./utils";
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
  private modifiedPsbt: PsbtV2;
  private readonly network: Network;
  private _targetFeeRate: FeeRateSatsPerVByte;
  private readonly feeOutputIndex?: number;
  private readonly dustThreshold: BigNumber;
  private readonly additionalUtxos: UTXO[];
  private readonly requiredSigners: number;
  private readonly totalSigners: number;
  private readonly changeOutputIndices: number[];
  private readonly incrementalRelayFee: BigNumber;
  private _cachedFeeIncrease: BigNumber | null = null;
  private _cachedVsize: number | null = null;
  private _isAccelerated: boolean = false;
  private _isCanceled: boolean = false;

  /**
   * Constructor for RbfTransaction
   *
   * @param {RbfTransactionOptions} options - Configuration options for the RBF transaction
   * @throws {Error} If the PSBT is not in a valid format or not signaling RBF
   */
  constructor(options: RbfTransactionOptions) {
    this.originalPsbt = initializePsbt(options.psbt);
    this.modifiedPsbt = new PsbtV2();
    this.originalPsbt.copy(this.modifiedPsbt);
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
    this.incrementalRelayFee = new BigNumber(options.incrementalRelayFee || 1);
    this.validatePsbt();
  }

  private validatePsbt(): void {
    if (!this.originalPsbt.isRBFSignaled) {
      throw new Error("This transaction is not signaling RBF.");
    }
  }

  // getters and setters

  /**
   * Get the current modified PSBT
   *
   * @returns {PsbtV2} The current state of the modified PSBT
   */
  get psbt(): PsbtV2 {
    return this.modifiedPsbt;
  }

  /**
   * Get the current target fee rate
   *
   * @returns {FeeRateSatsPerVByte} The current target fee rate in satoshis per virtual byte
   */
  get targetFeeRate(): FeeRateSatsPerVByte {
    return this._targetFeeRate;
  }

  /**
   * Set a new target fee rate
   *
   * @param {FeeRateSatsPerVByte} feeRate - The new target fee rate in satoshis per virtual byte
   */
  set targetFeeRate(feeRate: FeeRateSatsPerVByte) {
    this._targetFeeRate = feeRate;
    this.resetState();
  }

  /**
   * Get the total input value of the transaction
   *
   * @returns {string} The total input value in satoshis
   */
  get totalInputValue(): string {
    return calculateTotalInputValue(this.modifiedPsbt).toString();
  }

  /**
   * Get the total output value of the transaction
   *
   * @returns {string} The total output value in satoshis
   */
  get totalOutputValue(): string {
    return calculateTotalOutputValue(this.modifiedPsbt).toString();
  }

  /**
   * Get the current fee of the transaction
   *
   * @returns {string} The current fee in satoshis
   */
  get currentFee(): string {
    return new BigNumber(this.totalInputValue)
      .minus(this.totalOutputValue)
      .toString();
  }

  /**
   * Get the required fee based on the target fee rate, uses calculateFeeIncrease method
   *
   * @returns {string} The required fee in satoshis
   */
  get requiredFee(): string {
    return this.calculateFeeIncrease()
      .plus(new BigNumber(this.currentFee))
      .toString();
  }

  // Methods

  /**
   * Calculate the fee increase required for RBF
   *
   * @param {FeeRateSatsPerVByte} targetFeeRate - Optional target fee rate (defaults to current target fee rate)
   * @param {FeeRateSatsPerVByte} incrementalRelayFee - Optional incremental relay fee (defaults to 1 sat/vB)
   * @returns {BigNumber} The calculated fee increase in satoshis
   */
  public calculateFeeIncrease(
    targetFeeRate: FeeRateSatsPerVByte = this._targetFeeRate,
    incrementalRelayFee: FeeRateSatsPerVByte = this.incrementalRelayFee.toNumber(),
  ): BigNumber {
    const currentFee = new BigNumber(this.currentFee);
    const vsize = this.estimateVsize();
    const currentFeeRate = currentFee.dividedBy(vsize);
    const incrementalRelayFeeBN = new BigNumber(incrementalRelayFee);

    // Calculate the minimum fee rate for the replacement transaction
    const minReplacementFeeRate = BigNumber.max(
      currentFeeRate.plus(incrementalRelayFeeBN),
      new BigNumber(targetFeeRate),
    );

    // Calculate the minimum absolute fee for the replacement transaction
    const minReplacementFee = BigNumber.max(
      currentFee.plus(incrementalRelayFeeBN.multipliedBy(vsize)),
      minReplacementFeeRate.multipliedBy(vsize),
    );

    // Ensure the new fee is at least 1 sat higher than the current fee
    return BigNumber.max(minReplacementFee.minus(currentFee), new BigNumber(1));
  }

  /**
   * Prepares an accelerated replacement transaction
   *
   * This method creates a new PSBT with increased fees to accelerate confirmation.
   * It adheres to BIP125 rules and adjusts outputs or adds inputs as necessary.
   *
   * @returns {PsbtV2} A new modified PSBTV2 with the accelerated transaction
   * @throws {Error} If unable to create a valid replacement transaction
   */
  public prepareAccelerated(): PsbtV2 {
    if (!this._isAccelerated) {
      this.resetState();
      this.updateSequenceNumbers();
      this.adjustOutputs();
      this.addAdditionalInputsIfNeeded();
      this.updateFeeRate();
      this._isAccelerated = true;
    }
    return this.modifiedPsbt;
  }

  /**
   * Prepares a cancellation replacement transaction
   *
   * This method creates a new PSBT that attempts to cancel the original transaction
   * by redirecting all funds (minus the new fee) to a specified address.
   *
   * @param {string} destinationAddress - The address to send funds to in the cancellation transaction
   * @returns {RbfTransaction} A new modified PSBTV2 with the cancellation transaction
   * @throws {Error} If unable to create a valid cancellation transaction
   */
  public prepareCanceled(destinationAddress: string): PsbtV2 {
    if (!this._isCanceled) {
      this.resetState();
      this.updateSequenceNumbers();
      this.createCancelOutput(destinationAddress);
      this.updateFeeRate();
      this._isCanceled = true;
    }
    return this.modifiedPsbt;
  }

  /**
   * Calculate the cost to accelerate the transaction
   *
   * @returns {string} The cost to accelerate in satoshis
   */
  public costToAccelerate(): string {
    this.prepareAccelerated();
    if (!this._cachedFeeIncrease) return this.calculateFeeIncrease().toString();
    return this._cachedFeeIncrease.toString();
  }

  /**
   * Calculate the cost to cancel the transaction
   *
   * @param {string} destinationAddress - The address to send funds to in the cancellation transaction
   * @returns {string} The cost to cancel in satoshis
   */
  public costToCancel(destinationAddress: string): string {
    this.prepareCanceled(destinationAddress);
    if (!this._cachedFeeIncrease) return this.calculateFeeIncrease().toString();
    return this._cachedFeeIncrease.toString();
  }

  /**
   * Get the absolute fees for the transaction
   *
   * @param {FeeRateSatsPerVByte} customFeeRate - Optional custom fee rate (defaults to current target fee rate)
   * @returns {string} The absolute fees in satoshis
   */
  public getAbsFees(customFeeRate?: FeeRateSatsPerVByte): string {
    const feeRate = customFeeRate || this._targetFeeRate;
    return new BigNumber(feeRate).multipliedBy(this.estimateVsize()).toString();
  }

  private resetState(): void {
    this._cachedVsize = null;
    this._cachedFeeIncrease = null;
    this._isAccelerated = false;
    this._isCanceled = false;
    this.modifiedPsbt = new PsbtV2();
    this.originalPsbt.copy(this.modifiedPsbt);
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
    let rbfSignaled = false;

    for (let i = 0; i < this.modifiedPsbt.PSBT_GLOBAL_INPUT_COUNT; i++) {
      const currentSequence = this.modifiedPsbt.PSBT_IN_SEQUENCE[i];

      if (currentSequence === null || currentSequence >= 0xfffffffe) {
        try {
          this.modifiedPsbt.setInputSequence(i, RBF_SEQUENCE);
          rbfSignaled = true;
          break; // Exit the loop after updating one input
        } catch (error) {
          continue;
          // Continue to the next input if this one fails
        }
      }
    }

    if (!rbfSignaled) {
      throw new Error(
        "Unable to signal RBF: No suitable input found to update sequence.",
      );
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
   * It's typically used to subtract fees from a change output to avoid modifying recipient amounts.
   *
   * @private
   * @throws {Error} If the specified output would become dust after fee subtraction
   * @throws {Error} If the specified output index does not exist
   */
  private subtractFeeFromSpecificOutput(): void {
    const outputIndex = this.feeOutputIndex!;
    const output = this.modifiedPsbt.PSBT_OUT_AMOUNT[outputIndex];
    if (output === undefined) {
      throw new Error(`Output at index ${outputIndex} does not exist`);
    }
    const outputAmount = new BigNumber(output.toString());
    const increasedFees = this._cachedFeeIncrease
      ? this._cachedFeeIncrease
      : this.calculateFeeIncrease();

    const newAmount = BigNumber.max(
      outputAmount.minus(increasedFees),
      new BigNumber(0),
    );
    if (newAmount.isLessThan(this.dustThreshold)) {
      throw new Error(
        `Output ${outputIndex} would become dust after fee subtraction`,
      );
    }
    const newOutput = {
      amount: Number(newAmount.toString()),
      script: Buffer.from(
        this.modifiedPsbt.PSBT_OUT_SCRIPT[outputIndex],
        "hex",
      ),
    };

    this.modifiedPsbt.deleteOutput(outputIndex);
    this.modifiedPsbt.addOutput(newOutput);
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
    const nonChangeOutputs = this.modifiedPsbt.PSBT_OUT_AMOUNT.filter(
      (_, index) => !this.changeOutputIndices.includes(index),
    );
    const totalNonChangeAmount = nonChangeOutputs.reduce(
      (sum, amount) => sum.plus(new BigNumber(amount.toString())),
      new BigNumber(0),
    );
    const newOutputs = this.modifiedPsbt.PSBT_OUT_AMOUNT.map(
      (amount, index) => {
        if (!this.changeOutputIndices.includes(index)) {
          const outputAmount = new BigNumber(amount.toString());
          const increasedFees = this._cachedFeeIncrease
            ? this._cachedFeeIncrease
            : this.calculateFeeIncrease();
          const feeShare = new BigNumber(increasedFees)
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
            script: Buffer.from(
              this.modifiedPsbt.PSBT_OUT_SCRIPT[index],
              "hex",
            ),
          };
        }
        return {
          amount: Number(amount.toString()),
          script: Buffer.from(this.modifiedPsbt.PSBT_OUT_SCRIPT[index], "hex"),
        };
      },
    );

    for (let i = this.modifiedPsbt.PSBT_GLOBAL_OUTPUT_COUNT - 1; i >= 0; i--) {
      this.modifiedPsbt.deleteOutput(i);
    }
    newOutputs.forEach((output) => this.modifiedPsbt.addOutput(output));
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

    if (
      totalInputValue.isLessThan(
        totalOutputValue.plus(new BigNumber(this.requiredFee)),
      )
    ) {
      this.addAdditionalInputs(
        totalOutputValue
          .plus(new BigNumber(this.requiredFee))
          .minus(totalInputValue),
      );
    }
  }

  private addAdditionalInputs(requiredAmount: BigNumber): void {
    let addedAmount = new BigNumber(0);
    // Sort the additional UTXOs in descending order of value
    const sortedUtxos = sortInputs(this.additionalUtxos);

    for (const utxo of sortedUtxos) {
      if (addedAmount.isGreaterThanOrEqualTo(requiredAmount)) break;
      this.modifiedPsbt.addInput({
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
    for (let i = this.modifiedPsbt.PSBT_GLOBAL_OUTPUT_COUNT - 1; i >= 0; i--) {
      this.modifiedPsbt.deleteOutput(i);
    }

    // Add the new cancel output
    this.modifiedPsbt.addOutput({
      amount: Number(cancelAmount.toString()),
      script: createOutputScript(destinationAddress, this.network),
    });
  }

  private updateFeeRate(): void {
    const newFee = calculateTotalInputValue(this.modifiedPsbt).minus(
      calculateTotalOutputValue(this.modifiedPsbt),
    );
    if (newFee.isLessThan(new BigNumber(this.requiredFee))) {
      throw new Error("New fee must be higher than the required fee for RBF");
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
    if (this._cachedVsize === null) {
      // If neither accelerated nor canceled, prepare the accelerated transaction
      if (!this._isAccelerated && !this._isCanceled) {
        this.prepareAccelerated();
      }
      let totalWeight = 0;

      // Base transaction overhead
      totalWeight += 10 * 4; // version, locktime, input count, output count

      // Calculate weight for inputs
      for (let i = 0; i < this.modifiedPsbt.PSBT_GLOBAL_INPUT_COUNT; i++) {
        totalWeight += this.estimateInputWeight(i);
      }

      // Calculate weight for outputs
      for (let i = 0; i < this.modifiedPsbt.PSBT_GLOBAL_OUTPUT_COUNT; i++) {
        totalWeight += this.estimateOutputWeight(i);
      }
      this._cachedVsize = Math.ceil(totalWeight / 4);
    }
    return this._cachedVsize;
  }

  private estimateInputWeight(inputIndex: number): number {
    let weight = 32 * 4; // prevout (32 bytes)
    weight += 4 * 4; // sequence (4 bytes)

    const witnessUtxo = this.modifiedPsbt.PSBT_IN_WITNESS_UTXO[inputIndex];
    const nonWitnessUtxo =
      this.modifiedPsbt.PSBT_IN_NON_WITNESS_UTXO[inputIndex];
    const redeemScript = this.modifiedPsbt.PSBT_IN_REDEEM_SCRIPT[inputIndex];
    const witnessScript = this.modifiedPsbt.PSBT_IN_WITNESS_SCRIPT[inputIndex];

    if (witnessUtxo) {
      // Segwit input
      if (redeemScript) {
        // P2SH-P2WSH
        weight += 23 * 4; // scriptSig length (1) + scriptSig (22)
        weight += this.estimateWitnessWeight(inputIndex);
      } else if (witnessScript) {
        // Native P2WSH
        weight += 1 * 4; // scriptSig length (1), empty scriptSig
        weight += this.estimateWitnessWeight(inputIndex);
      } else {
        // Native P2WPKH
        weight += 1 * 4; // scriptSig length (1), empty scriptSig
        weight += (1 + 73 + 34) * 1; // witness elements count (1) + signature (73) + pubkey (34)
      }
    } else if (nonWitnessUtxo) {
      // Legacy input
      if (redeemScript) {
        // P2SH
        const scriptSigSize =
          1 +
          (73 * this.requiredSigners + 34 * this.totalSigners) +
          redeemScript.length;
        weight += (1 + scriptSigSize) * 4; // scriptSig length (1) + scriptSig
      } else {
        // P2PKH
        weight += (1 + 73 + 34) * 4; // scriptSig length (1) + signature (73) + pubkey (34)
      }
    } else {
      console.warn(`No UTXO data found for input at index ${inputIndex}`);
    }

    return weight;
  }

  private estimateWitnessWeight(inputIndex: number): number {
    const witnessScript = this.modifiedPsbt.PSBT_IN_WITNESS_SCRIPT[inputIndex];
    if (!witnessScript) {
      console.warn(`No witness script found for input at index ${inputIndex}`);
      return 0;
    }

    let weight = 0;
    weight += 1; // witness elements count
    weight += this.requiredSigners * (1 + 73); // signature length (1) + signature (73) for each required signer
    weight += this.totalSigners * (1 + 34); // pubkey length (1) + pubkey (34) for each total signer
    weight += 1 + witnessScript.length; // witness script length (1) + witness script

    return weight;
  }

  private estimateOutputWeight(outputIndex: number): number {
    let weight = 8 * 4; // 8 bytes for value

    const script = Buffer.from(
      this.modifiedPsbt.PSBT_OUT_SCRIPT[outputIndex],
      "hex",
    );
    if (!script) {
      console.warn(`No output script found for output at index ${outputIndex}`);
      return weight;
    }

    weight += 1 * 4; // 1 byte for script length
    weight += script.length * 4; // script length

    return weight;
  }
}

/**
 * Prepare an RBF transaction for acceleration
 *
 * This function creates a new RbfTransaction instance and prepares an accelerated transaction.
 *
 * @param {RbfTransactionOptions} options - Configuration options for the RBF transaction
 * @returns {PsbtV2} A new PSBTV2 with the accelerated transaction
 * @throws {Error} If unable to create a valid replacement transaction
 */
export function prepareRbfTransaction(options: RbfTransactionOptions): PsbtV2 {
  const rbfTx = new RbfTransaction(options);
  return rbfTx.prepareAccelerated();
}

/**
 * Prepare an RBF transaction for cancellation
 *
 * This function creates a new RbfTransaction instance and prepares a cancellation transaction.
 *
 * @param {RbfTransactionOptions} options - Configuration options for the RBF transaction
 * @param {string} destinationAddress - The address to send funds to in the cancellation transaction
 * @returns {PsbtV2} A new PSBTV2 with the cancellation transaction
 * @throws {Error} If unable to create a valid cancellation transaction
 */
export function prepareCancelTransaction(
  options: RbfTransactionOptions,
  destinationAddress: string,
): PsbtV2 {
  const rbfTx = new RbfTransaction(options);
  return rbfTx.prepareCanceled(destinationAddress);
}
