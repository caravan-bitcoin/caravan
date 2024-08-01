import { PsbtV2 } from "@caravan/psbt";
import BigNumber from "bignumber.js";
import { CPFPOptions, FeeRate } from "./types";
import {
  DEFAULT_DUST_THRESHOLD,
  DEFAULT_MAX_CHILD_TX_SIZE,
  DEFAULT_MAX_ADDITIONAL_INPUTS,
} from "./constants";
import { createOutputScript } from "./utils";

/**
 * CPFPTransaction Class
 *
 * This class implements Child-Pays-for-Parent (CPFP) functionality for Bitcoin transactions,
 * as described in BIP 125 (Replace-by-Fee) and commonly used in conjunction with BIP 174 (PSBT).
 * While CPFP is not explicitly defined in a BIP, it's a widely used technique for fee bumping.
 *
 * The class allows users to create a child transaction that spends one or more outputs from
 * a parent transaction, increasing the overall fee rate to incentivize miners to include both
 * transactions in a block. This is particularly useful when the parent transaction is stuck
 * due to low fees.
 *
 * References:
 * - BIP 125: https://github.com/bitcoin/bips/blob/master/bip-0125.mediawiki
 * - BIP 174: https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki
 */
export class CPFPTransaction {
  private parentPsbt: PsbtV2;
  private childPsbt: PsbtV2;
  private options: Required<CPFPOptions>;

