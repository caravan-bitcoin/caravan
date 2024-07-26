import { PsbtV2 } from "@caravan/psbt";
import BigNumber from "bignumber.js";
import { DEFAULT_DUST_THRESHOLD, RBF_SEQUENCE } from "./constants";
import { RbfOptions, FeeRate } from "./types";

/**
 * RbfTransaction class for handling Replace-By-Fee transactions
 */
class RbfTransaction {
  private psbt: PsbtV2;
  private newFeeRate: FeeRate;
  private dustThreshold: string;

  /**
   * Create a new RbfTransaction
   * @param psbt - The original transaction as a PsbtV2
   * @param newFeeRate - The new fee rate for the replacement transaction
   * @param options - Additional options for RBF
   *   - dustThreshold: The minimum amount (in satoshis) for an output to not be considered dust.
   *If not provided, a default value is used.
   */
  constructor(
    psbt: PsbtV2,
    newFeeRate: FeeRate,
    options?: { dustThreshold?: string }
  ) {
    this.psbt = new PsbtV2(psbt.serialize("base64"));
    this.newFeeRate = newFeeRate;
    this.dustThreshold =
      options?.dustThreshold || DEFAULT_DUST_THRESHOLD.toString();
  }

  /**
   * Check if the transaction is signaling RBF
   * @returns True if the transaction is RBF-enabled, false otherwise
   */
  public isRbfSignaled(): boolean {
    const sequences = this.psbt.PSBT_IN_SEQUENCE;
    return sequences.some((seq) => seq === null || seq < 0xffffffff - 1);
  }

  /**
   * Prepare an RBF transaction for fee bumping
   * @param options - Options for preparing the RBF transaction
   *subtractFeeFromOutput: The index of the output to subtract the fee increase from.
   *If not provided, the fee is subtracted proportionally from all non-change outputs.
   *   - dustThreshold: The minimum amount (in satoshis) for an output to not be considered dust.
   *This overrides the value set in the constructor.
   * @returns A new PsbtV2 ready for signing and broadcasting
   */
  public prepareAccelerated(options: RbfOptions): PsbtV2 {
    if (!this.isRbfSignaled()) {
      throw new Error("Original transaction is not signaling RBF");
    }

    const newPsbt = this.createNewPsbt();
    this.adjustOutputs(newPsbt, options);
    this.adjustInputsIfNeeded(newPsbt);
    this.updateFeeRate(newPsbt);

    return newPsbt;
  }

  /**
   * Prepare a cancellation RBF transaction
   * @param destinationAddress - The address to send all funds to (minus fees)
   * @returns A new PsbtV2 ready for signing and broadcasting
   */
  public prepareCanceled(destinationAddress: string): PsbtV2 {
    if (!this.isRbfSignaled()) {
      throw new Error("Original transaction is not signaling RBF");
    }

    const newPsbt = this.createNewPsbt();
    this.createCancelOutput(newPsbt, destinationAddress);
    this.updateFeeRate(newPsbt);

    return newPsbt;
  }

  private createNewPsbt(): PsbtV2 {
    const newPsbt = new PsbtV2(this.psbt.serialize());
    for (let i = 0; i < newPsbt.PSBT_GLOBAL_INPUT_COUNT; i++) {
      newPsbt.PSBT_IN_SEQUENCE[i] = RBF_SEQUENCE;
    }
    return newPsbt;
  }

