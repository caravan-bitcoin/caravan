import {
  BtcTxInputTemplate,
  BtcTxOutputTemplate,
} from "./btcTransactionComponents";
import { Network } from "@caravan/bitcoin";
import { Transaction } from "bitcoinjs-lib-v6";
import { PsbtV2 } from "@caravan/psbt";
import { Satoshis, TransactionTemplateOptions, TxOutputType } from "./types";
import BigNumber from "bignumber.js";
import {
  DEFAULT_DUST_THRESHOLD_IN_SATS,
  ABSURDLY_HIGH_ABS_FEE,
  ABSURDLY_HIGH_FEE_RATE,
} from "./constants";
import {
  createOutputScript,
  estimateTransactionVsize,
  initializePsbt,
  getOutputAddress,
} from "./utils";

/**
 * Represents a Bitcoin transaction template.
 * This class is used to construct and manipulate Bitcoin transactions.
 */
export class BtcTransactionTemplate {
  private readonly _inputs: BtcTxInputTemplate[];
  private readonly _outputs: BtcTxOutputTemplate[];
  private readonly _targetFeeRate: number;
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
    this._targetFeeRate = options.targetFeeRate;
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
  static fromRawPsbt(
    psbtHex: string,
    options: Omit<TransactionTemplateOptions, "inputs" | "outputs">,
  ): BtcTransactionTemplate {
    const psbt = initializePsbt(psbtHex);

    const inputs: BtcTxInputTemplate[] = [];
    for (let i = 0; i < psbt.PSBT_GLOBAL_INPUT_COUNT; i++) {
      const txid = psbt.PSBT_IN_PREVIOUS_TXID[i];
      const vout = psbt.PSBT_IN_OUTPUT_INDEX[i];
      const witnessUtxo = psbt.PSBT_IN_WITNESS_UTXO[i];
      const nonWitnessUtxo = psbt.PSBT_IN_NON_WITNESS_UTXO[i];

      if (!txid || vout === undefined) {
        throw new Error(`Missing txid or vout for input ${i}`);
      }

      let amountSats = "0";
      if (witnessUtxo) {
        const witnessUtxoBuffer = Buffer.from(witnessUtxo, "hex");
        const value = witnessUtxoBuffer.readUInt32LE(8); // Read 4 bytes starting at offset 8 for the value
        amountSats = value.toString();
      } else if (nonWitnessUtxo) {
        const tx = Transaction.fromBuffer(Buffer.from(nonWitnessUtxo, "hex"));
        amountSats = tx.outs[vout].value.toString();
      } else {
        throw new Error(`Missing UTXO information for input ${i}`);
      }

      inputs.push(
        new BtcTxInputTemplate({
          txid: Buffer.from(txid, "hex").reverse().toString("hex"),
          vout,
          amountSats,
        }),
      );
    }

    const outputs: BtcTxOutputTemplate[] = [];
    for (let i = 0; i < psbt.PSBT_GLOBAL_OUTPUT_COUNT; i++) {
      const script = Buffer.from(psbt.PSBT_OUT_SCRIPT[i], "hex");
      const amount = psbt.PSBT_OUT_AMOUNT[i];

      if (!script || amount === undefined) {
        throw new Error(`Missing script or amount for output ${i}`);
      }

      const address = getOutputAddress(script, options.network);

      outputs.push(
        new BtcTxOutputTemplate({
          address: address || "",
          amountSats: amount.toString(),
          type: TxOutputType.EXTERNAL, // Assume external by default
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
    return new BigNumber(this._targetFeeRate)
      .times(this.estimatedVsize)
      .integerValue(BigNumber.ROUND_CEIL)
      .toString();
  }

  /**
   * Calculates the current fee of the transaction.
   * @returns {Satoshis} The current fee in satoshis (as a string)
   */
  get currentFee(): Satoshis {
    return new BigNumber(this.getTotalInputAmount())
      .minus(new BigNumber(this.getTotalOutputAmount()))
      .toString();
  }

  /**
   * Checks if the current fees are sufficient to meet the target fee rate.
   * @returns True if the fees are paid, false otherwise
   */
  areFeesPaid(): boolean {
    return new BigNumber(this.currentFee).gte(this.targetFeesToPay);
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
    return this._inputs
      .reduce((sum, input) => {
        if (!input.isValid()) {
          throw new Error(`Invalid input: ${JSON.stringify(input)}`);
        }
        return sum.plus(new BigNumber(input.amountSats));
      }, new BigNumber(0))
      .toString();
  }

  /**
   * Calculates the total output amount.
   * @returns {Satoshis} The total output amount in satoshis (as a string)
   */
  getTotalOutputAmount(): Satoshis {
    return this._outputs
      .reduce((sum, output) => {
        if (!output.isValid()) {
          throw new Error(`Invalid output: ${JSON.stringify(output)}`);
        }
        return sum.plus(new BigNumber(output.amountSats));
      }, new BigNumber(0))
      .toString();
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
    return new BigNumber(this.currentFee)
      .dividedBy(this.estimatedVsize)
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
    const changeOutputs = this._outputs.filter(
      (output) => output.type === TxOutputType.CHANGE,
    );
    if (changeOutputs.length === 0) return;
    // TO DO (MRIGESH):
    // To handle for multiple change outputs
    //
    const changeOutput = changeOutputs[0];

    const totalIn = new BigNumber(this.getTotalInputAmount());
    const totalOutWithoutChange = this._outputs
      .filter((output) => !output.isMalleable)
      .reduce(
        (sum, output) => sum.plus(new BigNumber(output.amountSats)),
        new BigNumber(0),
      );
    const currentChangeAmount = new BigNumber(changeOutput.amountSats);
    const newChangeAmount = totalIn
      .minus(totalOutWithoutChange)
      .minus(new BigNumber(this.targetFeesToPay));

    if (newChangeAmount.gte(this._dustThreshold)) {
      const changeAmountDiff = newChangeAmount.minus(currentChangeAmount);

      if (!changeAmountDiff.isZero()) {
        changeOutput.addAmount(changeAmountDiff.toString());
      }
    } else {
      // If we're removing change, ensure we're not increasing fees unexpectedly
      if (currentChangeAmount.gt(0)) {
        const potentialNewFee = totalIn.minus(totalOutWithoutChange);
        if (potentialNewFee.gt(this.targetFeesToPay)) {
          throw new Error("Removing change would increase fees beyond target");
        }
      }
      this.removeOutput(this._outputs.indexOf(changeOutput));
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
      if (new BigNumber(output.amountSats).lte(this._dustThreshold)) {
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
    const psbt = new PsbtV2();

    this._inputs.forEach((input) => {
      if (this.isInputValid(input)) {
        psbt.addInput({
          previousTxId: input.txid,
          outputIndex: input.vout,
        });
      }
    });

    this._outputs.forEach((output) => {
      if (this.isOutputValid(output)) {
        const { address, amountSats } = output;
        const script = createOutputScript(address, this._network);
        if (!script) {
          throw new Error(
            `Unable to create output script for address: ${address}`,
          );
        }
        psbt.addOutput({
          script,
          amount: parseInt(amountSats),
        });
      }
    });

    return psbt.serialize("base64");
  }

  /**
   * Checks if an input is valid.
   * @param input - The input to check
   * @returns True if the input is valid, false otherwise
   */
  private isInputValid(input: BtcTxInputTemplate): boolean {
    return input.isValid();
  }

  /**
   * Checks if an output is valid.
   * @param output - The output to check
   * @returns True if the output is valid, false otherwise
   */
  private isOutputValid(output: BtcTxOutputTemplate): boolean {
    return (
      output.isValid() &&
      new BigNumber(output.amountSats).gt(this._dustThreshold)
    );
  }
}
