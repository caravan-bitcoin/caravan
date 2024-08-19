import { Transaction, payments } from "bitcoinjs-lib-v6";
import { networkData, Network } from "@caravan/bitcoin";
import {
  UTXO,
  AnalyzerOptions,
  FeeBumpStrategy,
  TransactionInput,
  TransactionOutput,
} from "./types";
import { ESTIMATED_CHILD_TX_SIZE } from "./constants";
import BigNumber from "bignumber.js";

/**
 * TransactionAnalyzer Class
 *
 * This class provides comprehensive analysis of Bitcoin transactions, including
 * fee estimation, RBF (Replace-By-Fee) and CPFP (Child-Pays-For-Parent) capabilities.
 * It's designed to help wallet developers make informed decisions about fee bumping
 * strategies for unconfirmed transactions.
 *
 * Key Features:
 * - Analyzes transaction inputs, outputs, fees, and size
 * - Determines RBF and CPFP eligibility
 * - Recommends optimal fee bumping strategy
 * - Estimates fees for RBF and CPFP operations
 * - Provides detailed transaction information for wallet integration
 *
 * Usage:
 * const analyzer = new TransactionAnalyzer(txHex, options);
 * const analysis = analyzer.analyze();
 *
 * @class
 */
export class TransactionAnalyzer {
  protected readonly originalTx: Transaction;
  protected readonly network: Network;
  protected _targetFeeRate: number;
  protected currentFeeRate: number;
  protected availableUTXOs: UTXO[];
  protected readonly dustThreshold: BigNumber;
  protected changeOutputIndex: number | undefined;
  protected incrementalRelayFee: BigNumber;
  protected readonly requiredSigners: number;
  protected readonly totalSigners: number;

  private _inputs: TransactionInput[] | null = null;
  private _outputs: TransactionOutput[] | null = null;
  private _fee: BigNumber | null = null;
  private _feeRate: BigNumber | null = null;
  private _canRBF: boolean | null = null;
  private _canCPFP: boolean | null = null;
  private _rbfFeeRate: string | null = null;
  private _cpfpFeeRate: string | null = null;
  private _recommendedStrategy: FeeBumpStrategy | null = null;

  /**
   * Creates an instance of TransactionAnalyzer.
   *
   * @param {string} txHex - The hexadecimal representation of the transaction to analyze
   * @param {AnalyzerOptions} options - Configuration options for the analyzer
   * @throws {Error} If the transaction is invalid or lacks inputs/outputs
   */
  constructor(txHex: string, options: AnalyzerOptions) {
    try {
      this.originalTx = Transaction.fromHex(txHex);
    } catch (error: any) {
      throw new Error(`Invalid transaction: ${error.message}`);
    }
    this.validateTransaction();
    this.network = options.network;
    this._targetFeeRate = options.targetFeeRate;
    this.currentFeeRate = options.currentFeeRate;
    this.availableUTXOs = options.availableUTXOs;
    this.dustThreshold = new BigNumber(options.dustThreshold);
    this.changeOutputIndex = options.changeOutputIndex;
    this.incrementalRelayFee = new BigNumber(options.incrementalRelayFee || 1);
    this.requiredSigners = options.requiredSigners;
    this.totalSigners = options.totalSigners;
  }

  /**
   * Gets the transaction ID (txid) of the analyzed transaction.
   * @returns {string} The transaction ID
   */
  get txid(): string {
    return this.originalTx.getId();
  }

  /**
   * Gets the virtual size (vsize) of the transaction in virtual bytes.
   * @returns {number} The virtual size of the transaction
   */
  get vsize(): number {
    return this.originalTx.virtualSize();
  }

  /**
   * Gets the weight of the transaction in weight units.
   * @returns {number} The weight of the transaction
   */
  get weight(): number {
    return this.originalTx.weight();
  }

  /**
   * Gets the analyzed inputs of the transaction.
   * @returns {TransactionInput[]} An array of transaction inputs
   */
  get inputs(): TransactionInput[] {
    if (!this._inputs) {
      this._inputs = this.analyzeInputs();
    }
    return this._inputs;
  }

  /**
   * Gets the analyzed outputs of the transaction.
   * @returns {TransactionOutput[]} An array of transaction outputs
   */
  get outputs(): TransactionOutput[] {
    if (!this._outputs) {
      this._outputs = this.analyzeOutputs();
    }
    return this._outputs;
  }