  /**
   * Adjust the outputs of the transaction based on the new fee
   * @param psbt - The PSBT to adjust
   * @param options - Options for adjusting the outputs
   *   - subtractFeeFromOutput: The index of the output to subtract the fee increase from.
   *If not provided, the fee is subtracted proportionally from all non-change outputs.
   *   - dustThreshold: The minimum amount (in satoshis) for an output to not be considered dust.
   *This overrides the value set in the constructor.
   */
  private adjustOutputs(psbt: PsbtV2, options: RbfOptions): void {
    if (options.subtractFeeFromOutput !== undefined) {
      const outputIndex = options.subtractFeeFromOutput;
      const output = psbt.PSBT_OUT_AMOUNT[outputIndex];

      if (output === undefined) {
        throw new Error(`Output at index ${outputIndex} does not exist`);
      }

      // Convert BigInt to string, then to BigNumber
      const outputAmount = new BigNumber(output.toString());
      const feeIncrease = this.calculateFeeIncrease(psbt);

      const newAmount = BigNumber.max(
        outputAmount.minus(feeIncrease),
        new BigNumber(0)
      );

      if (newAmount.isLessThan(this.dustThreshold)) {
        throw new Error(
          `Output ${outputIndex} would become dust after fee subtraction`
        );
      }

      // Convert back to BigInt
      psbt.PSBT_OUT_AMOUNT[outputIndex] = BigInt(newAmount.toString());
    }

    // Filter out dust outputs // NEED TO FIX THIS
    psbt.PSBT_OUT_AMOUNT = psbt.PSBT_OUT_AMOUNT.filter((amount) =>
      new BigNumber(amount).isGreaterThanOrEqualTo(this.dustThreshold)
    );
  }

  private adjustInputsIfNeeded(psbt: PsbtV2): void {
    const currentInputValue = this.calculateTotalInputValue(psbt);
    const currentOutputValue = this.calculateTotalOutputValue(psbt);
    const requiredFee = this.calculateRequiredFee(psbt);

    if (currentInputValue.isLessThan(currentOutputValue.plus(requiredFee))) {
      throw new Error(
        "Insufficient funds to cover new fee rate. Additional input selection required."
      );
    }
  }

  private createCancelOutput(psbt: PsbtV2, destinationAddress: string): void {
    const totalInput = this.calculateTotalInputValue(psbt);
    const fee = this.calculateRequiredFee(psbt);
    const cancelAmount = totalInput.minus(fee);
    // NEED TO FIX THIS
    psbt.PSBT_OUT_AMOUNT = [cancelAmount.toString()];
    psbt.PSBT_OUT_SCRIPT = [destinationAddress];
  }

  private updateFeeRate(psbt: PsbtV2): void {
    const vsize = this.estimateVsize(psbt);
    const newFee = new BigNumber(vsize)
      .multipliedBy(this.newFeeRate.satoshisPerByte)
      .integerValue(BigNumber.ROUND_CEIL);
    const currentFee = this.calculateCurrentFee(psbt);

    if (newFee.isLessThanOrEqualTo(currentFee)) {
      throw new Error("New fee must be higher than the current fee");
    }

    const feeIncrease = newFee.minus(currentFee);
    this.subtractFeeFromOutputs(psbt, feeIncrease);
  }

  // Helper methods
  private calculateFeeIncrease(psbt: PsbtV2): BigNumber {
    const currentFee = this.calculateCurrentFee(psbt);
    const newFee = new BigNumber(this.estimateVsize(psbt))
      .multipliedBy(this.newFeeRate.satoshisPerByte)
      .integerValue(BigNumber.ROUND_CEIL);
    return newFee.minus(currentFee);
  }

  private calculateCurrentFee(psbt: PsbtV2): BigNumber {
    const inputValue = this.calculateTotalInputValue(psbt);
    const outputValue = this.calculateTotalOutputValue(psbt);
    return inputValue.minus(outputValue);
  }

  private calculateRequiredFee(psbt: PsbtV2): BigNumber {
    const vsize = this.estimateVsize(psbt);
    return new BigNumber(vsize)
      .multipliedBy(this.newFeeRate.satoshisPerByte)
      .integerValue(BigNumber.ROUND_CEIL);
  }

  private calculateTotalInputValue(psbt: PsbtV2): BigNumber {
    return psbt.PSBT_IN_WITNESS_UTXO.reduce(
      (sum, utxo) => sum.plus(utxo ? new BigNumber(utxo.split(",")[0]) : 0),
      new BigNumber(0)
    );
  }

  private calculateTotalOutputValue(psbt: PsbtV2): BigNumber {
    return psbt.PSBT_OUT_AMOUNT.reduce(
      (sum, amount) => sum.plus(new BigNumber(amount)),
      new BigNumber(0)
    );
  }

  private estimateVsize(psbt: PsbtV2): number {
    return (
      psbt.PSBT_GLOBAL_INPUT_COUNT * 148 +
      psbt.PSBT_GLOBAL_OUTPUT_COUNT * 34 +
      10
    );
  }

