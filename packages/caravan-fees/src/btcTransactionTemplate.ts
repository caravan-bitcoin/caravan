import {
  BtcTxInputTemplate,
  BtcTxOutputTemplate,
} from "./btcTransactionComponents";
import { Network } from "@caravan/bitcoin";
import { PsbtV2 } from "@caravan/psbt";
import { Satoshis, TransactionTemplateOptions } from "./types";
import BigNumber from "bignumber.js";
import {
  DEFAULT_DUST_THRESHOLD_IN_SATS,
  ABSURDLY_HIGH_ABS_FEE,
  ABSURDLY_HIGH_FEE_RATE,
} from "./constants";
import {
  addInputToPsbt,
  addOutputToPsbt,
  estimateTransactionVsize,
  initializePsbt,
  getOutputAddress,
  parseWitnessUtxoValue,
  parseNonWitnessUtxoValue,
} from "./utils";

/**
 * Represents a Bitcoin transaction template.
 * This class is used to construct and manipulate Bitcoin transactions.
 */
export class BtcTransactionTemplate {
  private readonly _inputs: BtcTxInputTemplate[];
  private readonly _outputs: BtcTxOutputTemplate[];
  private readonly _targetFeeRate: BigNumber;
  private readonly _dustThreshold: BigNumber;
  private readonly _network: Network;
  private readonly _scriptType: string;
  private readonly _requiredSigners: number;
  private readonly _totalSigners: number;

  /**
   * Creates a new BtcTransactionTemplate instance.
   * @param options - Configuration options for the transaction template
   */
  constructor(options: TransactionTemplateOptions) {
    this._inputs = options.inputs || [];
    this._outputs = options.outputs || [];
    this._targetFeeRate = new BigNumber(options.targetFeeRate);
    this._dustThreshold = new BigNumber(
      options.dustThreshold || DEFAULT_DUST_THRESHOLD_IN_SATS,
    );
    this._network = options.network;
    this._scriptType = options.scriptType;
    this._requiredSigners = options.requiredSigners || 1;
    this._totalSigners = options.totalSigners || 1;
  }

  /**
   * Creates a BtcTransactionTemplate from a raw PSBT hex string.
   * This method parses the PSBT, extracts input and output information,
   * and creates a new BtcTransactionTemplate instance.
   *
   * @param psbtHex - The raw PSBT hex string
   * @param options - Additional options for creating the template
   * @returns A new BtcTransactionTemplate instance
   * @throws Error if PSBT parsing fails or required information is missing
   */
  static rawPsbt(
    psbtHex: string,
    options: Omit<TransactionTemplateOptions, "inputs" | "outputs">,
  ): BtcTransactionTemplate {
    const psbt = initializePsbt(psbtHex);
    const inputs: BtcTxInputTemplate[] = [];
    const outputs: BtcTxOutputTemplate[] = [];

    // Process inputs
    for (let i = 0; i < psbt.PSBT_GLOBAL_INPUT_COUNT; i++) {
      const txid = psbt.PSBT_IN_PREVIOUS_TXID[i];
      const vout = psbt.PSBT_IN_OUTPUT_INDEX[i];

      if (!txid || vout === undefined) {
        throw new Error(`Missing txid or vout for input ${i}`);
      }

      const input = new BtcTxInputTemplate({
        txid: Buffer.from(txid, "hex").reverse().toString("hex"),
        vout,
      });

      let amountSats: string;
      const witnessUtxo = psbt.PSBT_IN_WITNESS_UTXO[i];
      const nonWitnessUtxo = psbt.PSBT_IN_NON_WITNESS_UTXO[i];

      if (witnessUtxo) {
        // add amount
        amountSats = parseWitnessUtxoValue(witnessUtxo, i).toString();

        // Parse the witness UTXO
        const witnessUtxoBuffer = Buffer.from(witnessUtxo, "hex");
        const value = witnessUtxoBuffer.readUInt32LE(0); // Read the first 4 bytes as the value
        const script = witnessUtxoBuffer.slice(4); // The rest is the script
        input.setWitnessUtxo({ script, value });
      } else if (nonWitnessUtxo) {
        // add amount
        amountSats = parseNonWitnessUtxoValue(
          nonWitnessUtxo,
          i,
          psbt,
        ).toString();

        input.setNonWitnessUtxo(Buffer.from(nonWitnessUtxo, "hex"));
      } else {
        throw new Error(`Missing UTXO information for input ${i}`);
      }
      //set Amount
      input.amountSats = amountSats;

      inputs.push(input);
    }

    // Process outputs (unchanged)
    for (let i = 0; i < psbt.PSBT_GLOBAL_OUTPUT_COUNT; i++) {
      const script = Buffer.from(psbt.PSBT_OUT_SCRIPT[i], "hex");
      const amount = psbt.PSBT_OUT_AMOUNT[i];

      if (!script || amount === undefined) {
        throw new Error(`Missing script or amount for output ${i}`);
      }

      const address = getOutputAddress(script, options.network);
      if (!address) {
        throw new Error(`Unable to derive address for output ${i}`);
      }

      outputs.push(
        new BtcTxOutputTemplate({
          address: address || "",
          amountSats: amount.toString(),
          locked: true, // We dont want to change these outputs
        }),
      );
    }

    return new BtcTransactionTemplate({
      ...options,
      inputs,
      outputs,
    });
  }