  /**
   * Constructor for the CPFPTransaction class.
   *
   * Initializes the parent and child PSBTs and sets up the options for the CPFP transaction.
   * It also performs initial validation of the parent PSBT.
   *
   * @param {CPFPOptions} options - Configuration options for the CPFP transaction
   * @throws {Error} If the parent PSBT is invalid or no spendable outputs are provided
   */
  constructor(options: CPFPOptions) {
    this.parentPsbt = this.initializePsbt(options.parentPsbt);
    this.childPsbt = new PsbtV2();
    this.options = {
      urgency: "medium",
      maxAdditionalInputs: DEFAULT_MAX_ADDITIONAL_INPUTS,
      maxChildTxSize: DEFAULT_MAX_CHILD_TX_SIZE,
      dustThreshold: DEFAULT_DUST_THRESHOLD,
      additionalUtxos: [],
      urgencyMultipliers: { low: 1.2, medium: 1.5, high: 2 },
      ...options,
    };
    this.validateParentPsbt();
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

  /**
   * Validates the parent PSBT to ensure it's suitable for a CPFP transaction.
   *
   * This method checks if the parent PSBT has inputs and outputs, and if
   * spendable outputs have been specified. These checks are crucial to ensure
   * that a valid CPFP transaction can be created.
   *
   * @private
   * @throws {Error} If the parent PSBT is invalid or no spendable outputs are provided
   */
  private validateParentPsbt(): void {
    if (this.parentPsbt.PSBT_GLOBAL_INPUT_COUNT === 0) {
      throw new Error("Parent PSBT has no inputs.");
    }
    if (this.parentPsbt.PSBT_GLOBAL_OUTPUT_COUNT === 0) {
      throw new Error("Parent PSBT has no outputs.");
    }
    if (this.options.spendableOutputs.length === 0) {
      throw new Error("No spendable outputs provided.");
    }
  }

  /**
   * Prepares the CPFP transaction.
   *
   * This is the main method that orchestrates the creation of the child transaction.
   * It follows these steps:
   * 1. Create the child transaction with inputs from the parent's outputs
   * 2. Add additional inputs if needed to cover the increased fee
   * 3. Adjust the fee rate to ensure the combined transactions are attractive to miners
   *
   * @public
   * @returns {PsbtV2} The prepared child PSBT
   */
  public prepareCPFP(): PsbtV2 {
    this.createChildTransaction();
    this.addAdditionalInputsIfNeeded();
    this.adjustFeeRate();
    return this.childPsbt;
  }

  /**
   * Retrieves the fee for the child transaction.
   *
   * This public method allows users to get the current fee of the child transaction.
   * It's useful for displaying fee information to users or for further calculations.
   *
   * @public
   * @returns {BigNumber} The child transaction fee
   */
  public getChildFee(): BigNumber {
    return this.calculateCurrentFee();
  }

  /**
   * Retrieves the fee for the parent transaction.
   *
   * This method calculates the fee of the parent transaction by subtracting
   * the total output value from the total input value. It's useful for
   * comparing the original fee to the new combined fee.
   *
   * @public
   * @returns {BigNumber} The parent transaction fee
   */
  public getParentFee(): BigNumber {
    const inputValue = this.parentPsbt.PSBT_IN_WITNESS_UTXO.reduce(
      (sum, utxo) => sum.plus(utxo ? new BigNumber(utxo.split(",")[0]) : 0),
      new BigNumber(0),
    );
    const outputValue = this.parentPsbt.PSBT_OUT_AMOUNT.reduce(
      (sum, amount) => sum.plus(new BigNumber(amount.toString())),
      new BigNumber(0),
    );
    return inputValue.minus(outputValue);
  }

  /**
   * Calculates the combined fee of both parent and child transactions.
   *
   * This method sums the fees of both transactions, providing the total fee
   * that will incentivize miners to include both transactions in a block.
   *
   * @public
   * @returns {BigNumber} The combined fee of parent and child transactions
   */
  public getCombinedFee(): BigNumber {
    return this.getChildFee().plus(this.getParentFee());
  }

  /**
   * Creates the initial child transaction.
   *
   * This method sets up the basic structure of the child transaction by:
   * 1. Adding inputs from the parent transaction's spendable outputs
   * 2. Calculating the initial fee based on the estimated size and desired fee rate
   * 3. Creating an output that spends the remaining amount minus the fee
   *
   * The method ensures that the resulting output is above the dust threshold.
   *
   * @private
   * @throws {Error} If the resulting output would be dust
   */
  private createChildTransaction(): void {
    for (const outputIndex of this.options.spendableOutputs) {
      const output = {
        script: Buffer.from(
          this.parentPsbt.PSBT_OUT_SCRIPT[outputIndex],
          "hex",
        ),
        amount: new BigNumber(
          this.parentPsbt.PSBT_OUT_AMOUNT[outputIndex].toString(),
        ),
      };

      const input = {
        previousTxId: this.parentPsbt.PSBT_IN_PREVIOUS_TXID[0], // Assuming parent tx has at least one input
        outputIndex: outputIndex,
        witnessUtxo: {
          script: output.script,
          amount: output.amount.toNumber(), // Changed from 'value' to 'amount'
        },
      };

      this.childPsbt.addInput(input);
    }

    const estimatedFee = this.estimateRequiredFee();
    const outputAmount = this.calculateTotalInputValue().minus(estimatedFee);

    if (outputAmount.isLessThan(this.options.dustThreshold)) {
      throw new Error("CPFP transaction would create a dust output");
    }

    const outputScript = createOutputScript(
      this.options.destinationAddress,
      this.options.network,
    );
    const output = {
      script: outputScript,
      amount: outputAmount.toNumber(),
    };
    this.childPsbt.addOutput(output);
  }

  private addAdditionalInputsIfNeeded(): void {
    const currentInputValue = this.calculateTotalInputValue();
    const requiredAmount = this.calculateRequiredAmount();

    if (currentInputValue.isLessThan(requiredAmount)) {
      this.addAdditionalInputs(requiredAmount.minus(currentInputValue));
    }
  }

  /**
   * Adds additional inputs to the child transaction if needed.
   *
   * This method is called when the inputs from the parent transaction are not
   * sufficient to cover the desired fee increase. It adds UTXOs from the
   * additionalUtxos option until the required amount is met or the maximum
   * number of additional inputs is reached.
   *
   * @private
   * @throws {Error} If there are insufficient funds in additional UTXOs
   */
  private addAdditionalInputs(requiredAmount: BigNumber): void {
    let addedAmount = new BigNumber(0);
    let addedInputs = 0;

    for (const utxo of this.options.additionalUtxos) {
      if (
        addedAmount.isGreaterThanOrEqualTo(requiredAmount) ||
        addedInputs >= this.options.maxAdditionalInputs ||
        this.childPsbt.PSBT_GLOBAL_INPUT_COUNT >= this.options.maxChildTxSize
      ) {
        break;
      }

      this.childPsbt.addInput({
        previousTxId: utxo.txid,
        outputIndex: utxo.vout,
        witnessUtxo: {
          script: utxo.script,
          amount: utxo.value, // Changed from 'value' to 'amount'
        },
      });

      addedAmount = addedAmount.plus(utxo.value);
      addedInputs++;
    }

    if (addedAmount.isLessThan(requiredAmount)) {
      throw new Error(
        "Insufficient funds in additional UTXOs to cover CPFP fee",
      );
    }
  }

  /**
   * Adjusts the fee rate of the child transaction.
   *
   * This method calculates the new fee based on the combined size of the parent
   * and child transactions and the desired fee rate (factoring in urgency).
   * It then adjusts the output amount of the child transaction to accommodate
   * the new fee, ensuring that the output doesn't become dust in the process.
   *
   * @private
   * @throws {Error} If the new fee is not higher than the current fee or if the adjusted output would be dust
   */
  private adjustFeeRate(): void {
    const combinedSize =
      this.parentPsbt.PSBT_GLOBAL_INPUT_COUNT + this.estimateVsize();
    const newFee = new BigNumber(this.calculateNewFeeRate().satoshisPerByte)
      .multipliedBy(combinedSize)
      .integerValue(BigNumber.ROUND_CEIL);

    const currentFee = this.calculateCurrentFee();
    if (newFee.isLessThanOrEqualTo(currentFee)) {
      throw new Error("New fee must be higher than the current fee");
    }

    // Adjust the output amount to reflect the new fee
    const output = this.childPsbt.PSBT_OUT_AMOUNT[0];
    const newOutputAmount = new BigNumber(output.toString()).minus(
      newFee.minus(currentFee),
    );

    if (newOutputAmount.isLessThan(this.options.dustThreshold)) {
      throw new Error("Adjusted output would be dust");
    }
    this.childPsbt.PSBT_OUT_AMOUNT[0] = BigInt(newOutputAmount.toFixed(0));
  }

  /**
   * Calculates the new fee rate based on the current market rate and urgency.
   *
   * This method applies an urgency multiplier to the base fee rate to determine
   * the new fee rate for the CPFP transaction. The urgency levels (low, medium, high)
   * allow users to balance the trade-off between cost and confirmation speed.
   *
   * @private
   * @returns {FeeRate} The calculated new fee rate
   */
  private calculateNewFeeRate(): FeeRate {
    const urgencyMultiplier =
      this.options.urgencyMultipliers[this.options.urgency];

    return {
      satoshisPerByte: Math.ceil(
        this.options.feeRate.satoshisPerByte * urgencyMultiplier,
      ),
    };
  }

  /**
   * Calculates the total input value of the child transaction.
   *
   * This method sums up the values of all inputs in the child transaction.
   * It's used to determine if additional inputs are needed and to calculate fees.
   *
   * @private
   * @returns {BigNumber} The total input value
   */
  private calculateTotalInputValue(): BigNumber {
    return this.childPsbt.PSBT_IN_WITNESS_UTXO.reduce(
      (sum, utxo) => sum.plus(utxo ? new BigNumber(utxo.split(",")[0]) : 0),
      new BigNumber(0),
    );
  }

  /**
   * Calculates the required amount for the child transaction.
   *
   * This method determines the total amount needed to cover both the desired
   * output and the estimated fee. It's used to check if additional inputs are required.
   *
   * @private
   * @returns {BigNumber} The required amount
   */
  private calculateRequiredAmount(): BigNumber {
    const outputValue = new BigNumber(
      this.childPsbt.PSBT_OUT_AMOUNT[0].toString(),
    );
    const estimatedFee = this.estimateRequiredFee();
    return outputValue.plus(estimatedFee);
  }

  /**
   * Estimates the required fee for the child transaction.
   *
   * This method calculates the estimated fee based on the virtual size of the
   * transaction and the new fee rate. It's crucial for determining the appropriate
   * fee to ensure the CPFP transaction is effective.
   *
   * @private
   * @returns {BigNumber} The estimated required fee
   */
  private estimateRequiredFee(): BigNumber {
    const vsize = this.estimateVsize();
    return new BigNumber(vsize).multipliedBy(
      this.calculateNewFeeRate().satoshisPerByte,
    );
  }

  /**
   * Calculates the current fee of the child transaction.
   *
   * This method computes the difference between the total input value and the
   * output value, which represents the current fee. It's used to compare against
   * the new fee when adjusting the fee rate.
   *
   * @private
   * @returns {BigNumber} The current fee
   */
  private calculateCurrentFee(): BigNumber {
    const inputValue = this.calculateTotalInputValue();
    const outputValue = new BigNumber(
      this.childPsbt.PSBT_OUT_AMOUNT[0].toString(),
    );
    return inputValue.minus(outputValue);
  }

  private estimateVsize(): number {
    let totalWeight = 0;
    // Base transaction overhead
    totalWeight += 10 * 4; // version, locktime, input count, output count
    // Calculate weight for inputs
    for (let i = 0; i < this.childPsbt.PSBT_GLOBAL_INPUT_COUNT; i++) {
      totalWeight += this.estimateInputWeight(i);
    }
    // Calculate weight for outputs
    for (let i = 0; i < this.childPsbt.PSBT_GLOBAL_OUTPUT_COUNT; i++) {
      totalWeight += this.estimateOutputWeight(i);
    }
    // Convert weight to vsize (rounded up)
    return Math.ceil(totalWeight / 4);
  }

  private estimateInputWeight(inputIndex: number): number {
    // Base input weight
    let weight = 41 * 4; // outpoint (36) + sequence (4) + count (1)
    const witnessUtxo = this.childPsbt.PSBT_IN_WITNESS_UTXO[inputIndex];
    const redeemScript = this.childPsbt.PSBT_IN_REDEEM_SCRIPT[inputIndex];
    const witnessScript = this.childPsbt.PSBT_IN_WITNESS_SCRIPT[inputIndex];
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
      this.childPsbt.PSBT_OUT_SCRIPT[outputIndex],
      "hex",
    );
    weight += script.length * 4;
    return weight;
  }
}

export function prepareCPFPTransaction(options: CPFPOptions): PsbtV2 {
  const cpfpTx = new CPFPTransaction(options);
  return cpfpTx.prepareCPFP();
}