  /**
   * Calculates and returns the fee of the transaction in satoshis.
   * @returns {string} The transaction fee in satoshis
   */
  get fee(): string {
    if (!this._fee) {
      this._fee = this.calculateFee();
    }
    return this._fee.toString();
  }

  /**
   * Calculates and returns the fee rate of the transaction in satoshis per vbyte.
   * @returns {string} The transaction fee rate in satoshis per vbyte
   */
  get feeRate(): string {
    if (!this._feeRate) {
      this._feeRate = new BigNumber(this.fee).dividedBy(this.vsize);
    }
    return this._feeRate.toString();
  }

  /**
   * Determines if the transaction is eligible for RBF (Replace-By-Fee).
   * @returns {boolean} True if the transaction can be replaced using RBF, false otherwise
   */
  get canRBF(): boolean {
    if (this._canRBF === null) {
      this._canRBF = this.canPerformRBF();
    }
    return this._canRBF;
  }

  /**
   * Determines if the transaction is eligible for CPFP (Child-Pays-For-Parent).
   * @returns {boolean} True if CPFP can be performed on this transaction, false otherwise
   */
  get canCPFP(): boolean {
    if (this._canCPFP === null) {
      this._canCPFP = this.canPerformCPFP();
    }
    return this._canCPFP;
  }

  /**
   * Recommends the optimal fee bumping strategy based on the current transaction state.
   * @returns {FeeBumpStrategy} The recommended fee bumping strategy
   */
  get recommendedStrategy(): FeeBumpStrategy {
    if (!this._recommendedStrategy) {
      this._recommendedStrategy = this.recommendStrategy();
    }
    return this._recommendedStrategy;
  }

  /**
   * Gets the list of available UTXOs for potential use in fee bumping.
   * @returns {UTXO[]} An array of available UTXOs
   */
  get getAvailableUTXOs(): UTXO[] {
    return this.availableUTXOs;
  }

  /**
   * Gets the current target fee rate in satoshis per vbyte.
   * @returns {number} The target fee rate
   */
  get targetFeeRate(): number {
    return this._targetFeeRate;
  }

  /**
   * Calculates and returns the minimum fee rate required for a successful RBF.
   * @returns {string} The minimum RBF fee rate in satoshis per vbyte
   */
  get rfbFeeRate(): string {
    if (!this._rbfFeeRate) {
      const currentFeeRate = this.feeRate;

      const minReplacementFeeRate = BigNumber.max(
        new BigNumber(currentFeeRate).plus(this.incrementalRelayFee),
        new BigNumber(this.targetFeeRate),
      );

      this._rbfFeeRate = minReplacementFeeRate.toString();
    }
    return this._rbfFeeRate;
  }

  /**
   * Calculates and returns the fee rate required for a successful CPFP.
   * @returns {string} The CPFP fee rate in satoshis per vbyte
   */
  get cpfpFeeRate(): string {
    if (!this._cpfpFeeRate) {
      const originalTxVBytes = this.vsize;
      const packageSize = originalTxVBytes + ESTIMATED_CHILD_TX_SIZE;
      const desiredPackageFee = new BigNumber(this.targetFeeRate).multipliedBy(
        packageSize,
      );
      const expectedFeeRate = BigNumber.max(
        desiredPackageFee.minus(this.fee),
        new BigNumber(0),
      ).dividedBy(ESTIMATED_CHILD_TX_SIZE);

      this._cpfpFeeRate = expectedFeeRate.toString();
    }
    return this._cpfpFeeRate;
  }

  /**
   * Calculates and returns the recommended fee rate based on the current transaction state and target fee rate.
   * @returns {number} The recommended fee rate in satoshis per vbyte
   */
  get getRecommendedFeeRate(): number {
    const currentFeeRate = parseFloat(this.feeRate);
    const targetFeeRate = this.targetFeeRate;

    if (currentFeeRate >= targetFeeRate) {
      return currentFeeRate; // Current fee rate is already sufficient
    }

    if (this.canRBF && (!this.canCPFP || this.rfbFeeRate <= this.cpfpFeeRate)) {
      return Math.max(Number(this.rfbFeeRate), targetFeeRate);
    } else if (this.canCPFP) {
      return Math.max(Number(this.cpfpFeeRate), targetFeeRate);
    } else {
      return targetFeeRate; // If neither RBF nor CPFP is possible, return the target fee rate
    }
  }

