import { Transaction } from "bitcoinjs-lib-v6";
import { Network } from "@caravan/bitcoin";
import {
  UTXO,
  AnalyzerOptions,
  FeeBumpStrategy,
  Satoshis,
  ScriptType,
  SCRIPT_TYPES,
  FeeRateSatsPerVByte,
} from "./types";
import {
  BtcTxComponent,
  BtcTxInputTemplate,
  BtcTxOutputTemplate,
} from "./btcTransactionComponents";
import { getOutputAddress, estimateTransactionVsize } from "./utils";
import BigNumber from "bignumber.js";

// added type for validation of Analyzer Options
interface ValidatedAnalyzerOptions {
  rawTx: Transaction;
  network: Network;
  targetFeeRate: FeeRateSatsPerVByte;
  absoluteFee: BigNumber;
  availableUtxos: UTXO[];
  changeOutputIndex: number | undefined;
  incrementalRelayFeeRate: BigNumber;
  requiredSigners: number;
  totalSigners: number;
  addressType: ScriptType;
}

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
 * const analyzer = new TransactionAnalyzer({txHex,...other-options});
 * const analysis = analyzer.analyze();
 *
 * @class
 */
export class TransactionAnalyzer {
  private readonly _rawTx: Transaction;
  private readonly _network: Network;
  private readonly _targetFeeRate: number;
  private readonly _absoluteFee: BigNumber;
  private readonly _availableUtxos: UTXO[];
  private readonly _changeOutputIndex: number | undefined;
  private readonly _incrementalRelayFeeRate: BigNumber;
  private readonly _requiredSigners: number;
  private readonly _totalSigners: number;
  private readonly _addressType: ScriptType;

  private _inputs: BtcTxInputTemplate[] | null = null;
  private _outputs: BtcTxOutputTemplate[] | null = null;
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
    const validatedOptions = TransactionAnalyzer.validateOptions(options);

    this._rawTx = validatedOptions.rawTx;
    this._network = validatedOptions.network;
    this._targetFeeRate = validatedOptions.targetFeeRate;
    this._absoluteFee = validatedOptions.absoluteFee;
    this._availableUtxos = validatedOptions.availableUtxos;