  /**
   * Gets the inputs of the transaction.
   * @returns A read-only array of inputs
   */
  get inputs(): ReadonlyArray<BtcTxInputTemplate> {
    return this._inputs;
  }

  /**
   * Gets the outputs of the transaction.
   * @returns A read-only array of outputs
   */
  get outputs(): ReadonlyArray<BtcTxOutputTemplate> {
    return this._outputs;
  }

  /**
   * Gets the malleable outputs of the transaction.
   * @returns An array of malleable outputs
   */
  get malleableOutputs(): BtcTxOutputTemplate[] {
    return this._outputs.filter((output) => output.isMalleable);
  }

  /**
   * Calculates the target fees to pay based on the estimated size and target fee rate.
   * @returns {Satoshis} The target fees in satoshis (as a string)
   */
  get targetFeesToPay(): Satoshis {
    return this._targetFeeRate
      .times(this.calculateEstimatedVsize())
      .integerValue(BigNumber.ROUND_CEIL)
      .toString();
  }

  /**
   * Calculates the current fee of the transaction.
   * @returns {Satoshis} The current fee in satoshis (as a string)
   */
  get currentFee(): Satoshis {
    return this.calculateFee().toString();
  }

  /**
   * Checks if the current fees are sufficient to meet the target fee rate.
   * @returns True if the fees are paid, false otherwise
   */
  areFeesPaid(): boolean {
    return this.calculateFee().gte(new BigNumber(this.targetFeesToPay));
  }

  /**
   * Checks if the current fee rate meets or exceeds the target fee rate.
   * @returns True if the fee rate is satisfied, false otherwise
   */
  get feeRateSatisfied(): boolean {
    return new BigNumber(this.estimatedFeeRate).gte(this._targetFeeRate);
  }

  /**
   * Determines if a change output is needed.
   * @returns True if a change output is needed, false otherwise
   */
  get needsChangeOutput(): boolean {
    const targetFeesWithDustBuffer = new BigNumber(this.targetFeesToPay).plus(
      this._dustThreshold,
    );

    return (
      !this.malleableOutputs.length &&
      new BigNumber(this.currentFee).gt(targetFeesWithDustBuffer)
    );
  }

  /**
   * Calculates the total input amount.
   * @returns {Satoshis} The total input amount in satoshis (as a string)
   */
  getTotalInputAmount(): Satoshis {
    return this.calculateTotalInputAmount().toString();
  }

  /**
   * Calculates the total change amount. (Total Inputs Amount - Total Non-change (non-malleable) Outputs Amount )
   * @returns {Satoshis} The total change amount in satoshis (as a string)
   */
  get changeAmount(): Satoshis {
    return this.calculateChangeAmount().toString();
  }

  /**
   * Calculates the total output amount.
   * @returns {Satoshis} The total output amount in satoshis (as a string)
   */
  getTotalOutputAmount(): Satoshis {
    return this.calculateTotalOutputAmount().toString();
  }