  /**
   * Gets the dust threshold used for analysis.
   * @returns {string} The dust threshold in satoshis
   */
  get getDustThreshold(): string {
    return this.dustThreshold.toString();
  }

  /**
   * Sets a new target fee rate for the transaction analysis.
   * @param {number} rate - The new target fee rate in satoshis per vbyte
   */
  set setTargetFeeRate(rate: number) {
    this._targetFeeRate = rate;
    this._recommendedStrategy = null; // Reset cached value
  }

  /**
   * Sets the index of the change output in the transaction.
   * @param {number | undefined} index - The index of the change output, or undefined if no change output
   */
  set setChangeOutput(index: number | undefined) {
    this.changeOutputIndex = index;
    this._outputs = null; // Reset cached value
    this._canCPFP = null; // Reset cached value
    this._cpfpFeeRate = null; // Reset cached value
  }

  /**
   * Performs a comprehensive analysis of the transaction.
   * @returns {Object} An object containing detailed transaction analysis
   */
  public analyze(): {
    txid: string;
    vsize: number;
    weight: number;
    fee: string;
    feeRate: string;
    inputs: TransactionInput[];
    outputs: TransactionOutput[];
    isRBFSignaled: boolean;
    canRBF: boolean;
    canCPFP: boolean;
    recommendedStrategy: FeeBumpStrategy;
    estimatedRBFFee: string;
    estimatedCPFPFee: string;
  } {
    return {
      txid: this.txid,
      vsize: this.vsize,
      weight: this.weight,
      fee: this.fee,
      feeRate: this.feeRate,
      inputs: this.inputs,
      outputs: this.outputs,
      isRBFSignaled: this.isRBFSignaled(),
      canRBF: this.canRBF,
      canCPFP: this.canCPFP,
      recommendedStrategy: this.recommendedStrategy,
      estimatedRBFFee: this.estimateRBFFee(),
      estimatedCPFPFee: this.estimateCPFPFee(),
    };
  }

  /**
   * Retrieves the inputs of the transaction in a format suitable for creating a new transaction.
   * @returns {Object[]} An array of input objects
   */
  public getInputsForNewTransaction(): {
    hash: Buffer;
    index: number;
    sequence: number;
  }[] {
    return this.originalTx.ins.map((input) => ({
      hash: input.hash,
      index: input.index,
      sequence: input.sequence,
    }));
  }

  /**
   * Retrieves the outputs of the transaction in a format suitable for creating a new transaction.
   * @returns {Object[]} An array of output objects
   */
  public getOutputsForNewTransaction(): { script: Buffer; value: number }[] {
    return this.originalTx.outs.map((output) => ({
      script: output.script,
      value: output.value,
    }));
  }

  /**
   * Estimates the fee required for a successful RBF (Replace-By-Fee) operation.
   * @returns {string} The estimated RBF fee in satoshis
   */
  public estimateRBFFee(): string {
    const currentFee = this.fee;
    const vsize = this.vsize;

    const minReplacementFee = BigNumber.max(
      new BigNumber(currentFee).plus(
        this.incrementalRelayFee.multipliedBy(vsize),
      ),
      new BigNumber(this.rfbFeeRate).multipliedBy(vsize),
    );

    return String(
      BigNumber.max(minReplacementFee.minus(currentFee), new BigNumber(1)),
    );
  }

  /**
   * Estimates the fee required for a successful CPFP (Child-Pays-For-Parent) operation.
   * @returns {string} The estimated CPFP fee in satoshis
   */
  public estimateCPFPFee(): string {
    const originalTxVBytes = this.vsize;
    const packageSize = originalTxVBytes + ESTIMATED_CHILD_TX_SIZE;

    return new BigNumber(this.cpfpFeeRate).multipliedBy(packageSize).toString();
  }

  /**
   * Retrieves the change output of the transaction, if it exists.
   * @returns {TransactionOutput | null} The change output or null if no change output exists
   */
  public getChangeOutput(): TransactionOutput | null {
    if (this.changeOutputIndex !== undefined) {
      return this.outputs[this.changeOutputIndex];
    }
    return null;
  }

  // Protected methods

