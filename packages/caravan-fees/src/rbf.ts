import { PsbtV2 } from "@caravan/psbt";
import { Network } from "@caravan/bitcoin";
import BigNumber from "bignumber.js";
import {
  createOutputScript,
  initializePsbt,
  calculateTotalInputValue,
  calculateTotalOutputValue,
  TransactionError,
  getDefaultErrorMessage,
} from "./utils";
import {
  DEFAULT_DUST_THRESHOLD,
  RBF_SEQUENCE,
  ESTIMATED_PUBKEY_VSIZE,
  ESTIMATED_SIGNATURE_VSIZE,
  ESTIMATED_MULTISIG_INPUT_VSIZE,
  ESTIMATED_MULTISIG_CHANGE_OUTPUT_VSIZE,
} from "./constants";
import {
  RbfTransactionOptions,
  FeeRateSatsPerVByte,
  UTXO,
  BaseErrorType,
  RbfErrorType,
  TransactionState,
  RbfTransactionInfo,
} from "./types";

class RbfError<
  T extends BaseErrorType | RbfErrorType,
  S extends TransactionState,
> extends TransactionError<T, S> {
  constructor(type: T, state: S, message?: string) {
    super(
      type,
      state,
      message || `RBF Error: ${getDefaultErrorMessage(type, state)}`,
    );
    this.name = "RbfError";
  }
}

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
  private readonly changeAddress?: string;
  private readonly useExistingChangeOutput: boolean;
  private readonly incrementalRelayFee: BigNumber;

  // caching and state-management
  private _currentInputValue: BigNumber;
  private _currentOutputValue: BigNumber;
  private _feeIncrease: BigNumber = new BigNumber(0);
  private _canAccelerate: boolean | null = null;
  private _canCancel: boolean | null = null;
  private _cachedFeeIncrease: BigNumber | null = null;
  private _cachedVsize: number | null = null;
  private _state: TransactionState = TransactionState.INITIALIZED;
  private _selectedAdditionalUtxos: UTXO[] = [];
  private _error: RbfError<RbfErrorType, TransactionState> | null = null;

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
    this.changeAddress = options.changeAddress;
    this.useExistingChangeOutput = options.useExistingChangeOutput || false;

    this._currentInputValue = new BigNumber(this.totalInputValue);
    this._currentOutputValue = new BigNumber(this.totalOutputValue);
    this._cachedVsize = this.estimateVsize(this.originalPsbt);

    this.validatePsbt();
  }

  private validatePsbt(): void {
    if (!this.originalPsbt.isRBFSignaled) {
      this._state = TransactionState.ERROR;
      this._error = new RbfError(
        RbfErrorType.INVALID_PSBT,
        TransactionState.INITIALIZED,
        "This transaction is not signaling RBF.",
      );
    }
  }

  // getters and setters

  get state(): TransactionState {
    return this._state;
  }

  get error(): RbfError<RbfErrorType, TransactionState> | null {
    return this._error;
  }

  /**
   * Get the estimated vsize of the transaction of original tx
   * @returns {number} The estimated vsize in virtual bytes
   */
  get vSizeofOrignalTx(): number {
    return this.estimateVsize(this.originalPsbt);
  }

  /**
   * Get the estimated vsize of the transaction of current tx
   * @returns {number} The estimated vsize in virtual bytes
   */
  get vsizeofCurrentTx(): number {
    return this._cachedVsize || this.estimateVsize(this.modifiedPsbt);
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
   * Get the original fee of the transaction
   * @returns {string} The original fee in satoshis
   */
  public get originalFee(): string {
    return new BigNumber(calculateTotalInputValue(this.originalPsbt))
      .minus(calculateTotalOutputValue(this.originalPsbt))
      .toString();
  }

  /**
   * Get the current fee of the transaction
   *
   * @returns {string} The current fee in satoshis
   */
  get currentFee(): string {
    const fee = new BigNumber(this.totalInputValue).minus(
      this.totalOutputValue,
    );
    if (fee.isNegative()) {
      throw new Error(
        "Invalid transaction state: total output value exceeds total input value.",
      );
    }
    return fee.toString();
  }

  /**
   * Get the new fee after RBF
   * @returns {string} The new fee in satoshis
   */
  public get newFee(): string {
    if (this._state !== TransactionState.FINALIZED) {
      return "0";
    }
    const fee = new BigNumber(this.totalInputValue).minus(
      this.totalOutputValue,
    );
    if (fee.isNegative()) {
      throw new Error(
        "Invalid transaction state: total output value exceeds total input value.",
      );
    }
    return fee.toString();
  }

  /**
   * Get the required fee based on the target fee rate, uses calculateFeeIncrease method
   *
   * @returns {string} The required fee in satoshis
   */
  get requiredAbsoluteFee(): string {
    return this.calculateFeeIncrease()
      .plus(new BigNumber(this.currentFee))
      .toString();
  }

  /**
   * Estimation Check if the transaction can be accelerated
   * @returns {boolean} True if the transaction can be accelerated
   */
  get canAccelerate(): boolean {
    if (this._canAccelerate === null) {
      this._canAccelerate = this.checkCanAccelerate();
    }
    return this._canAccelerate;
  }

  /**
   * Estimation Check if the transaction can be canceled
   * @returns {boolean} True if the transaction can be canceled
   */
  get canCancel(): boolean {
    if (this._canCancel === null) {
      this._canCancel = this.checkCanCancel();
    }
    return this._canCancel;
  }
  /**
   * Get the list of additional UTXOs selected for the RBF transaction
   * @returns {UTXO[]} The list of selected additional UTXOs
   */

  get getSelectedAdditionalUtxos(): UTXO[] {
    if (this._state !== TransactionState.FINALIZED) {
      throw new RbfError(
        BaseErrorType.INVALID_STATE,
        this._state,
        "Transaction has not been finalized",
      );
    }
    return [...this._selectedAdditionalUtxos];
  }

  // Methods

  /**
   * Analyzes the transaction to determine if it's eligible for RBF
   * @returns {boolean} True if the transaction can be replaced, false otherwise
   */
  public analyze(): boolean {
    if (this._state !== TransactionState.INITIALIZED) {
      throw new RbfError(
        BaseErrorType.INVALID_STATE,
        this._state,
        "Transaction has already been analyzed or modified.",
      );
    }
    try {
      this._state = TransactionState.ANALYZING;
      this.updateSequenceNumbers();
      this._state = TransactionState.ANALYZED;
      return true;
    } catch (error) {
      this._state = TransactionState.ERROR;
      this._error = new RbfError(
        RbfErrorType.ANALYSIS_FAILED,
        this._state,
        error instanceof Error ? error.message : String(error),
      );
      return false;
    }
  }

  /**
   * Prepares an accelerated replacement transaction
   *
   * This method modifies and prepares the existing PSBT with increased fees to accelerate confirmation.
   * It adheres to BIP125 rules and adjusts outputs or adds inputs as necessary.
   *
   * @returns {boolean} True if preparation was successful, false otherwise
   * @throws {Error} If unable to create a valid replacement transaction
   */
  public prepareAccelerated(): boolean {
    if (this._state !== TransactionState.ANALYZED) {
      throw new RbfError(
        BaseErrorType.INVALID_STATE,
        this._state,
        "Transaction must be analyzed before acceleration.",
      );
    }
    try {
      this._state = TransactionState.MODIFYING;
      this.adjustOutputs();
      this.addAdditionalInputsIfNeeded();

      this._state = TransactionState.FINALIZING;
      this.updateFeeRate();

      this._state = TransactionState.FINALIZED;
      return true;
    } catch (error) {
      this._state = TransactionState.ERROR;
      this._error = new RbfError(
        RbfErrorType.ACCELERATION_FAILED,
        this._state,
        error instanceof Error ? error.message : String(error),
      );
      return false;
    }
  }

  /**
   * Prepares a cancellation replacement transaction
   *
   * This method creates a new PSBT that attempts to cancel the original transaction
   * by redirecting all funds (minus the new fee) to a specified address.
   *
   * @param {string} destinationAddress - The address to send funds to in the cancellation transaction
   * @returns {boolean} True if preparation was successful, false otherwise
   * @throws {Error} If unable to create a valid cancellation transaction
   */
  public prepareCanceled(destinationAddress: string): boolean {
    if (this._state !== TransactionState.ANALYZED) {
      throw new RbfError(
        BaseErrorType.INVALID_STATE,
        this._state,
        "Transaction must be analyzed before cancellation.",
      );
    }
    try {
      this._state = TransactionState.MODIFYING;
      this.createCancelOutput(destinationAddress);
      this.addAdditionalInputsIfNeeded();

      this._state = TransactionState.FINALIZING;
      this.updateFeeRate();

      this._state = TransactionState.FINALIZED;
      return true;
    } catch (error) {
      this._state = TransactionState.ERROR;
      this._error = new RbfError(
        RbfErrorType.CANCELLATION_FAILED,
        this._state,
        error instanceof Error ? error.message : String(error),
      );
      return false;
    }
  }

  /**
   * Get the finalized PSBT after acceleration or cancellation
   * @returns {PsbtV2 | null} The finalized PSBT or null if not finalized
   */
  public getFinalizedPsbt(): PsbtV2 | null {
    return this._state === TransactionState.FINALIZED
      ? this.modifiedPsbt
      : null;
  }

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
    if (this._cachedFeeIncrease) {
      return this._cachedFeeIncrease;
    }
    const currentFee = new BigNumber(this.currentFee);
    const vsize = this.estimateVsize(this.modifiedPsbt);
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
    this._cachedFeeIncrease = BigNumber.max(
      minReplacementFee.minus(currentFee),
      new BigNumber(1),
    );

    return this._cachedFeeIncrease;
  }

  /**
   * Get detailed information about the RBF transaction
   * @returns {RbfTransactionInfo} Detailed transaction information
   */
  public getTransactionInfo(): RbfTransactionInfo {
    return {
      state: this._state,
      originalFee: this.originalFee,
      newFee: this.newFee,
      feeIncrease: this._feeIncrease.toString(),
      vsize: this._cachedVsize || 0,
      canAccelerate: this.canAccelerate,
      canCancel: this.canCancel,
      error: this._error ? this._error.message : null,
    };
  }

  /**
   * Calculate the cost to accelerate the transaction
   * @returns {string} The cost to accelerate in satoshis
   */
  public costToAccelerate(): string {
    if (!this.canAccelerate) {
      throw new Error("Transaction cannot be accelerated");
    }

    const originalState = this._state;
    const originalPsbt = this.modifiedPsbt;

    try {
      this.prepareAccelerated();
      const feeIncrease = new BigNumber(this.newFee).minus(this.originalFee);
      return feeIncrease.toString();
    } finally {
      // Restore original state
      this._state = originalState;
      this.modifiedPsbt = originalPsbt;
    }
  }

  /**
   * Calculate the cost to cancel the transaction
   * @param {string} destinationAddress - The address to send funds to in the cancellation transaction
   * @returns {string} The cost to cancel in satoshis
   */
  public costToCancel(destinationAddress: string): string {
    if (!this.canCancel) {
      throw new Error("Transaction cannot be canceled");
    }

    const originalState = this._state;
    const originalPsbt = this.modifiedPsbt;

    try {
      this.prepareCanceled(destinationAddress);
      const feeIncrease = new BigNumber(this.newFee).minus(this.originalFee);
      return feeIncrease.toString();
    } finally {
      // Restore original state
      this._state = originalState;
      this.modifiedPsbt = originalPsbt;
    }
  }

  /**
   * Get the absolute fees for the transaction
   *
   * @param {FeeRateSatsPerVByte} customFeeRate - Optional custom fee rate (defaults to current target fee rate)
   * @returns {string} The absolute fees in satoshis
   */
  public getAbsFees(customFeeRate?: FeeRateSatsPerVByte): string {
    const feeRate = customFeeRate || this._targetFeeRate;
    const vsize = this.vSizeofOrignalTx;
    return new BigNumber(feeRate).multipliedBy(vsize).toString();
  }

  // PRIVATE METHODS

  private resetState(): void {
    this._state = TransactionState.INITIALIZED;
    this._error = null;
    this._cachedVsize = null;
    this._cachedFeeIncrease = null;
    this.modifiedPsbt = new PsbtV2();
    this.originalPsbt.copy(this.modifiedPsbt);
  }

  /**
   * Updates sequence numbers for a single input
   *
   * This method ensures that a single input has a sequence number that signals RBF,
   * as required by BIP125.
   *
   * @private
   */
  private updateSequenceNumbers(): void {
    if (this._state !== TransactionState.INITIALIZED) {
      throw new RbfError(BaseErrorType.INVALID_STATE, this._state);
    }

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
      } else {
        // RBF is already signaled, no need to update
        rbfSignaled = true;
        break;
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
    const currentInputValue = new BigNumber(this.totalInputValue);
    const currentOutputValue = new BigNumber(this.totalOutputValue);
    const requiredFee = new BigNumber(this.requiredAbsoluteFee);
    const totalRequiredAmount = currentOutputValue.plus(requiredFee);

    if (currentInputValue.isGreaterThanOrEqualTo(totalRequiredAmount)) {
      // No need for additional inputs
      return;
    }

    const additionalInputsNeeded = this.calculateAdditionalInputsNeeded(
      currentInputValue,
      totalRequiredAmount,
      requiredFee,
    );

    if (additionalInputsNeeded.length === 0) {
      throw new Error(
        "Insufficient funds to cover the increased fee, even with additional UTXOs",
      );
    }

    this._selectedAdditionalUtxos = additionalInputsNeeded;

    // Add the selected inputs to the PSBT
    for (const utxo of additionalInputsNeeded) {
      this.modifiedPsbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
          script: utxo.script,
          value: utxo.value,
        },
        ...utxo.additionalData,
      });
    }

    // Handle change output
    this.handleChangeOutput(
      currentInputValue,
      totalRequiredAmount,
      additionalInputsNeeded,
    );
  }

  /**
   * Calculates the additional inputs needed to cover the required amount and fees.
   * This method accounts for the increased transaction size due to additional inputs
   * and a potential change output.
   *
   * @param currentInputValue - The current total input value of the transaction.
   * @param totalRequired - The total amount required (including outputs and initial fee estimate).
   * @param initialRequiredFee - The initial fee estimate.
   * @returns An array of selected UTXOs to be used as additional inputs.
   */
  private calculateAdditionalInputsNeeded(
    currentInputValue: BigNumber,
    totalRequired: BigNumber,
    initialRequiredFee: BigNumber,
  ): UTXO[] {
    const selectedUtxos: UTXO[] = [];
    let totalSelected = new BigNumber(0);
    let requiredFee = initialRequiredFee;
    let additionalVsize = ESTIMATED_MULTISIG_CHANGE_OUTPUT_VSIZE; // Assume we'll need a change output

    // Calculate the vsize for a single multisig input based on M-of-N
    const singleInputVsize =
      ESTIMATED_MULTISIG_INPUT_VSIZE +
      this.requiredSigners * ESTIMATED_SIGNATURE_VSIZE +
      this.totalSigners * ESTIMATED_PUBKEY_VSIZE;

    // vsize of current transaction
    const currentVSize = this._cachedVsize
      ? this._cachedVsize
      : this.estimateVsize(this.originalPsbt);

    // Sort UTXOs by value, descending
    const sortedUtxos = [...this.additionalUtxos].sort(
      (a, b) => b.value - a.value,
    );

    for (const utxo of sortedUtxos) {
      selectedUtxos.push(utxo);
      totalSelected = totalSelected.plus(utxo.value);

      // Recalculate required fee with the additional input
      additionalVsize += singleInputVsize;

      requiredFee = new BigNumber(this._targetFeeRate).multipliedBy(
        currentVSize + additionalVsize,
      );

      if (
        currentInputValue
          .plus(totalSelected)
          .isGreaterThanOrEqualTo(totalRequired.plus(requiredFee))
      ) {
        // We have enough funds
        break;
      }
    }

    if (
      currentInputValue
        .plus(totalSelected)
        .isLessThan(totalRequired.plus(requiredFee))
    ) {
      // Still not enough funds
      return [];
    }

    return selectedUtxos;
  }

  /**
   * Handles the creation or update of a change output based on the excess funds.
   * This method decides whether to update an existing change output or create a new one.
   *
   * @param currentInputValue - The current total input value of the transaction.
   * @param totalRequired - The total amount required (including outputs and fee).
   * @param additionalInputs - An array of additional UTXOs selected as inputs.
   */
  private handleChangeOutput(
    currentInputValue: BigNumber,
    totalRequired: BigNumber,
    additionalInputs: UTXO[],
  ): void {
    const totalInputValue = currentInputValue.plus(
      additionalInputs.reduce(
        (sum, utxo) => sum.plus(utxo.value),
        new BigNumber(0),
      ),
    );
    const excess = totalInputValue.minus(totalRequired);

    if (excess.isGreaterThan(this.dustThreshold)) {
      if (this.useExistingChangeOutput) {
        this.updateExistingChangeOutput(excess);
      } else {
        this.addNewChangeOutput(excess);
      }
    }
  }

  /**
   * Updates an existing change output with the new excess amount.
   *
   * @param excessAmount - The amount of excess funds to be added to the change output.
   */
  private updateExistingChangeOutput(excessAmount: BigNumber): void {
    const changeOutputIndex = this.changeOutputIndices[0]; // Assume first change output , can make this again as per consumer code preference
    if (changeOutputIndex === undefined) {
      throw new Error("No existing change output found");
    }

    const currentChangeAmount = new BigNumber(
      this.modifiedPsbt.PSBT_OUT_AMOUNT[changeOutputIndex].toString(),
    );
    const newChangeAmount = currentChangeAmount.plus(excessAmount);

    this.modifiedPsbt.PSBT_OUT_AMOUNT[changeOutputIndex] = BigInt(
      newChangeAmount.integerValue().toString(),
    );
  }

  /**
   * Adds a new change output to the transaction with the given excess amount.
   *
   * @param excessAmount - The amount of excess funds to be set as the new change output.
   */
  private addNewChangeOutput(amount: BigNumber): void {
    if (!this.changeAddress) {
      throw new Error("Change address not provided");
    }

    const changeOutput = {
      amount: Number(amount.integerValue().toString()),
      script: createOutputScript(this.changeAddress, this.network),
    };

    this.modifiedPsbt.addOutput(changeOutput);
    this.changeOutputIndices.push(
      this.modifiedPsbt.PSBT_GLOBAL_OUTPUT_COUNT - 1,
    );
  }

  private createCancelOutput(destinationAddress: string): void {
    const cancelAmount = new BigNumber(this.totalInputValue).minus(
      this.requiredAbsoluteFee,
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
    const requiredFee = this._cachedFeeIncrease!.plus(
      new BigNumber(this.currentFee),
    );
    if (newFee.isLessThan(requiredFee)) {
      throw new Error("New fee must be higher than the required fee for RBF");
    }

    // Update the fee rate based on the modified transaction
    this._targetFeeRate = Number(
      newFee.dividedBy(this.estimateVsize(this.modifiedPsbt)).toFixed(2),
    );
  }

  private checkCanAccelerate(): boolean {
    if (this._state !== TransactionState.ANALYZED || this._error) {
      return false;
    }

    const feeIncrease = this.calculateFeeIncrease();
    const availableFunds = this.calculateAvailableFunds();

    return availableFunds.isGreaterThanOrEqualTo(feeIncrease);
  }

  private checkCanCancel(): boolean {
    if (this._state !== TransactionState.ANALYZED || this._error) {
      return false;
    }

    const feeIncrease = this.calculateFeeIncrease();
    const totalInputValue = new BigNumber(this.totalInputValue);
    const minCancelOutput = this.dustThreshold;

    return totalInputValue
      .minus(feeIncrease)
      .isGreaterThanOrEqualTo(minCancelOutput);
  }

  private calculateAvailableFunds(): BigNumber {
    const changeOutputs = this.changeOutputIndices.map(
      (index) =>
        new BigNumber(this.modifiedPsbt.PSBT_OUT_AMOUNT[index].toString()),
    );
    const additionalUtxos = this.additionalUtxos.reduce(
      (sum, utxo) => sum.plus(utxo.value),
      new BigNumber(0),
    );
    return changeOutputs
      .reduce((sum, amount) => sum.plus(amount), new BigNumber(0))
      .plus(additionalUtxos);
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
  private estimateVsize(psbt: PsbtV2): number {
    let totalWeight = 0;

    // Base transaction overhead
    totalWeight += 10 * 4; // version, locktime, input count, output count

    // Calculate weight for inputs
    for (let i = 0; i < psbt.PSBT_GLOBAL_INPUT_COUNT; i++) {
      totalWeight += this.estimateInputWeight(i, psbt);
    }

    // Calculate weight for outputs
    for (let i = 0; i < psbt.PSBT_GLOBAL_OUTPUT_COUNT; i++) {
      totalWeight += this.estimateOutputWeight(i, psbt);
    }

    return Math.ceil(totalWeight / 4);
  }

  private estimateInputWeight(inputIndex: number, psbt: PsbtV2): number {
    let weight = 32 * 4; // prevout (32 bytes)
    weight += 4 * 4; // sequence (4 bytes)

    const witnessUtxo = psbt.PSBT_IN_WITNESS_UTXO[inputIndex];
    const nonWitnessUtxo = psbt.PSBT_IN_NON_WITNESS_UTXO[inputIndex];
    const redeemScript = psbt.PSBT_IN_REDEEM_SCRIPT[inputIndex];
    const witnessScript = psbt.PSBT_IN_WITNESS_SCRIPT[inputIndex];

    if (witnessUtxo) {
      // Segwit input
      if (redeemScript) {
        // P2SH-P2WSH
        weight += 23 * 4; // scriptSig length (1) + scriptSig (22)
        weight += this.estimateWitnessWeight(inputIndex, psbt);
      } else if (witnessScript) {
        // Native P2WSH
        weight += 1 * 4; // scriptSig length (1), empty scriptSig
        weight += this.estimateWitnessWeight(inputIndex, psbt);
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

  private estimateWitnessWeight(inputIndex: number, psbt: PsbtV2): number {
    const witnessScript = psbt.PSBT_IN_WITNESS_SCRIPT[inputIndex];
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

  private estimateOutputWeight(outputIndex: number, psbt: PsbtV2): number {
    let weight = 8 * 4; // 8 bytes for value

    const script = Buffer.from(psbt.PSBT_OUT_SCRIPT[outputIndex], "hex");
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
 * @param {RbfTransactionOptions} options - Configuration options for the RBF transaction
 * @returns {PsbtV2 | null} A new PSBTV2 with the accelerated transaction or null if failed
 */
export function prepareRbfTransaction(
  options: RbfTransactionOptions,
): PsbtV2 | null {
  const rbfTx = new RbfTransaction(options);
  const canRbf = rbfTx.analyze();
  if (!canRbf) {
    console.error("RBF analysis failed:", rbfTx.error?.message);
    return null;
  }

  const prepared = rbfTx.prepareAccelerated();
  if (!prepared) {
    console.error("RBF acceleration failed:", rbfTx.error?.message);
    return null;
  }

  return rbfTx.getFinalizedPsbt();
}

/**
 * Prepare an RBF transaction for cancellation
 * @param {RbfTransactionOptions} options - Configuration options for the RBF transaction
 * @param {string} destinationAddress - The address to send funds to in the cancellation transaction
 * @returns {PsbtV2 | null} A new PSBTV2 with the cancellation transaction or null if failed
 */
export function prepareCancelTransaction(
  options: RbfTransactionOptions,
  destinationAddress: string,
): PsbtV2 | null {
  const rbfTx = new RbfTransaction(options);
  const canRbf = rbfTx.analyze();
  if (!canRbf) {
    console.error("RBF analysis failed:", rbfTx.error?.message);
    return null;
  }

  const prepared = rbfTx.prepareCanceled(destinationAddress);
  if (!prepared) {
    console.error("RBF cancellation failed:", rbfTx.error?.message);
    return null;
  }

  return rbfTx.getFinalizedPsbt();
}