  /**
   * Estimates the virtual size of the transaction.
   * @returns The estimated virtual size in vbytes
   */
  get estimatedVsize(): number {
    return estimateTransactionVsize({
      addressType: this._scriptType,
      numInputs: this._inputs.length,
      numOutputs: this._outputs.length,
      m: this._requiredSigners,
      n: this._totalSigners,
    });
  }

  /**
   * Calculates the estimated fee rate of the transaction.
   * @returns {string} The estimated fee rate in satoshis per vbyte
   */
  get estimatedFeeRate(): string {
    return this.calculateFee()
      .dividedBy(this.calculateEstimatedVsize())
      .toString();
  }

  /**
   * Adds an input to the transaction.
   * @param input - The input to add
   */
  addInput(input: BtcTxInputTemplate): void {
    this._inputs.push(input);
  }

  /**
   * Adds an output to the transaction.
   * @param output - The output to add
   */
  addOutput(output: BtcTxOutputTemplate): void {
    this._outputs.push(output);
  }

  /**
   * Removes an output from the transaction.
   * @param index - The index of the output to remove
   */
  removeOutput(index: number): void {
    this._outputs.splice(index, 1);
  }

  /**
   * Adjusts the change output of the transaction.
   * This method calculates a new change amount based on the current inputs,
   * non-change outputs, and the target fee. It then updates the change output
   * or removes it if the new amount is below the dust threshold.
   *
   * The method also handles cases where the change output already has an amount:
   * 1. It calculates the difference between the new and current change amount.
   * 2. If removing change, it ensures the fee doesn't unexpectedly increase.
   */
  adjustChangeOutput(): void {
    if (this.malleableOutputs.length === 0) return;

    // TO DO (MRIGESH):
    // To handle for multiple change outputs
    //
    const changeOutput = this.malleableOutputs[0];
    const totalOutWithoutChange = this.calculateTotalOutputAmount().minus(
      this.calculateChangeAmount(),
    );
    const currentChangeAmount = new BigNumber(changeOutput.amountSats);

    const newChangeAmount = this.calculateTotalInputAmount()
      .minus(totalOutWithoutChange)
      .minus(new BigNumber(this.targetFeesToPay));

    if (newChangeAmount.gte(0)) {
      const changeAmountDiff = newChangeAmount.minus(currentChangeAmount);

      if (!changeAmountDiff.isZero()) {
        changeOutput.addAmount(changeAmountDiff.toString());
      }
      // get current out amount after adjustment

      const balanceCheck = this.calculateTotalInputAmount()
        .minus(this.calculateTotalOutputAmount())
        .minus(new BigNumber(this.targetFeesToPay));

      if (!balanceCheck.isZero()) {
        throw new Error(
          `Transaction does not balance. Discrepancy: ${balanceCheck.toString()} satoshis`,
        );
      }
    } else {
      throw new Error(
        `New Change Amount ${newChangeAmount.toString()} cannot be negative`,
      );
    }
  }

  /**
   * Validates the transaction.
   * @returns True if the transaction is valid, false otherwise
   * @throws Error if the fee rate or absolute fee is absurdly high
   */
  validate(): boolean {
    if (
      new BigNumber(this.currentFee).lt(new BigNumber(this.targetFeesToPay))
    ) {
      return false;
    }

    for (const output of this._outputs) {
      if (new BigNumber(output.amountSats).lte(0)) {
        return false;
      }
    }

    if (
      new BigNumber(this.estimatedFeeRate).gte(
        new BigNumber(ABSURDLY_HIGH_FEE_RATE),
      ) ||
      new BigNumber(this.currentFee).gte(new BigNumber(ABSURDLY_HIGH_ABS_FEE))
    ) {
      throw new Error(
        "Absurdly high fee detected. Transaction rejected for safety.",
      );
    }

    return this.feeRateSatisfied;
  }

