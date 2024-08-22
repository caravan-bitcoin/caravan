import {
  BtcTxInputTemplate,
  BtcTxOutputTemplate,
} from "./btcTransactionComponents";
import { Network, networkData } from "@caravan/bitcoin";
import { Transaction, TransactionBuilder } from "bitcoinjs-lib";
import { PsbtV2 } from "@caravan/psbt";
import { Satoshis, TransactionTemplateOptions } from "./types";
import { createOutputScript, estimateTransactionVsize } from "./utils";

/**
 * Represents a Bitcoin transaction template.
 * This class is used to construct and manipulate Bitcoin transactions.
 */
export class BtcTransactionTemplate {
  private readonly _inputs: BtcTxInputTemplate[];
  private readonly _outputs: BtcTxOutputTemplate[];
  private readonly _targetFeeRate: number;
  private readonly _dustThreshold: Satoshis;
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
    this._dustThreshold = options.dustThreshold;
    this._network = options.network;
    this._scriptType = options.scriptType;
    this._requiredSigners = options.requiredSigners || 1;
    this._totalSigners = options.totalSigners || 1;
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
   * @returns The target fees in satoshis
   */
  get targetFeesToPay(): Satoshis {
    return Math.ceil(this.estimatedVsize * this._targetFeeRate);
  }

  /**
   * Calculates the current fee of the transaction.
   * @returns The current fee in satoshis
   */
  get currentFee(): Satoshis {
    return this.getTotalInputAmount() - this.getTotalOutputAmount();
  }

  /**
   * Checks if the current fees are sufficient to meet the target fee rate.
   * @returns True if the fees are paid, false otherwise
   */
  areFeesPayPaid(): boolean {
    return this.currentFee >= this.targetFeesToPay;
  }

  /**
   * Checks if the current fee rate meets or exceeds the target fee rate.
   * @returns True if the fee rate is satisfied, false otherwise
   */
  get feeRateSatisfied(): boolean {
    return this.estimatedFeeRate >= this._targetFeeRate;
  }

  /**
   * Determines if a change output is needed.
   * @returns True if a change output is needed, false otherwise
   */
  get needsChangeOutput(): boolean {
    const targetFeesWithDustBuffer = this.targetFeesToPay + this._dustThreshold;
    return (
      !this.malleableOutputs.length &&
      this.currentFee > targetFeesWithDustBuffer
    );
  }

  /**
   * Calculates the total input amount.
   * @returns The total input amount in satoshis
   */
  getTotalInputAmount(): Satoshis {
    return this._inputs.reduce((sum, input) => sum + input.amountSats, 0);
  }

  /**
   * Calculates the total output amount.
   * @returns The total output amount in satoshis
   */
  getTotalOutputAmount(): Satoshis {
    return this._outputs.reduce((sum, output) => sum + output.amountSats, 0);
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
   * @returns The estimated fee rate in satoshis per vbyte
   */
  get estimatedFeeRate(): number {
    return this.currentFee / this.estimatedVsize;
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
   * If the new change amount is less than the dust threshold, the change output is removed.
   */
  adjustChangeOutput(): void {
    const changeOutput = this.malleableOutputs[0];
    if (!changeOutput) return;

    const totalIn = this.getTotalInputAmount();
    const totalOutWithoutChange = this._outputs
      .filter((output) => !output.isMalleable)
      .reduce((sum, output) => sum + output.amountSats, 0);

    const newChangeAmount =
      totalIn - totalOutWithoutChange - this.targetFeesToPay;

    if (newChangeAmount >= this._dustThreshold) {
      changeOutput.setAmount(newChangeAmount);
    } else {
      this.removeOutput(this._outputs.indexOf(changeOutput));
    }
  }

  /**
   * Validates the transaction.
   * @returns True if the transaction is valid, false otherwise
   * @throws Error if the fee rate or absolute fee is absurdly high
   */
  validate(): boolean {
    if (this.currentFee < this.targetFeesToPay) {
      return false;
    }

    for (const output of this._outputs) {
      if (output.amountSats <= this._dustThreshold) {
        return false;
      }
    }

    if (this.estimatedFeeRate >= 1000 || this.currentFee >= 1000000) {
      throw new Error(
        "Absurdly high fee detected. Transaction rejected for safety.",
      );
    }
    return this.feeRateSatisfied;
  }

  /**
   * Converts the transaction template to a raw transaction.
   * Only includes valid inputs and outputs.
   * @returns An unsigned Transaction object
   */
  toRawTransaction(): Transaction {
    const txb = new TransactionBuilder(networkData(this._network));
    this._inputs.forEach((input) => {
      if (this.isInputValid(input)) {
        txb.addInput(input.txid, input.vout);
      }
    });

    this._outputs.forEach((output) => {
      if (this.isOutputValid(output)) {
        txb.addOutput(output.address, output.amountSats);
      }
    });

    return txb.buildIncomplete();
  }

  /**
   * Converts the transaction template to a PSBT (Partially Signed Bitcoin Transaction).
   * Only includes valid inputs and outputs.
   * @returns A PsbtV2 object
   * @throws Error if an invalid address is encountered
   */
  toPsbt(): PsbtV2 {
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
          amount: amountSats,
        });
      }
    });

    return psbt;
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
    return output.isValid() && output.amountSats > this._dustThreshold;
  }
}
