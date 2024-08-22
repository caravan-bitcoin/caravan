import { Transaction } from "bitcoinjs-lib-v6";
import { Network } from "@caravan/bitcoin";
import {
  UTXO,
  AnalyzerOptions,
  FeeBumpStrategy,
  TransactionInput,
  TransactionOutput,
  Satoshis,
  TxOutputType,
} from "./types";
import {
  BtcTxInputTemplate,
  BtcTxOutputTemplate,
} from "./btcTransactionComponents";
import { getOutputAddress, estimateTransactionVsize } from "./utils";

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
  private readonly _originalTx: Transaction;
  private readonly _network: Network;
  private readonly _targetFeeRate: number;
  private readonly _absoluteFee: BigNumber;
  private readonly _availableUtxos: UTXO[];
  private readonly _dustThreshold: BigNumber;
  private readonly _changeOutputIndex: number | undefined;
  private readonly _incrementalRelayFee: BigNumber;
  private readonly _requiredSigners: number;
  private readonly _totalSigners: number;
  private readonly _addressType: string;

  private _inputs: TransactionInput[] | null = null;
  private _outputs: TransactionOutput[] | null = null;
  private _feeRate: BigNumber | null = null;
  private _canRBF: boolean | null = null;
  private _canCPFP: boolean | null = null;
  private _rbfFeeRate: BigNumber | null = null;
  private _cpfpFeeRate: BigNumber | null = null;
  private _recommendedStrategy: FeeBumpStrategy | null = null;
  private _assumeRBF: boolean = false;

  /**
   * Creates an instance of TransactionAnalyzer.
   * @param {AnalyzerOptions} options - Configuration options for the analyzer
   * @throws {Error} If the transaction is invalid or lacks inputs/outputs
   */
  constructor(options: AnalyzerOptions) {
    try {
      this._originalTx = Transaction.fromHex(options.txHex);
    } catch (error) {
      throw new Error(
        `Invalid transaction: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    this.validateTransaction();
    this._network = options.network;
    this._targetFeeRate = options.targetFeeRate;
    this._absoluteFee = new BigNumber(options.absoluteFee);
    this._availableUtxos = options.availableUtxos;
    this._dustThreshold = new BigNumber(options.dustThreshold);
    this._changeOutputIndex = options.changeOutputIndex;
    this._incrementalRelayFee = new BigNumber(options.incrementalRelayFee || 1);
    this._requiredSigners = options.requiredSigners;
    this._totalSigners = options.totalSigners;
    this._addressType = options.addressType;
  }

  /**
   * Gets the transaction ID (txid) of the analyzed transaction.
   * @returns {string} The transaction ID
   */
  get txid(): string {
    return this._originalTx.getId();
  }

  /**
   * Gets the virtual size (vsize) of the transaction in virtual bytes.
   * @returns {number} The virtual size of the transaction
   */
  get vsize(): number {
    return this._originalTx.virtualSize();
  }

  /**
   * Gets the weight of the transaction in weight units.
   * @returns {number} The weight of the transaction
   */
  get weight(): number {
    return this._originalTx.weight();
  }

  /**
   * Gets the analyzed inputs of the transaction.
   * @returns {TransactionInput[]} An array of transaction inputs
   */
  get inputs(): TransactionInput[] {
    if (!this._inputs) {
      this._inputs = this.deserializeInputs();
    }
    return this._inputs;
  }

  /**
   * Gets the analyzed outputs of the transaction.
   * @returns {TransactionOutput[]} An array of transaction outputs
   */
  get outputs(): TransactionOutput[] {
    if (!this._outputs) {
      this._outputs = this.deserializeOutputs();
    }
    return this._outputs;
  }

  /**
   * Calculates and returns the fee of the transaction in satoshis.
   * @returns {string} The transaction fee in satoshis
   */
  get fee(): string {
    return this._absoluteFee.toString();
  }

  /**
   * Calculates and returns the fee rate of the transaction in satoshis per vbyte.
   * @returns {string} The transaction fee rate in satoshis per vbyte
   */
  get feeRate(): string {
    if (!this._feeRate) {
      this._feeRate = this._absoluteFee.dividedBy(this.vsize);
    }
    return this._feeRate.toString();
  }

  /**
   * Gets whether RBF is assumed to be always possible, regardless of signaling.
   * @returns {boolean} True if RBF is assumed to be always possible, false otherwise
   */
  get assumeRBF(): boolean {
    return this._assumeRBF;
  }

  /**
   * Sets whether to assume RBF is always possible, regardless of signaling.
   * @param {boolean} value - Whether to assume RBF is always possible
   */
  set assumeRBF(value: boolean) {
    this._assumeRBF = value;
    if (value && !this.isRBFSignaled()) {
      console.warn(
        "Assuming full RBF is possible, but transaction does not signal RBF. " +
          "This may cause issues with some nodes or services and could lead to " +
          "delayed or failed transaction replacement.",
      );
    }
  }

  /**
   * Checks if RBF (Replace-By-Fee) can be performed on this transaction.
   *
   * RBF allows unconfirmed transactions to be replaced with a new version
   * that pays a higher fee. There are two types of RBF:
   *
   * 1. Signaled RBF (BIP125): At least one input has a sequence number < 0xfffffffe.
   * 2. Full RBF: Replacing any unconfirmed transaction, regardless of signaling.
   *
   * While BIP125 defines the standard for signaled RBF, some nodes and miners
   * may accept full RBF, allowing replacement of any unconfirmed transaction.
   *
   * CAUTION: Assuming full RBF when a transaction doesn't signal it may lead to:
   * - Rejected replacements by nodes not accepting full RBF
   * - Delayed or failed transaction replacement
   * - Potential double-spend risks if recipients accept unconfirmed transactions
   *
   * @see https://github.com/bitcoin/bips/blob/master/bip-0125.mediawiki
   * @see https://bitcoinops.org/en/topics/replace-by-fee/
   *
   * @returns {boolean} True if RBF can be performed (signaled or assumed), false otherwise
   *
   */
  get canRBF(): boolean {
    const signaled = this.isRBFSignaled();
    if (this._assumeRBF && !signaled) {
      console.warn(
        "Assuming RBF is possible, but transaction does not signal RBF. This may cause issues with some nodes or services.",
      );
    }
    return signaled || this._assumeRBF;
  }

  /**
   * Check if Child-Pays-for-Parent (CPFP) is possible for the transaction.
   * @returns {boolean} True if CPFP is possible, false otherwise.
   */
  get canCPFP(): boolean {
    if (!this._canCPFP) {
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
  get availableUTXOs(): UTXO[] {
    return this._availableUtxos;
  }

  /**
   * Gets the current target fee rate in satoshis per vbyte.
   * @returns {number} The target fee rate in satoshis per vbyte.
   */
  get targetFeeRate(): number {
    return this._targetFeeRate;
  }

  /**
   * Get the estimated fee rate for Replace-by-Fee (RBF).
   * @returns {string} The estimated RBF fee rate in satoshis per vbyte.
   * @see https://bitcoinops.org/en/topics/replace-by-fee/
   */
  get rbfFeeRate(): string {
    if (!this._rbfFeeRate) {
      const currentFeeRate = new BigNumber(this.feeRate);
      const minReplacementFeeRate = BigNumber.max(
        new BigNumber(currentFeeRate).plus(this._incrementalRelayFee),
        new BigNumber(this.targetFeeRate),
      );

      this._rbfFeeRate = minReplacementFeeRate;
    }
    return this._rbfFeeRate.toString();
  }

  /**
   * Calculates and returns the fee rate required for a successful CPFP.
   * @returns {string} The CPFP fee rate in satoshis per vbyte
   */
  get cpfpFeeRate(): string {
    if (!this._cpfpFeeRate) {
      const config = {
        addressType: this._addressType,
        numInputs: 1, // Assuming 1 input for the child transaction
        numOutputs: 1, // Assuming 1 output for the child transaction
        m: this._requiredSigners,
        n: this._totalSigners,
      };

      const childVsize = estimateTransactionVsize(config);
      const packageSize = this.vsize + childVsize;
      const desiredPackageFee = new BigNumber(this.targetFeeRate).multipliedBy(
        packageSize,
      );
      const expectedFeeRate = BigNumber.max(
        desiredPackageFee.minus(this.fee).dividedBy(childVsize),
        new BigNumber(0),
      );

      this._cpfpFeeRate = expectedFeeRate;
    }
    return this._cpfpFeeRate.toString();
  }

  /**
   * Estimates the fee required for a successful RBF (Replace-By-Fee) operation.
   * @returns {string} The estimated RBF fee in satoshis
   */
  get estimateRBFFee(): Satoshis {
    const currentFee = this.fee;
    const vsize = this.vsize;

    const minReplacementFee = BigNumber.max(
      new BigNumber(currentFee).plus(
        this._incrementalRelayFee.multipliedBy(vsize),
      ),
      new BigNumber(this.rbfFeeRate).multipliedBy(vsize),
    );

    return BigNumber.max(
      minReplacementFee.minus(currentFee),
      new BigNumber(1),
    ).toNumber();
  }

  /**
   * Estimates the fee required for a successful CPFP (Child-Pays-For-Parent) operation.
   * @returns {string} The estimated CPFP fee in satoshis
   */
  get estimateCPFPFee(): Satoshis {
    const config = {
      addressType: this._addressType,
      numInputs: 1, // Assuming 1 input for the child transaction
      numOutputs: 1, // Assuming 1 output for the child transaction
      m: this._requiredSigners,
      n: this._totalSigners,
    };
    const childVsize = estimateTransactionVsize(config);
    const packageSize = this.vsize + childVsize;
    return new BigNumber(this.cpfpFeeRate).multipliedBy(packageSize).toNumber();
  }

  /**
   * Gets the dust threshold used for analysis.
   * @returns {string} The dust threshold in satoshis
   */
  get getDustThreshold(): string {
    return this._dustThreshold.toString();
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
    estimatedRBFFee: Satoshis;
    estimatedCPFPFee: Satoshis;
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
      estimatedRBFFee: this.estimateRBFFee,
      estimatedCPFPFee: this.estimateCPFPFee,
    };
  }

  /**
   * Creates input templates from the transaction's inputs.
   *
   * This method maps each input of the analyzed transaction to a BtcTxInputTemplate.
   * It extracts the transaction ID (txid) and output index (vout) from each input
   * to create the templates. Note that the amount in satoshis is not included, as
   * this information is not available in the raw transaction data.
   *
   * @returns {BtcTxInputTemplate[]} An array of BtcTxInputTemplate objects representing
   *          the inputs of the analyzed transaction. These templates will not have
   *          amounts set and will need to be populated later with data from an external
   *          source (e.g., bitcoind wallet, blockchain explorer, or local UTXO set).
   */
  public getInputTemplates(): BtcTxInputTemplate[] {
    return this.inputs.map((input) => {
      return new BtcTxInputTemplate({
        txid: input.txid,
        vout: input.vout,
      });
    });
  }

  /**
   * Creates output templates from the transaction's outputs.
   *
   * This method maps each output of the analyzed transaction to a BtcTxOutputTemplate.
   * It extracts the recipient address, determines whether it's a change output or not,
   * and includes the amount in satoshis. The output type is set to "change" if the
   * output is spendable (typically indicating a change output), and "destination" otherwise.
   *
   * @returns {BtcTxOutputTemplate[]} An array of BtcTxOutputTemplate objects representing
   *          the outputs of the analyzed transaction.
   */
  public getOutputTemplates(): BtcTxOutputTemplate[] {
    return this.outputs.map((output, index) => {
      return new BtcTxOutputTemplate({
        address: output.address,
        type:
          index === this._changeOutputIndex
            ? TxOutputType.CHANGE
            : TxOutputType.DESTINATION,
        amountSats: output.value as Satoshis,
      });
    });
  }
  /**
   * Retrieves the change output of the transaction, if it exists.
   * @returns {TransactionOutput | null} The change output or null if no change output exists
   */
  public getChangeOutput(): TransactionOutput | null {
    if (this._changeOutputIndex !== undefined) {
      return this.outputs[this._changeOutputIndex];
    }
    return null;
  }

  // Protected methods

  /**
   * Deserializes and formats the transaction inputs.
   * @returns {TransactionInput[]} An array of formatted transaction inputs
   * @protected
   */
  protected deserializeInputs(): TransactionInput[] {
    return this._originalTx.ins.map((input) => ({
      txid: input.hash.reverse().toString("hex"),
      vout: input.index,
      sequence: input.sequence,
      scriptSig: input.script.toString("hex"),
      witness: input.witness.map((w) => w.toString("hex")),
    }));
  }

  /**
   * Deserializes and formats the transaction outputs.
   * @returns {TransactionOutput[]} An array of formatted transaction outputs
   * @protected
   */
  protected deserializeOutputs(): TransactionOutput[] {
    return this._originalTx.outs.map((output, index) => ({
      value: output.value,
      scriptPubKey: output.script.toString("hex"),
      address: getOutputAddress(output.script, this._network),
      isSpendable: index === this._changeOutputIndex,
    }));
  }

  /**
   * Checks if the transaction signals RBF (Replace-By-Fee).
   * @returns {boolean} True if the transaction signals RBF, false otherwise
   * @protected
   */
  protected isRBFSignaled(): boolean {
    if (!this._canRBF) {
      this._canRBF = this._originalTx.ins.some(
        (input) => input.sequence < 0xfffffffe,
      );
    }
    return this._canRBF;
  }

  /**
   * Determines if CPFP (Child-Pays-For-Parent) can be performed on this transaction.
   * @returns {boolean} True if CPFP can be performed, false otherwise
   * @protected
   */
  protected canPerformCPFP(): boolean {
    return this.outputs.some(
      (output) =>
        !output.isSpendable &&
        new BigNumber(output.value).isGreaterThan(this._dustThreshold),
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

    const rbfFee = this.estimateRBFFee;
    const cpfpFee = this.estimateCPFPFee;

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
    if (this._originalTx.ins.length === 0) {
      throw new Error("Transaction has no inputs");
    }
    if (this._originalTx.outs.length === 0) {
      throw new Error("Transaction has no outputs");
    }
  }
}