  /**
   * Converts the transaction template to a base64-encoded PSBT (Partially Signed Bitcoin Transaction) string.
   * This method creates a new PSBT, adds all valid inputs and outputs from the template,
   * and then serializes the PSBT to a base64 string.
   *
   * @returns A base64-encoded string representation of the PSBT.
   *
   * @throws {Error} If an invalid address is encountered when creating an output script.
   * @throws {Error} If there's an issue with input or output data that prevents PSBT creation.
   * @throws {Error} If serialization of the PSBT fails.
   *
   * @remarks
   * - Only inputs and outputs that pass the `isInputValid` and `isOutputValid` checks are included.
   * - Input amounts are not included in the PSBT. If needed, they should be added separately.
   * - Output amounts are converted from string to integer (satoshis) when added to the PSBT.
   * - The resulting PSBT is not signed and may require further processing (e.g., signing) before it can be broadcast.
   */
  toPsbt(): string {
    if (!this.isInputValid()) {
      throw new Error("Invalid inputs: missing previous transaction data");
    }
    const psbt = new PsbtV2();

    // Add Inputs to PSBT
    this._inputs.forEach((input) => addInputToPsbt(psbt, input)); // already checked for validness

    // Add Outputs to PSBT
    this._outputs.forEach((output) => {
      if (this.isOutputValid(output)) {
        addOutputToPsbt(psbt, output, this._network);
      }
    });
    return psbt.serialize("base64");
  }

  /**
   * Validates all inputs in the transaction.
   *
   * This method checks each input to ensure it has the necessary previous
   * transaction data (`witness utxo, non-witness utxo`). The previous transaction data is
   * crucial for validating the input, as it allows verification of the
   * UTXO being spent, ensuring the input references a legitimate and
   * unspent output.
   *
   * @param input - The input to check.
   * @returns {boolean} - Returns true if all inputs are valid, meaning they have
   *                      the required previous transaction data and meet other
   *                      validation criteria; returns false otherwise.
   */
  private isInputValid(): boolean {
    return this._inputs.every(
      (input) => input.hasRequiredFieldsforPSBT() && input.isValid(),
    );
  }

  /**
   * Checks if an output is valid.
   * @param output - The output to check
   * @returns True if the output is valid, false otherwise
   */
  private isOutputValid(output: BtcTxOutputTemplate): boolean {
    return output.isValid() && new BigNumber(output.amountSats).gt(0);
  }

  /**
   * Calculates the total input amount.
   * @returns {BigNumber} The total input amount in satoshis
   * @private
   */
  private calculateTotalInputAmount(): BigNumber {
    return this.inputs.reduce((sum, input) => {
      if (!input.isValid()) {
        throw new Error(`Invalid input: ${JSON.stringify(input)}`);
      }
      return sum.plus(new BigNumber(input.amountSats));
    }, new BigNumber(0));
  }

  /**
   * Calculates the total output amount.
   * @returns {BigNumber} The total output amount in satoshis
   * @private
   */
  private calculateTotalOutputAmount(): BigNumber {
    return this.outputs.reduce((sum, output) => {
      if (!output.isValid()) {
        throw new Error(`Invalid output: ${JSON.stringify(output)}`);
      }
      return sum.plus(new BigNumber(output.amountSats));
    }, new BigNumber(0));
  }

  /**
   * Calculates the total change amount.
   * @returns {BigNumber} The total change amount in satoshis
   * @private
   */
  private calculateChangeAmount(): BigNumber {
    return this.outputs.reduce(
      (acc, output) =>
        output.isMalleable ? acc.plus(new BigNumber(output.amountSats)) : acc,
      new BigNumber(0),
    );
  }

  /**
   * Calculates the estimated virtual size of the transaction.
   * @returns {number} The estimated virtual size in vbytes
   * @private
   */
  private calculateEstimatedVsize(): number {
    return estimateTransactionVsize({
      addressType: this._scriptType,
      numInputs: this.inputs.length,
      numOutputs: this.outputs.length,
      m: this._requiredSigners,
      n: this._totalSigners,
    });
  }

  /**
   * Calculates the current fee of the transaction.
   * @returns {BigNumber} The current fee in satoshis
   * @private
   */
  private calculateFee(): BigNumber {
    return this.calculateTotalInputAmount().minus(
      this.calculateTotalOutputAmount(),
    );
  }
}
