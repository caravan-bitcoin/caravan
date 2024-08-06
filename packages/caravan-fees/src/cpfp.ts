import { PsbtV2 } from "@caravan/psbt";
import BigNumber from "bignumber.js";
import { Network } from "@caravan/bitcoin";
import { CPFPOptions, FeeRateSatsPerVByte, UTXO } from "./types";
import {
  DEFAULT_DUST_THRESHOLD,
  DEFAULT_MAX_CHILD_TX_SIZE,
  DEFAULT_MAX_ADDITIONAL_INPUTS,
} from "./constants";
import {
  createOutputScript,
  initializePsbt,
  calculateTotalInputValue,
  calculateTotalOutputValue,
  parseWitnessUtxoValue,
  parseNonWitnessUtxoValue,
} from "./utils";

/**
 * CPFPTransaction Class
 *
 * This class implements Child-Pays-for-Parent (CPFP) functionality for Bitcoin transactions,
 * commonly used in conjunction with BIP 174 (PSBT).
 * While CPFP is not explicitly defined in a BIP, it's a widely used technique for fee bumping.
 *
 * The class allows users to create a child transaction that spends one or more outputs from
 * a parent transaction, increasing the overall fee rate to incentivize miners to include both
 * transactions in a block. This is particularly useful when the parent transaction is stuck
 * due to low fees.
 *
 *  Key Features:
 * - Supports PSBTv2 format
 * - Allows setting and getting of target fee rate
 * - Provides methods to calculate the cost of fee bumping with CPFP
 * - Supports additional input selection for fee coverage
 *
 * Usage:
 * const cpfpTx = new CpfpTransaction(parentPsbt, options);
 * cpfpTx.setTargetFeeRate(50); // sets target to 50 sats/vbyte
 * const childPsbt = cpfpTx.createChildTransaction();
 * const totalFees = cpfpTx.getAbsFees(); // gets total fees for parent + child
 *
 * References:
 * - Child pays for parent (CPFP): https://bitcoinops.org/en/topics/cpfp/
 * - BIP 174: https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki
 */
