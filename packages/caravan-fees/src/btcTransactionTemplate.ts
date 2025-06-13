import { Network, ExtendedPublicKey } from "@caravan/bitcoin";
import { PsbtV2 } from "@caravan/psbt";
import { BigNumber } from "bignumber.js";

import {
  BtcTxInputTemplate,
  BtcTxOutputTemplate,
} from "./btcTransactionComponents";
import {
  DEFAULT_DUST_THRESHOLD_IN_SATS,
  ABSURDLY_HIGH_ABS_FEE,
  ABSURDLY_HIGH_FEE_RATE,
} from "./constants";
import {
  Satoshis,
  TransactionTemplateOptions,
  ScriptType,
  GlobalXpub,
} from "./types";
import {
  createOutputScript,
  estimateTransactionVsize,
  initializePsbt,
  getOutputAddress,
  parseWitnessUtxoValue,
  parseNonWitnessUtxoValue,
  reverseHex,
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
  private readonly _scriptType: ScriptType;
  private readonly _requiredSigners: number;
  private readonly _totalSigners: number;
  private readonly _globalXpubs: GlobalXpub[];

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
    this._requiredSigners = options.requiredSigners;
    this._totalSigners = options.totalSigners;
    this._globalXpubs = options.globalXpubs || [];
  }

  /**
   * Creates a BtcTransactionTemplate from a raw PSBT hex string.
   * This method parses the PSBT, extracts input and output information,
   * and creates a new BtcTransactionTemplate instance.
   *
   * @param rawPsbt - The raw PSBT {PsbtV2 | string | Buffer}
   * @param options - Additional options for creating the template
   * @returns A new BtcTransactionTemplate instance
   * @throws Error if PSBT parsing fails or required information is missing
   */
  static fromPsbt(
    rawPsbt: string,
    options: Omit<TransactionTemplateOptions, "inputs" | "outputs">,
  ): BtcTransactionTemplate {
    const psbt = initializePsbt(rawPsbt);
    const inputs = BtcTransactionTemplate.processInputs(psbt);
    const outputs = BtcTransactionTemplate.processOutputs(
      psbt,
      options.network,
    );

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
  get inputs(): readonly BtcTxInputTemplate[] {
    return this._inputs;
  }

  /**
   * Gets the outputs of the transaction.
   * @returns A read-only array of outputs
   */
  get outputs(): readonly BtcTxOutputTemplate[] {
    return this._outputs;
  }

  /**
   * Gets the malleable outputs of the transaction.
   * Malleable outputs are all those that can have their amount changed, e.g. change outputs.
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
    return this.targetFees().toString();
  }

  /**
   * Calculates the current fee of the transaction.
   * @returns {Satoshis} The current fee in satoshis (as a string)
   */
  get currentFee(): Satoshis {
    return this.calculateCurrentFee().toString();
  }

  /**
   * Checks if the transaction needs a change output.
   * @returns {boolean} True if there's enough leftover funds for a change output above the dust threshold.
   */
  get needsChange(): boolean {
    const totalInput = this.calculateTotalInputAmount();
    const totalOutput = this.calculateTotalOutputAmount();
    const fee = new BigNumber(this.targetFeesToPay);
    const leftover = totalInput.minus(totalOutput).minus(fee);
    return leftover.isGreaterThan(this._dustThreshold);
  }

  /**
   * Checks if the current fees are sufficient to meet the target fee rate.
   * @returns True if the fees are paid, false otherwise
   */
  areFeesPaid(): boolean {
    return this.calculateCurrentFee().gte(this.targetFees());
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
    const MAX_OUTPUT_SIZE = 43; // Large enough to cover P2SH and P2WSH multisig outputs
    const changeOutputFee = new BigNumber(this._targetFeeRate).multipliedBy(
      MAX_OUTPUT_SIZE,
    );
    // Calculate the buffer: target fees + change output fee + dust threshold
    const changeOutputCost = this.targetFees()
      .plus(changeOutputFee)
      .plus(this._dustThreshold);

    return (
      !this.malleableOutputs.length &&
      this.calculateCurrentFee().gt(changeOutputCost)
    );
  }

  /**
   * Calculates the total input amount.
   * @returns {Satoshis} The total input amount in satoshis (as a string)
   */
  get totalInputAmount(): Satoshis {
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
  get totalOutputAmount(): Satoshis {
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
    return this.calculateCurrentFee()
      .dividedBy(this.calculateEstimatedVsize())
      .toString();
  }

  /**
   * Gets the global xpubs of the transaction.
   * @returns A read-only array of global xpubs
   */
  get globalXpubs(): readonly GlobalXpub[] {
    return this._globalXpubs;
  }

  /**
   * Adds a global xpub to the transaction.
   * @param globalXpub - The global xpub to add
   * @throws Error if the xpub already exists
   */
  addGlobalXpub(globalXpub: GlobalXpub): void {
    // Check if xpub already exists
    const exists = this._globalXpubs.some(
      (existing) => existing.xpub === globalXpub.xpub,
    );

    if (exists) {
      throw new Error(
        `Global xpub already exists: ${globalXpub.xpub} with path ${globalXpub.path}`,
      );
    }

    // Validate the xpub format (basic validation)
    if (!globalXpub.xpub || !globalXpub.path || !globalXpub.masterFingerprint) {
      throw new Error(
        "Global xpub must have xpub, path, and masterFingerprint",
      );
    }
    this._globalXpubs.push(globalXpub);
  }

  /**
   * Sets global xpubs for the transaction, replacing any existing ones.
   * @param globalXpubs - Array of global xpubs to set
   */
  set globalXpubs(globalXpubs: GlobalXpub[]) {
    // Clear existing xpubs
    this._globalXpubs.length = 0;

    // Add each new xpub
    globalXpubs.forEach((xpub) => this.addGlobalXpub(xpub));
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
   * Key behaviors:
   * 1. If there are multiple outputs and the change becomes dust, it removes the change output.
   * 2. If there's only one output (which must be the change output) and it becomes dust,
   *    it keeps the output to maintain a valid transaction structure.
   * 3. It calculates the difference between the new and current change amount.
   * 4. It ensures the transaction remains balanced after adjustment.
   *
   * @returns {string | null} The new change amount in satoshis as a string, or null if no adjustment was made or the change output was removed.
   * @throws {Error} If there's not enough input to satisfy non-change outputs and fees, or if the transaction doesn't balance after adjustment.
   */
  adjustChangeOutput(): Satoshis | null {
    if (this.malleableOutputs.length === 0) return null;

    // TO DO (MRIGESH):
    // To handle for multiple change outputs

    const changeOutput = this.malleableOutputs[0];
    const totalOutWithoutChange = this.calculateTotalOutputAmount().minus(
      this.calculateChangeAmount(),
    );
    const currentChangeAmount = new BigNumber(changeOutput.amountSats);

    const newChangeAmount = this.calculateTotalInputAmount()
      .minus(totalOutWithoutChange)
      .minus(this.targetFees());

    if (newChangeAmount.lt(0)) {
      throw new Error(
        `Input amount ${newChangeAmount.toString()} not enough to satisfy non-change output amounts.`,
      );
    }

    const changeAmountDiff = newChangeAmount.minus(currentChangeAmount);

    // add change amount
    changeOutput.addAmount(changeAmountDiff.toString());

    // Check if the new change amount is below the dust threshold
    if (new BigNumber(changeOutput.amountSats).lt(this._dustThreshold)) {
      if (this.outputs.length > 1) {
        // If there are multiple outputs, we can remove the dust change output
        const changeOutputIndex = this.outputs.findIndex(
          (output) => output === changeOutput,
        );
        if (changeOutputIndex !== -1) {
          this.removeOutput(changeOutputIndex);
        }
        // The fee will automatically adjust as it's calculated based on inputs minus outputs
        return null;
      } else {
        // If this is the only output, we must keep it to have a valid transaction
        console.warn(
          "Change output is below dust threshold but cannot be removed as it's the only output.",
        );
      }
    }

    // get current out amount after adjustment
    const balanceCheck = this.calculateTotalInputAmount()
      .minus(this.calculateTotalOutputAmount())
      .minus(this.targetFees());

    if (!balanceCheck.isZero()) {
      throw new Error(
        `Transaction does not balance. Discrepancy: ${balanceCheck.toString()} satoshis`,
      );
    }

    return newChangeAmount.toString();
  }

  /**
   * Validates the entire transaction template.
   *
   * This method performs a comprehensive check of the transaction, including:
   * 1. Validation of all inputs:
   *    - Checks if each input has the required fields for PSBT creation.
   *    - Validates each input's general structure and data.
   * 2. Validation of all outputs:
   *    - Ensures each output has a valid address and amount.
   * 3. Verification that the current fee meets or exceeds the target fee
   * 4. Check that the fee rate is not absurdly high
   * 5. Check that the absolute fee is not absurdly high
   *
   * @returns {boolean} True if the transaction is valid according to all checks, false otherwise.
   *
   * @throws {Error} If any validation check encounters an unexpected error.
   *
   * @example
   * const txTemplate = new BtcTransactionTemplate(options);
   * if (txTemplate.validate()) {
   *   console.log("Transaction is valid");
   * } else {
   *   console.log("Transaction is invalid");
   * }
   */
  validate(): boolean {
    // 1. Validate all inputs
    if (!this.validateInputs()) {
      return false;
    }

    // 2. Validate each output
    if (!this._outputs.every((output) => output.isValid())) {
      return false;
    }

    // 3. Check if fees hit the target
    if (this.calculateCurrentFee().lt(this.targetFees())) {
      return false;
    }

    // 4. Check if the fee rate isn't absurd
    const feeRate = new BigNumber(this.estimatedFeeRate);
    if (feeRate.gte(new BigNumber(ABSURDLY_HIGH_FEE_RATE))) {
      return false;
    }

    // 5. Check if the absolute fee isn't absurd
    if (this.calculateCurrentFee().gte(new BigNumber(ABSURDLY_HIGH_ABS_FEE))) {
      return false;
    }

    return true;
  }

  /**
   * Converts the transaction template to a base64-encoded PSBT (Partially Signed Bitcoin Transaction) string.
   * This method creates a new PSBT, adds all valid inputs and outputs from the template,
   * and then serializes the PSBT to a base64 string.
   *
   * By default, it validates the entire transaction before creating the PSBT. This validation
   * can be optionally skipped for partial or in-progress transactions.
   *
   * The method performs the following steps:
   * 1. If validation is enabled (default), it calls the `validate()` method to ensure
   *    the transaction is valid.
   * 2. Creates a new PsbtV2 instance.
   * 3. Adds all inputs from the template to the PSBT, including UTXO information.
   *    - During this step, each input's `txid`, which is internally stored in **big-endian**
   *      (human-readable) format, is **converted to little-endian** format as required by
   *      Bitcoin’s serialization rules.
   * 4. Adds all outputs from the template to the PSBT.
   * 5. Serializes the PSBT to a base64-encoded string.
   *
   * @param {boolean} [validated=true] - Whether to validate the transaction before creating the PSBT.
   *                                     Set to false to skip validation for partial transactions.
   *
   * @returns A base64-encoded string representation of the PSBT.
   *
   * @throws {Error} If validation is enabled and the transaction fails validation checks.
   * @throws {Error} If an invalid address is encountered when creating an output script.
   * @throws {Error} If there's an issue with input or output data that prevents PSBT creation.
   * @throws {Error} If serialization of the PSBT fails.
   *
   * @remarks
   * - Only inputs and outputs that pass the `isInputValid` and `isOutputValid` checks are included.
   * - Input amounts are not included in the PSBT. If needed, they should be added separately.
   * - Output amounts are converted from string to integer (satoshis) when added to the PSBT.
   * - The resulting PSBT is not signed and may require further processing (e.g., signing) before it can be broadcast.
   * - Input `txid`s are stored in **big-endian** format internally for readability and compatibility with common UTXO sources,
   *   but are **converted to little-endian** here, during PSBT serialization as per Bitcoin protocol requirements.
   */
  toPsbt(validated: boolean = true): string {
    if (validated && !this.validate()) {
      throw new Error("Invalid transaction: failed validation checks");
    }

    const psbt = new PsbtV2();

    if (this.globalXpubs) {
      // Add Global Xpubs to PSBT
      this.globalXpubs.forEach((globalXpub) => {
        try {
          // So we need to first decode the base58check-encoded xpub to get the raw 78-byte extended public key and then add that to PSBT
          const xpubBuffer = ExtendedPublicKey.fromBase58(
            globalXpub.xpub,
          ).encode();
          const fingerprintBuffer = Buffer.from(
            globalXpub.masterFingerprint,
            "hex",
          );

          psbt.addGlobalXpub(xpubBuffer, fingerprintBuffer, globalXpub.path);
        } catch (error) {
          throw new Error(
            `Failed to add global xpub to PSBT: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      });
    }

    // Add Inputs to PSBT
    this._inputs.forEach((input) => this.addInputToPsbt(psbt, input)); // already checks for validity

    // Add Outputs to PSBT
    this._outputs.forEach((output) => this.addOutputToPsbt(psbt, output));

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
  private validateInputs(): boolean {
    return this._inputs.every(
      (input) => input.hasRequiredFieldsforPSBT() && input.isValid(),
    );
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
   * @returns {BigNumber} The current fee in satoshis (as a BN)
   * @private
   */
  private calculateCurrentFee(): BigNumber {
    return this.calculateTotalInputAmount().minus(
      this.calculateTotalOutputAmount(),
    );
  }

  /**
   * Calculates the target fees to pay based on the estimated size and target fee rate.
   * @returns {Satoshis} The target fees in satoshis (as a BN)
   * @private
   */
  private targetFees(): BigNumber {
    return this._targetFeeRate
      .times(this.calculateEstimatedVsize())
      .integerValue(BigNumber.ROUND_CEIL);
  }

  /**
   * Processes the inputs from a PSBT and creates BtcTxInputTemplate instances.
   *
   * @param psbt - The initialized PSBT
   * @returns An array of BtcTxInputTemplate instances
   * @throws Error if required input information is missing
   */
  private static processInputs(psbt: PsbtV2): BtcTxInputTemplate[] {
    const inputs: BtcTxInputTemplate[] = [];

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

      BtcTransactionTemplate.setInputUtxo(input, psbt, i);

      inputs.push(input);
    }

    return inputs;
  }

  /**
   * Sets the UTXO information for a given input.
   *
   * @param input - The BtcTxInputTemplate to update
   * @param psbt - The PSBT containing the input information
   * @param index - The index of the input in the PSBT
   * @throws Error if UTXO information is missing
   */
  private static setInputUtxo(
    input: BtcTxInputTemplate,
    psbt: PsbtV2,
    index: number,
  ): void {
    const witnessUtxo = psbt.PSBT_IN_WITNESS_UTXO[index];
    const nonWitnessUtxo = psbt.PSBT_IN_NON_WITNESS_UTXO[index];

    if (witnessUtxo) {
      const amountSats = parseWitnessUtxoValue(witnessUtxo, index).toString();
      const witnessUtxoBuffer = Buffer.from(witnessUtxo, "hex");
      const value = witnessUtxoBuffer.readUInt32LE(0);
      const script = witnessUtxoBuffer.slice(4);

      input.witnessUtxo = { script, value };
      input.amountSats = amountSats;
    } else if (nonWitnessUtxo) {
      const amountSats = parseNonWitnessUtxoValue(
        nonWitnessUtxo,
        index,
      ).toString();
      input.nonWitnessUtxo = Buffer.from(nonWitnessUtxo, "hex");
      input.amountSats = amountSats;

      input.nonWitnessUtxo = Buffer.from(nonWitnessUtxo, "hex");
      input.amountSats = amountSats;
    } else {
      throw new Error(`Missing UTXO information for input ${index}`);
    }
  }

  /**
   * Processes the outputs from a PSBT and creates BtcTxOutputTemplate instances.
   *
   * @param psbt - The initialized PSBT
   * @param network - The Bitcoin network
   * @returns An array of BtcTxOutputTemplate instances
   * @throws Error if required output information is missing
   */
  private static processOutputs(
    psbt: PsbtV2,
    network: Network,
  ): BtcTxOutputTemplate[] {
    const outputs: BtcTxOutputTemplate[] = [];

    for (let i = 0; i < psbt.PSBT_GLOBAL_OUTPUT_COUNT; i++) {
      const script = Buffer.from(psbt.PSBT_OUT_SCRIPT[i], "hex");
      const amount = psbt.PSBT_OUT_AMOUNT[i];

      if (!script || amount === undefined) {
        throw new Error(`Missing script or amount for output ${i}`);
      }

      const address = getOutputAddress(script, network);
      if (!address) {
        throw new Error(`Unable to derive address for output ${i}`);
      }

      outputs.push(
        new BtcTxOutputTemplate({
          address,
          amountSats: amount.toString(),
          locked: true, // We don't want to change these outputs
        }),
      );
    }

    return outputs;
  }

  /**
   * Adds a single input to the provided PSBT based on the given input template (used in BtcTransactionTemplate)
   *
   * This method performs the following:
   * - Validates that the input has the required fields.
   * - Converts the input `txid` from big-endian (human-readable) to little-endian, as required by Bitcoin's protocol.
   * - Constructs the PSBT input object including optional fields like witness/non-witness UTXO, scripts, and derivation paths.
   * - Adds the input to the PSBT using `psbt.addInput()`.
   *
   * @param {PsbtV2} psbt - The PsbtV2 object.
   * @param input - The input template to be processed and added.
   * @throws {Error} - Throws an error if script extraction or PSBT input addition fails.
   *
   * @remarks
   * The `txid` in the `input` is expected to be in big-endian (UI-friendly) format.
   * Bitcoin’s serialization format, however, uses little-endian for transaction IDs.
   * Therefore, `txid` is reversed using `reverseHex()` before being added to the PSBT input.
   */
  private addInputToPsbt(psbt: PsbtV2, input: BtcTxInputTemplate): void {
    if (!input.hasRequiredFieldsforPSBT()) {
      throw new Error(
        `Input ${input.txid}:${input.vout} lacks required UTXO information`,
      );
    }

    const inputData: any = {
      // Convert txid from big-endian (UI format) to little-endian (Bitcoin protocol format)
      previousTxId: reverseHex(input.txid),
      outputIndex: input.vout,
    };
    // Add non-witness UTXO if available
    if (input.nonWitnessUtxo) {
      inputData.nonWitnessUtxo = input.nonWitnessUtxo;
    }

    // Add witness UTXO if available
    if (input.witnessUtxo) {
      inputData.witnessUtxo = {
        amount: input.witnessUtxo.value,
        script: input.witnessUtxo.script,
      };
    }

    // Add sequence if set
    if (input.sequence !== undefined) {
      inputData.sequence = input.sequence;
    }

    // Add redeem script if available (for P2SH inputs)
    if (input.redeemScript) {
      inputData.redeemScript = input.redeemScript;
    }

    // Add witness script if available (for P2WSH and P2SH-P2WSH inputs)
    if (input.witnessScript) {
      inputData.witnessScript = input.witnessScript;
    }

    // Add BIP32 derivation information if available
    if (input.bip32Derivations && input.bip32Derivations.length > 0) {
      inputData.bip32Derivation = input.bip32Derivations.map((derivation) => ({
        pubkey: Buffer.from(derivation.pubkey),
        masterFingerprint: Buffer.from(derivation.masterFingerprint),
        path: derivation.path,
      }));
    }
    try {
      psbt.addInput(inputData);
    } catch (error) {
      throw new Error(
        `Failed to add input to PSBT: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  /**
   * Adds an output to the PSBT(used in BtcTransactionTemplate)
   *
   * @param {PsbtV2} psbt - The PsbtV2 object.
   * @param {BtcTxOutputTemplate} output - The output template to be processed and added.
   * @throws {Error} - Throws an error if output script creation fails.
   */
  private addOutputToPsbt(psbt: PsbtV2, output: BtcTxOutputTemplate): void {
    const script = createOutputScript(output.address, this._network);
    if (!script) {
      throw new Error(
        `Unable to create output script for address: ${output.address}`,
      );
    }
    psbt.addOutput({
      script,
      amount: parseInt(output.amountSats),
    });
  }
}