  private subtractFeeFromOutputs(psbt: PsbtV2, feeIncrease: BigNumber): void {
    const nonChangeOutputs = psbt.PSBT_OUT_AMOUNT.filter(
      (_, index) => !this.isChangeOutput(index, psbt)
    );
    const feePerOutput = feeIncrease
      .dividedBy(nonChangeOutputs.length)
      .integerValue(BigNumber.ROUND_CEIL);
    // NEED TO FIX THIS
    psbt.PSBT_OUT_AMOUNT = psbt.PSBT_OUT_AMOUNT.map((amount, index) => {
      if (!this.isChangeOutput(index, psbt)) {
        const newAmount = new BigNumber(amount).minus(feePerOutput);
        if (newAmount.isLessThan(this.dustThreshold)) {
          throw new Error("Output would become dust after fee subtraction");
        }
        return newAmount.toString();
      }
      return amount;
    });
  }

  private isChangeOutput(index: number, psbt: PsbtV2): boolean {
    const bip32Derivation = psbt.PSBT_OUT_BIP32_DERIVATION[index];
    return bip32Derivation !== null && bip32Derivation.length > 0;
  }
}

/**
 * Prepare an RBF (Replace-By-Fee) transaction.
 *
 * "Preparing" a transaction in this context means:
 * 1. Creating a new transaction based on the original one.
 * 2. Adjusting the inputs and outputs to accommodate the new, higher fee.
 * 3. Ensuring the new transaction adheres to RBF rules (BIP 125).
 * 4. Handling dust outputs and change addresses appropriately.
 * 5. Calculating and setting the new fee rate.
 *
 * The prepared transaction is not yet signed or broadcast. It's a new PSBT
 * (Partially Signed Bitcoin Transaction) that's ready for signing by the
 * appropriate parties and subsequent broadcasting to the Bitcoin network.
 *
 * This preparation step is crucial for RBF as it allows users to create a
 * valid replacement transaction with a higher fee, which can then be used
 * to accelerate confirmation of a stuck transaction or change its outputs
 * before it's mined into a block.
 *
 * @param psbt - The original transaction as a PsbtV2
 * @param newFeeRate - The new fee rate for the replacement transaction
 * @param options - Options for preparing the RBF transaction
 *   - subtractFeeFromOutput: The index of the output to subtract the fee increase from.
 *If not provided, the fee is subtracted proportionally from all non-change outputs.
 *   - dustThreshold: The minimum amount (in satoshis) for an output to not be considered dust.
 * @returns A new PsbtV2 ready for signing and broadcasting
 */
export function prepareRbfTransaction(
  psbt: PsbtV2,
  newFeeRate: FeeRate,
  options: RbfOptions
): PsbtV2 {
  const rbfTx = new RbfTransaction(psbt, newFeeRate, {
    dustThreshold: options.dustThreshold,
  });
  return rbfTx.prepareAccelerated(options);
}

/**
 * Prepare a cancellation RBF transaction.
 * This function doesn't broadcast the transaction, it just prepares it.
 * @param psbt - The original transaction as a PsbtV2
 * @param newFeeRate - The new fee rate for the replacement transaction
 * @param destinationAddress - The address to send all funds to (minus fees)
 * @param options - Additional options for RBF
 *   - dustThreshold: The minimum amount (in satoshis) for an output to not be considered dust.
 * @returns A new PsbtV2 ready for signing and broadcasting
 */
export function prepareCancelTransaction(
  psbt: PsbtV2,
  newFeeRate: FeeRate,
  destinationAddress: string,
  options?: { dustThreshold?: string }
): PsbtV2 {
  const rbfTx = new RbfTransaction(psbt, newFeeRate, options);
  return rbfTx.prepareCanceled(destinationAddress);
}

/**
 * Check if a transaction is signaling RBF.
 * @param psbt - The transaction to check as a PsbtV2
 * @returns True if the transaction is RBF-enabled, false otherwise
 */
export function isRbfSignaled(psbt: PsbtV2): boolean {
  return new RbfTransaction(psbt, { satoshisPerByte: 1 }).isRbfSignaled();
}