    // TO DO (MRIGESH)
    // Make this and accelerate RBF fn work with an array of change indices
    this._changeOutputIndex = validatedOptions.changeOutputIndex;
    this._incrementalRelayFeeRate = validatedOptions.incrementalRelayFeeRate;
    this._requiredSigners = validatedOptions.requiredSigners;
    this._totalSigners = validatedOptions.totalSigners;
    this._addressType = validatedOptions.addressType;
  }

  /**
   * Gets the transaction ID (txid) of the analyzed transaction.
   * @returns {string} The transaction ID
   */
  get txid(): string {
    return this._rawTx.getId();
  }

  /**
   * Gets the virtual size (vsize) of the transaction in virtual bytes.
   * Note: This uses bitcoinjs-lib's implementation which applies Math.ceil()
   * for segwit transactions, potentially slightly overestimating the vsize.
   * This is generally acceptable, especially for fee bumping scenarios.
   * @returns {number} The virtual size of the transaction
   */
  get vsize(): number {
    return this._rawTx.virtualSize();
  }

  /**
   * Gets the weight of the transaction in weight units.
   * @returns {number} The weight of the transaction
   */
  get weight(): number {
    return this._rawTx.weight();
  }

  /**
   * Gets the deserialized inputs of the transaction.
   * @returns {BtcTxInputTemplate[]} An array of transaction inputs
   */
  get inputs(): BtcTxInputTemplate[] {
    return this.deserializeInputs();
  }

  /**
   * Gets the deserialized outputs of the transaction.
   * @returns {BtcTxOutputTemplate[]} An array of transaction outputs
   */
  get outputs(): BtcTxOutputTemplate[] {
    return this.deserializeOutputs();
  }

  /**
   * Calculates and returns the fee of the transaction in satoshis.
   * @returns {Satoshis} The transaction fee in satoshis
   */
  get fee(): Satoshis {
    return this._absoluteFee.toString();
  }

  /**
   * Calculates and returns the fee rate of the transaction in satoshis per vbyte.
   * @returns {FeeRateSatsPerVByte} The transaction fee rate in satoshis per vbyte
   */
  get feeRate(): FeeRateSatsPerVByte {
    return this._absoluteFee.dividedBy(this.vsize).toNumber();
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
   * This method determines if RBF is possible based on three criteria:
   * 1. The transaction signals RBF (or full RBF is assumed).
   * 2. The wallet controls at least one input of the transaction.
   * 3. The necessary input is available in the wallet's UTXO set.
   *
   * It uses the transaction's input templates and compares them against the available UTXOs
   * to ensure that the wallet has control over at least one input, which is necessary for RBF.
   *
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

    // Check if RBF is signaled or assumed
    if (!(signaled || this._assumeRBF)) {
      return false;
    }

    // Get input templates from the transaction
    const inputTemplates = this.getInputTemplates();

    // Check if any of the transaction's inputs are in the available UTXOs
    const hasControlledInput = this._availableUtxos.some((utxo) =>
      inputTemplates.some(
        (template) =>
          template.txid === utxo.txid && template.vout === utxo.vout,
      ),
    );

    // RBF is only possible if the wallet controls at least one input
    return hasControlledInput;
  }

  /**
   * Check if Child-Pays-for-Parent (CPFP) is possible for the transaction.
   * @returns {boolean} True if CPFP is possible, false otherwise.
   */
  get canCPFP(): boolean {
    return this.canPerformCPFP();
  }

  /**
   * Recommends the optimal fee bumping strategy based on the current transaction state.
   * @returns {FeeBumpStrategy} The recommended fee bumping strategy
   */
  get recommendedStrategy(): FeeBumpStrategy {
    return this.recommendStrategy();
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
   * @returns {FeeRateSatsPerVByte } The target fee rate in satoshis per vbyte.
   */
  get targetFeeRate(): FeeRateSatsPerVByte {
    return this._targetFeeRate;
  }

  /**
   * Get the estimated fee rate for Replace-by-Fee (RBF).
   * @returns {string} The estimated RBF fee rate in satoshis per vbyte.
   * @see https://bitcoinops.org/en/topics/replace-by-fee/
   */
  get rbfFeeRate(): string {
    return new BigNumber(this.minimumRBFFee).dividedBy(this.vsize).toString();
  }

  /**
   * Calculates and returns the fee rate required for a successful CPFP.
   * @returns {string} The CPFP fee rate in satoshis per vbyte
   */
  get cpfpFeeRate(): string {
    const desiredPackageFee = new BigNumber(this.targetFeeRate).multipliedBy(
      this.CPFPPackageSize,
    );
    const expectedFeeRate = BigNumber.max(
      desiredPackageFee.minus(this.fee).dividedBy(this.estimatedCPFPChildSize),
      new BigNumber(0),
    );

    return expectedFeeRate.toString();
  }

  /**
   * Calculates the minimum total fee required for a valid RBF (Replace-By-Fee) replacement transaction.
   *
   * This method determines the minimum fee needed to replace the current transaction
   * using the RBF protocol, as defined in BIP 125. It considers three key factors:
   * 1. The current transaction fee
   * 2. The minimum required fee increase (incremental relay fee * transaction size)
   * 3. The user-specified target fee rate
   *
   * The calculation ensures that the new transaction meets both:
   * a) The minimum fee increase required by the RBF rules
   * b) The user's desired fee rate (which may be higher than the minimum required)
   *
   * This approach allows for fee bumping even if the user-specified target fee rate
   * is lower than what's needed to unstick the transaction.
   *
   * References:
   * - BIP 125 (RBF): https://github.com/bitcoin/bips/blob/master/bip-0125.mediawiki
   * - Bitcoin Core RBF implementation:
   *   https://github.com/bitcoin/bitcoin/blob/master/src/policy/rbf.cpp
   *
   * @returns {Satoshis} The minimum total fee required for the replacement transaction in satoshis.
   *                     This is always at least the current fee plus the minimum required increase,
   *                     but may be higher if the user-specified target fee rate demands it.
   */
  get minimumRBFFee(): Satoshis {
    // Calculate the minimum fee increase required by RBF rules
    const minReplacementFee = new BigNumber(this.feeRate)
      .plus(this._incrementalRelayFeeRate)
      .multipliedBy(this.vsize);

    // Calculate the fee based on the user-specified target fee rate
    const targetFeeBasedOnUserRate = new BigNumber(
      this.targetFeeRate,
    ).multipliedBy(this.vsize);

    // Return the maximum of the two calculations
    // This ensures we meet both RBF rules and user's desired fee rate
    return BigNumber.max(minReplacementFee, targetFeeBasedOnUserRate)
      .integerValue(BigNumber.ROUND_CEIL)
      .toString();
  }

  /**
   * Calculates the minimum total fee required for a successful CPFP (Child-Pays-For-Parent) operation.
   *
   * This method calculates the  fee needed for a child transaction to boost the
   * fee rate of the current (parent) transaction using the CPFP technique. It considers:
   * 1. The current transaction's size and fee
   * 2. An estimated size for a simple child transaction (1 input, 1 output)
   * 3. The target fee rate for the combined package (parent + child)
   *
   * The calculation aims to determine how much additional fee the child transaction
   * needs to contribute to bring the overall package fee rate up to the target.
   *
   * Assumptions:
   * - The child transaction will have 1 input (spending an output from this transaction)
   * - The child transaction will have 1 output (change back to the user's wallet)
   * - The multisig configuration (m-of-n) is the same as the parent transaction
   *
   * References:
   * - Bitcoin Core CPFP implementation:
   *   https://github.com/bitcoin/bitcoin/blob/master/src/policy/fees.cpp
   * - CPFP overview: https://bitcoinops.org/en/topics/cpfp/
   * - Package relay for CPFP: https://github.com/bitcoin/bips/blob/master/bip-0125.mediawiki#implementation-notes
   *
   * @returns {Satoshis} The estimated additional CPFP fee in satoshis.
   *                     This value represents how much extra fee the child transaction
   *                     should include above its own minimum required fee.
   *                     A positive value indicates the amount of additional fee required.
   *                     A zero or negative value (rare) could indicate that the current
   *                     transaction's fee is already sufficient for the desired rate.
   */
  get minimumCPFPFee(): Satoshis {
    return new BigNumber(this.cpfpFeeRate)
      .multipliedBy(this.CPFPPackageSize)
      .toString();
  }

  /**
   * Estimates the virtual size of a potential CPFP child transaction.
   * @returns {number} The estimated vsize of the child transaction in vbytes
   */
  get estimatedCPFPChildSize(): number {
    const config = {
      addressType: this._addressType,
      numInputs: 1, // Assuming 1 input for the child transaction
      numOutputs: 1, // Assuming 1 output for the child transaction
      m: this._requiredSigners,
      n: this._totalSigners,
    };
    return estimateTransactionVsize(config);
  }

  /**
   * Calculates the total package size for a potential CPFP transaction.
   * This includes the size of the current (parent) transaction and the estimated size of the child transaction.
   * @returns {number} The total package size in vbytes
   */
  get CPFPPackageSize(): number {
    return this.vsize + this.estimatedCPFPChildSize;
  }

  /**
   * Performs a comprehensive analysis of the transaction.
   * @returns {Object} An object containing detailed transaction analysis
   */
  public analyze(): {
    txid: string;
    vsize: number;
    weight: number;
    fee: Satoshis;
    feeRate: FeeRateSatsPerVByte;
    inputs: BtcTxInputTemplate[];
    outputs: BtcTxOutputTemplate[];
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
      estimatedRBFFee: this.minimumRBFFee,
      estimatedCPFPFee: this.minimumCPFPFee,
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
        locked: index !== this._changeOutputIndex,
        amountSats: output.amountSats,
      });
    });
  }
  /**
   * Retrieves the change output of the transaction, if it exists.
   * @returns {BtcTxComponent | null} The change output or null if no change output exists
   */
  public getChangeOutput(): BtcTxComponent | null {
    if (this._changeOutputIndex !== undefined) {
      return this.outputs[this._changeOutputIndex];
    }
    return null;
  }

  // Protected methods

  /**
   * Deserializes and formats the transaction inputs.
   *
   * This method processes the raw input data from the original transaction
   * and converts it into a more easily manageable format. It performs the
   * following operations for each input:
   *
   * 1. Reverses the transaction ID (txid) from little-endian to big-endian format.
   * 2. Extracts the output index (vout) being spent.
   * 3. Captures the sequence number, which is used for RBF signaling.
   *
   * @returns {BtcTxInputTemplate[]}
   *
   * @protected
   */
  protected deserializeInputs(): BtcTxInputTemplate[] {
    return this._rawTx.ins.map((input) => {
      const template = new BtcTxInputTemplate({
        txid: input.hash.reverse().toString("hex"), // reversed (big-endian) format
        vout: input.index,
        amountSats: "0", // We don't have this information from the raw transaction
      });

      // Set sequence
      template.setSequence(input.sequence);
      return template;
    });
  }

  /**
   * Deserializes and formats the transaction outputs.
   *
   * This method processes the raw output data from the original transaction
   * and converts it into a more easily manageable format. It performs the
   * following operations for each output:
   *
   * 1. Extracts the output value in satoshis.
   * 2. Derives the recipient address from the scriptPubKey.
   * 3. Determines if the output is spendable (i.e., if it's a change output).
   *
   * @returns {BtcTxOutputTemplate[]}
   *
   * @protected
   */
  protected deserializeOutputs(): BtcTxOutputTemplate[] {
    return this._rawTx.outs.map((output, index) => {
      return new BtcTxOutputTemplate({
        amountSats: output.value.toString(),
        address: getOutputAddress(output.script, this._network),
        locked: index !== this._changeOutputIndex,
      });
    });
  }

  /**
   * Checks if the transaction signals RBF (Replace-By-Fee).
   * @returns {boolean} True if the transaction signals RBF, false otherwise
   * @protected
   */
  protected isRBFSignaled(): boolean {
    if (!this._canRBF) {
      this._canRBF = this._rawTx.ins.some(
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
    return this.outputs.some((output) => output.isMalleable);
  }

  /**
   * Recommends the optimal fee bumping strategy based on the current transaction state.
   * @returns {FeeBumpStrategy} The recommended fee bumping strategy
   * @protected
   */
  protected recommendStrategy(): FeeBumpStrategy {
    // TO DO (MRIGESH):
    // Assuming a tx is non-RBF , but depends on Full-RBF and has lower fees than CPFP then we need to think of mechanism to distinguish a better strategy between the two or maybe warn the user

    if (
      new BigNumber(this.feeRate).isGreaterThanOrEqualTo(this.targetFeeRate)
    ) {
      return FeeBumpStrategy.NONE;
    }

    const rbfFee = this.minimumRBFFee;
    const cpfpFee = this.minimumCPFPFee;

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

  private static validateOptions(
    options: AnalyzerOptions,
  ): ValidatedAnalyzerOptions {
    const validatedOptions: Partial<ValidatedAnalyzerOptions> = {};

    // Raw transaction validation
    try {
      const tx = Transaction.fromHex(options.txHex);
      if (tx.outs.length === 0) {
        throw new Error("Transaction has no outputs");
      }
    } catch (error) {
      throw new Error(
        `Invalid transaction: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    validatedOptions.rawTx = Transaction.fromHex(options.txHex);
    // Network validation
    if (!Object.values(Network).includes(options.network)) {
      throw new Error(`Invalid network: ${options.network}`);
    }
    validatedOptions.network = options.network;

    // Target fee rate validation
    if (
      typeof options.targetFeeRate !== "number" ||
      options.targetFeeRate <= 0
    ) {
      throw new Error(`Invalid target fee rate: ${options.targetFeeRate}`);
    }
    validatedOptions.targetFeeRate = options.targetFeeRate;

    // Absolute fee validation
    const absoluteFee = new BigNumber(options.absoluteFee);
    if (absoluteFee.isLessThanOrEqualTo(0)) {
      throw new Error(`Invalid absolute fee: ${options.absoluteFee}`);
    }
    validatedOptions.absoluteFee = absoluteFee;

    // Available UTXOs validation
    if (!Array.isArray(options.availableUtxos)) {
      throw new Error("Available UTXOs must be an array");
    }
    validatedOptions.availableUtxos = options.availableUtxos;

    //If Change output is given then it's validation
    if (options.changeOutputIndex)
      if (
        options.changeOutputIndex !== undefined &&
        (typeof options.changeOutputIndex !== "number" ||
          options.changeOutputIndex < 0)
      ) {
        throw new Error(
          `Invalid change output index: ${options.changeOutputIndex}`,
        );
      }
    validatedOptions.changeOutputIndex = options.changeOutputIndex;

    //If Incremental relay fee is given then it's validation
    const incrementalRelayFee = new BigNumber(
      options.incrementalRelayFeeRate || 1,
    );
    if (incrementalRelayFee.isLessThanOrEqualTo(0)) {
      throw new Error(
        `Invalid incremental relay fee: ${options.incrementalRelayFeeRate}`,
      );
    }
    validatedOptions.incrementalRelayFeeRate = incrementalRelayFee;

    // Required and total signers validation
    if (
      typeof options.requiredSigners !== "number" ||
      options.requiredSigners <= 0
    ) {
      throw new Error(`Invalid required signers: ${options.requiredSigners}`);
    }
    if (typeof options.totalSigners !== "number" || options.totalSigners <= 0) {
      throw new Error(`Invalid total signers: ${options.totalSigners}`);
    }
    if (options.requiredSigners > options.totalSigners) {
      throw new Error(
        `Required signers (${options.requiredSigners}) cannot be greater than total signers (${options.totalSigners})`,
      );
    }
    validatedOptions.requiredSigners = options.requiredSigners;
    validatedOptions.totalSigners = options.totalSigners;

    // Address type validation
    if (!Object.values(SCRIPT_TYPES).includes(options.addressType)) {
      throw new Error(`Invalid address type: ${options.addressType}`);
    }
    validatedOptions.addressType = options.addressType;

    return validatedOptions as ValidatedAnalyzerOptions;
  }
}