  /**
   * Analyzes the inputs of the transaction.
   * @returns {TransactionInput[]} An array of analyzed transaction inputs
   * @protected
   */
  protected analyzeInputs(): TransactionInput[] {
    return this.originalTx.ins.map((input) => ({
      txid: input.hash.reverse().toString("hex"),
      vout: input.index,
      sequence: input.sequence,
      scriptSig: input.script.toString("hex"),
      witness: input.witness.map((w) => w.toString("hex")),
    }));
  }

  /**
   * Analyzes the outputs of the transaction.
   * @returns {TransactionOutput[]} An array of analyzed transaction outputs
   * @protected
   */
  protected analyzeOutputs(): TransactionOutput[] {
    return this.originalTx.outs.map((output, index) => ({
      value: output.value,
      scriptPubKey: output.script.toString("hex"),
      address: this.getOutputAddress(output.script),
      isChange: index === this.changeOutputIndex,
    }));
  }

  /**
   * Attempts to derive the address from an output script.
   * @param {Buffer} script - The output script
   * @returns {string} The derived address or an error message if unable to derive
   * @protected
   */
  protected getOutputAddress(script: Buffer): string {
    try {
      const p2pkhAddress = payments.p2pkh({
        output: script,
        network: networkData(this.network),
      }).address;
      const p2shAddress = payments.p2sh({
        output: script,
        network: networkData(this.network),
      }).address;
      const p2wpkhAddress = payments.p2wpkh({
        output: script,
        network: networkData(this.network),
      }).address;
      const p2wshAddress = payments.p2wsh({
        output: script,
        network: networkData(this.network),
      }).address;

      return (
        p2pkhAddress ||
        p2shAddress ||
        p2wpkhAddress ||
        p2wshAddress ||
        "Unable to derive address"
      );
    } catch (e) {
      return "Unable to derive address";
    }
  }

  /**
   * Calculates the fee for the transaction.
   * @returns {BigNumber} The calculated fee in satoshis
   * @protected
   */
  protected calculateFee(): BigNumber {
    return new BigNumber(this.currentFeeRate).multipliedBy(this.vsize);
  }

  /**
   * Checks if the transaction signals RBF (Replace-By-Fee).
   * @returns {boolean} True if the transaction signals RBF, false otherwise
   * @protected
   */
  protected isRBFSignaled(): boolean {
    return this.originalTx.ins.some((input) => input.sequence < 0xfffffffe);
  }

  /**
   * Determines if RBF (Replace-By-Fee) can be performed on this transaction.
   * @returns {boolean} True if RBF can be performed, false otherwise
   * @protected
   */
  protected canPerformRBF(): boolean {
    return this.isRBFSignaled();
  }

  /**
   * Determines if CPFP (Child-Pays-For-Parent) can be performed on this transaction.
   * @returns {boolean} True if CPFP can be performed, false otherwise
   * @protected
   */
  protected canPerformCPFP(): boolean {
    return this.outputs.some(
      (output) =>
        !output.isChange &&
        new BigNumber(output.value).isGreaterThan(this.dustThreshold),
    );
  }

  /**
   * Recommends the optimal fee bumping strategy based on the current transaction state.
   * @returns {FeeBumpStrategy} The recommended fee bumping strategy
   * @protected
   */
  protected recommendStrategy(): FeeBumpStrategy {
    if (
      new BigNumber(this.feeRate).isGreaterThanOrEqualTo(this.targetFeeRate)
    ) {
      return FeeBumpStrategy.NONE;
    }

    const rbfFee = this.estimateRBFFee();
    const cpfpFee = this.estimateCPFPFee();

    if (
      this.canRBF &&
      (!this.canCPFP || new BigNumber(rbfFee).isLessThan(cpfpFee))
    ) {
      return FeeBumpStrategy.RBF;
    } else if (this.canCPFP) {
      return FeeBumpStrategy.CPFP;
    }

    return FeeBumpStrategy.NONE;
  }

  /**
   * Validates the transaction to ensure it has inputs and outputs.
   * @throws {Error} If the transaction has no inputs or outputs
   * @private
   */
  private validateTransaction() {
    if (this.originalTx.ins.length === 0) {
      throw new Error("Transaction has no inputs");
    }
    if (this.originalTx.outs.length === 0) {
      throw new Error("Transaction has no outputs");
    }
  }
}