export class CPFPTransaction {
  private readonly parentPsbt: PsbtV2;
  private childPsbt: PsbtV2;
  private readonly network: Network;
  private _targetFeeRate: FeeRateSatsPerVByte;
  private readonly dustThreshold: BigNumber;
  private readonly maxAdditionalInputs: number;
  private readonly spendableOutputs: number[];
  private readonly maxChildTxSize: number;
  private readonly additionalUtxos: UTXO[];
  private readonly requiredSigners: number;
  private readonly totalSigners: number;
  private readonly destinationAddress: string;

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
    this.parentPsbt = initializePsbt(options.parentPsbt);
    this.childPsbt = new PsbtV2();
    this.network = options.network;
    this._targetFeeRate = options.targetFeeRate;
    this.dustThreshold = new BigNumber(
      options.dustThreshold || DEFAULT_DUST_THRESHOLD,
    );
    this.additionalUtxos = options.additionalUtxos || [];
    this.maxAdditionalInputs =
      options.maxAdditionalInputs || DEFAULT_MAX_ADDITIONAL_INPUTS;
    this.maxChildTxSize = options.maxChildTxSize || DEFAULT_MAX_CHILD_TX_SIZE;
    this.requiredSigners = options.requiredSigners;
    this.totalSigners = options.totalSigners;
    this.destinationAddress = options.destinationAddress;
    this.spendableOutputs = options.spendableOutputs;
    this.validateParentPsbt();
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
    if (this.spendableOutputs.length === 0) {
      throw new Error("No spendable outputs provided.");
    }
  }

  // Getters and setters

  get targetFeeRate(): FeeRateSatsPerVByte {
    return this._targetFeeRate;
  }

  set targetFeeRate(rate: FeeRateSatsPerVByte) {
    this._targetFeeRate = rate;
  }

  /**
   * Calculates the total input value of the child transaction.
   *
   * This method sums up the values of all inputs in the child transaction.
   * It's used to determine if additional inputs are needed and to calculate fees.
   *
   * @private
   * @returns {string} The total input value
   */

  get totalInputValue(): string {
    try {
      let total = new BigNumber(0);

      for (let i = 0; i < this.childPsbt.PSBT_GLOBAL_INPUT_COUNT; i++) {
        const witnessUtxo = this.childPsbt.PSBT_IN_WITNESS_UTXO[i];
        const nonWitnessUtxo = this.childPsbt.PSBT_IN_NON_WITNESS_UTXO[i];

        if (witnessUtxo) {
          total = total.plus(parseWitnessUtxoValue(witnessUtxo, i));
        } else if (nonWitnessUtxo) {
          total = total.plus(
            parseNonWitnessUtxoValue(nonWitnessUtxo, i, this.childPsbt),
          );
        } else {
          console.warn(`No UTXO data found for input at index ${i}`);
        }
      }

      if (total.isNaN()) {
        throw new Error("Total input value calculation resulted in NaN");
      }

      return total.toString();
    } catch (error) {
      console.error("Error calculating total input value:", error);
      throw error;
    }
  }

  /**
   * Calculates the required amount for the child transaction.
   *
   * This method determines the total amount needed to cover both the desired
   * output and the estimated fee. It's used to check if additional inputs are required.
   *
   * @private
   * @returns {string} The required amount
   */
  get requiredAmount(): string {
    const outputValue = new BigNumber(
      this.childPsbt.PSBT_OUT_AMOUNT[0]?.toString() || "0",
    );
    return outputValue.plus(this.estimatedRequiredFee).toString();
  }

  /**
   * Estimates the required fee for the child transaction.
   *
   * This method calculates the estimated fee based on the virtual size of the
   * transaction and the new fee rate. It's crucial for determining the appropriate
   * fee to ensure the CPFP transaction is effective.
   *
   * @private
   * @returns {string} The estimated required fee
   */
  get estimatedRequiredFee(): string {
    const vsize = this.estimateVsize();
    return new BigNumber(vsize).multipliedBy(this.targetFeeRate).toString();
  }

  /**
   * Retrieves the fee for the parent transaction.
   *
   * This method calculates the fee of the parent transaction by subtracting
   * the total output value from the total input value. It's useful for
   * comparing the original fee to the new combined fee.
   *
   * @public
   * @returns {string} The parent transaction fee
   */
  get parentFee(): string {
    try {
      const inputValue = calculateTotalInputValue(this.parentPsbt);
      const outputValue = calculateTotalOutputValue(this.parentPsbt);
      return inputValue.minus(outputValue).toString();
    } catch (error) {
      console.error("Error calculating parent fee:", error);
      throw error;
    }
  }

  /**
   * Retrieves the fee for the child transaction.
   *
   * This public method allows users to get the current fee of the child transaction.
   * It's useful for displaying fee information to users or for further calculations.
   *
   * @public
   * @returns {string} The child transaction fee
   */
  get childFee(): string {
    const totalInput = new BigNumber(this.totalInputValue);
    const output = new BigNumber(
      this.childPsbt.PSBT_OUT_AMOUNT[0]?.toString() || "0",
    );
    return totalInput.minus(output).toString();
  }

  /**
   * Calculates the combined fee of both parent and child transactions.
   *
   * This method sums the fees of both transactions, providing the total fee
   * that will incentivize miners to include both transactions in a block.
   *
   * @public
   * @returns {string} The combined fee of parent and child transactions
   */
  get combinedFee(): string {
    return new BigNumber(this.childFee).plus(this.parentFee).toString();
  }

  // Methods
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

  public getAbsFees(customFeeRate?: FeeRateSatsPerVByte): string {
    const feeRate = customFeeRate || this.targetFeeRate;
    const totalSize =
      this.parentPsbt.PSBT_GLOBAL_INPUT_COUNT + this.estimateVsize();
    return new BigNumber(feeRate).multipliedBy(totalSize).toString();
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
    for (const outputIndex of this.spendableOutputs) {
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
    const totalInputValue = new BigNumber(this.totalInputValue);
    const estimatedFee = new BigNumber(this.estimatedRequiredFee);

    const outputAmount = totalInputValue.minus(estimatedFee);

    if (outputAmount.isLessThan(this.dustThreshold)) {
      throw new Error("CPFP transaction would create a dust output");
    }

    const outputScript = createOutputScript(
      this.destinationAddress,
      this.network,
    );

    const output = {
      script: outputScript,
      amount: outputAmount.toNumber(),
    };
    this.childPsbt.addOutput(output);
  }

  private addAdditionalInputsIfNeeded(): void {
    const totalInput = new BigNumber(this.totalInputValue);
    const required = new BigNumber(this.requiredAmount);
    if (totalInput.isLessThan(required)) {
      this.addAdditionalInputs(required.minus(totalInput));
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

    for (const utxo of this.additionalUtxos) {
      if (
        addedAmount.isGreaterThanOrEqualTo(requiredAmount) ||
        addedInputs >= this.maxAdditionalInputs ||
        this.childPsbt.PSBT_GLOBAL_INPUT_COUNT >= this.maxChildTxSize
      ) {
        break;
      }

      this.childPsbt.addInput({
        previousTxId: utxo.txid,
        outputIndex: utxo.vout,
        witnessUtxo: {
          script: utxo.script,
          amount: utxo.value,
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
   * This method :
   *   - Calculates the total size of both transactions.
   *   - Determines the total desired fee for both transactions combined (parent + child) .
   *   - Subtracts the parent's existing fee to find out how much additional fee is needed.
   *   - Adjusts the child's output to pay this additional fee.
   *
   * @private
   * @throws {Error} If the new fee is not higher than the current fee or if the adjusted output would be dust
   */
  private adjustFeeRate(): void {
    const parentSize = this.parentPsbt.PSBT_GLOBAL_INPUT_COUNT;
    const childSize = this.estimateVsize();
    const combinedSize = parentSize + childSize;

    const totalDesiredFee = new BigNumber(this.targetFeeRate)
      .multipliedBy(combinedSize)
      .integerValue(BigNumber.ROUND_CEIL);

    const parentFee = new BigNumber(this.parentFee);
    const requiredAdditionalFee = totalDesiredFee.minus(parentFee);

    if (requiredAdditionalFee.isLessThanOrEqualTo(0)) {
      throw new Error("Parent fee is already sufficient");
    }

    const currentChildInput = new BigNumber(this.totalInputValue);
    const newOutputAmount = currentChildInput.minus(requiredAdditionalFee);

    if (newOutputAmount.isLessThan(this.dustThreshold)) {
      throw new Error("Adjusted output would be dust");
    }

    this.childPsbt.PSBT_OUT_AMOUNT[0] = BigInt(newOutputAmount.toFixed(0));
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
    let weight = 32 * 4; // prevout (32 bytes)
    weight += 4 * 4; // sequence (4 bytes)

    const witnessUtxo = this.childPsbt.PSBT_IN_WITNESS_UTXO[inputIndex];
    const nonWitnessUtxo = this.childPsbt.PSBT_IN_NON_WITNESS_UTXO[inputIndex];
    const redeemScript = this.childPsbt.PSBT_IN_REDEEM_SCRIPT[inputIndex];
    const witnessScript = this.childPsbt.PSBT_IN_WITNESS_SCRIPT[inputIndex];

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
    const witnessScript = this.childPsbt.PSBT_IN_WITNESS_SCRIPT[inputIndex];
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
    // 8 bytes for value
    let weight = 8 * 4;

    const script = Buffer.from(
      this.childPsbt.PSBT_OUT_SCRIPT[outputIndex],
      "hex",
    );
    if (!script) {
      console.warn(`No output script found for output at index ${outputIndex}`);
      return weight;
    }

    // 1 byte for script length + script length
    weight += 1 * 4;
    weight += script.length * 4;

    return weight;
  }
}

export function prepareCPFPTransaction(options: CPFPOptions): PsbtV2 {
  const cpfpTx = new CPFPTransaction(options);
  return cpfpTx.prepareCPFP();
}
