import { PsbtV2 } from "@caravan/psbt";
import BigNumber from "bignumber.js";
import { Network } from "@caravan/bitcoin";
import {
  UTXO,
  FeeRateSatsPerVByte,
  TransactionAnalyzerOptions,
  FeeBumpStrategy,
} from "./types";
import { DEFAULT_DUST_THRESHOLD } from "./constants";

/**
 * TransactionAnalyzer Class
 *
 * This class provides comprehensive analysis of Bitcoin transactions,
 * including the possibility of fee bumping through RBF (Replace-By-Fee)
 * or CPFP (Child-Pays-For-Parent) methods.
 *
 * Features:
 * - Analyzes transactions for RBF and CPFP possibilities
 * - Dynamically updates analysis when new UTXOs are added
 * - Calculates potential fee increases and their impacts
 * - Provides detailed insights into transaction structure and fee rates
 * - Recommends the best fee bumping strategy based on current conditions
 *
 * Usage:
 * const analyzer = new TransactionAnalyzer(options);
 * console.log(analyzer.canRBF);
 * analyzer.addUtxos([newUtxo1, newUtxo2]);
 * console.log(analyzer.canCPFP);
 * console.log(analyzer.getPotentialFeeIncrease());
 * console.log(analyzer.recommendFeeBumpStrategy());
 */
export class TransactionAnalyzer {
  private readonly _psbt: PsbtV2;
  private readonly _network: Network;
  private readonly _dustThreshold: BigNumber;
  private readonly requiredSigners: number;
  private readonly totalSigners: number;
  private _targetFeeRate: FeeRateSatsPerVByte;
  private _additionalUtxos: UTXO[];
  private _spendableOutputs: { index: number; amount: BigNumber }[];
  private _changeOutputs: { index: number; amount: BigNumber }[];

  private _canRBF: boolean | null = null;
  private _canCPFP: boolean | null = null;
  private _potentialFeeIncrease: BigNumber | null = null;

  constructor(options: TransactionAnalyzerOptions) {
    this._psbt = this.initializePsbt(options.psbt);
    this._network = options.network;
    this._dustThreshold = new BigNumber(
      options.dustThreshold || DEFAULT_DUST_THRESHOLD,
    );
    this._targetFeeRate = options.targetFeeRate;
    this._additionalUtxos = options.additionalUtxos || [];
    this._spendableOutputs = options.spendableOutputs;
    this._changeOutputs = options.changeOutputs;
    this.requiredSigners = options.requiredSigners;
    this.totalSigners = options.totalSigners;

    this.analyze();
  }

  private initializePsbt(psbt: PsbtV2 | string | Buffer): PsbtV2 {
    if (psbt instanceof PsbtV2) return psbt;
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

  // Getters

  get psbt(): PsbtV2 {
    return this._psbt;
  }

  get network(): Network {
    return this._network;
  }

  get dustThreshold(): BigNumber {
    return this._dustThreshold;
  }

  get targetFeeRate(): FeeRateSatsPerVByte {
    return this._targetFeeRate;
  }

  get additionalUtxos(): UTXO[] {
    return [...this._additionalUtxos];
  }

  get spendableOutputs(): { index: number; amount: BigNumber }[] {
    return [...this._spendableOutputs];
  }

  get changeOutputs(): { index: number; amount: BigNumber }[] {
    return [...this._changeOutputs];
  }

  get canRBF(): boolean {
    return this._canRBF !== null ? this._canRBF : this.analyzeRBFPossibility();
  }

  get canCPFP(): boolean {
    return this._canCPFP !== null
      ? this._canCPFP
      : this.analyzeCPFPPossibility();
  }

  get currentFeeRate(): FeeRateSatsPerVByte {
    const txFee = this.calculateTxFee();
    const vsize = this.estimateVsize();
    return Number(txFee.dividedBy(vsize).toFixed(2));
  }

  get totalInputValue(): BigNumber {
    return this._psbt.PSBT_IN_WITNESS_UTXO.reduce(
      (sum, utxo) => sum.plus(utxo ? new BigNumber(utxo.split(",")[0]) : 0),
      new BigNumber(0),
    );
  }

  get totalOutputValue(): BigNumber {
    return this._psbt.PSBT_OUT_AMOUNT.reduce(
      (sum, amount) => sum.plus(new BigNumber(amount.toString())),
      new BigNumber(0),
    );
  }

  // Setters

  set targetFeeRate(rate: FeeRateSatsPerVByte) {
    this._targetFeeRate = rate;
    this.analyze();
  }

  // Public methods

  /**
   * Adds new UTXOs to the analysis and re-runs the analysis
   * @param utxos - Array of new UTXOs to add
   */
  public addUtxos(utxos: UTXO[]): void {
    this._additionalUtxos = [...this._additionalUtxos, ...utxos];
    this.analyze();
  }

  /**
   * Updates the spendable outputs and re-runs the analysis
   * @param outputs - Array of spendable outputs
   */
  public updateSpendableOutputs(
    outputs: { index: number; amount: BigNumber }[],
  ): void {
    this._spendableOutputs = outputs;
    this.analyze();
  }

  /**
   * Updates the change outputs and re-runs the analysis
   * @param outputs - Array of change outputs
   */
  public updateChangeOutputs(
    outputs: { index: number; amount: BigNumber }[],
  ): void {
    this._changeOutputs = outputs;
    this.analyze();
  }

  /**
   * Calculates the potential fee increase based on the target fee rate
   * @returns The potential fee increase in satoshis
   */
  public getPotentialFeeIncrease(): BigNumber {
    if (this._potentialFeeIncrease === null) {
      this._potentialFeeIncrease = this.calculatePotentialFeeIncrease();
    }
    return this._potentialFeeIncrease;
  }

  /**
   * Estimates the cost of performing an RBF transaction
   * @returns The estimated cost in satoshis, or null if RBF is not possible
   */
  public estimateRBFCost(): BigNumber | null {
    if (!this.canRBF) return null;
    return this.getPotentialFeeIncrease();
  }

  /**
   * Estimates the cost of performing a CPFP transaction
   * @returns The estimated cost in satoshis, or null if CPFP is not possible
   */
  public estimateCPFPCost(): BigNumber | null {
    if (!this.canCPFP) return null;
    const childTxSize = this.estimateChildTxSize();
    return new BigNumber(this._targetFeeRate).multipliedBy(childTxSize);
  }

  /**
   * Recommends the best fee bumping strategy based on current conditions
   * @returns The recommended fee bumping strategy
   */
  public recommendFeeBumpStrategy(): FeeBumpStrategy {
    if (!this.canRBF && !this.canCPFP) {
      return FeeBumpStrategy.NONE;
    }

    if (this.canRBF && !this.canCPFP) {
      return FeeBumpStrategy.RBF;
    }

    if (!this.canRBF && this.canCPFP) {
      return FeeBumpStrategy.CPFP;
    }

    const rbfCost = this.estimateRBFCost()!;
    const cpfpCost = this.estimateCPFPCost()!;

    return rbfCost.isLessThan(cpfpCost)
      ? FeeBumpStrategy.RBF
      : FeeBumpStrategy.CPFP;
  }

  private analyze(): void {
    this._canRBF = this.analyzeRBFPossibility();
    this._canCPFP = this.analyzeCPFPPossibility();
    this._potentialFeeIncrease = null; // Reset to be recalculated on next access
  }

  private analyzeRBFPossibility(): boolean {
    if (!this.psbt.isRBFSignaled) return false;
    const availableFunds = this._changeOutputs.reduce(
      (sum, output) => sum.plus(output.amount),
      new BigNumber(0),
    );
    const additionalFunds = this._additionalUtxos.reduce(
      (sum, utxo) => sum.plus(utxo.value),
      new BigNumber(0),
    );
    const requiredIncrease = this.calculateRequiredFeeIncrease();
    return availableFunds
      .plus(additionalFunds)
      .isGreaterThanOrEqualTo(requiredIncrease);
  }

  private analyzeCPFPPossibility(): boolean {
    if (this._spendableOutputs.length === 0) return false;
    const totalSpendableAmount = this._spendableOutputs.reduce(
      (sum, output) => sum.plus(output.amount),
      new BigNumber(0),
    );
    const childTxSize = this.estimateChildTxSize();
    const requiredFee = new BigNumber(this._targetFeeRate).multipliedBy(
      childTxSize,
    );
    return totalSpendableAmount.isGreaterThan(
      requiredFee.plus(this._dustThreshold),
    );
  }

  private calculateRequiredFeeIncrease(): BigNumber {
    const currentFee = this.calculateTxFee();
    const desiredFee = new BigNumber(this._targetFeeRate).multipliedBy(
      this.estimateVsize(),
    );
    return BigNumber.maximum(desiredFee.minus(currentFee), new BigNumber(1));
  }

  private calculateTxFee(): BigNumber {
    return this.totalInputValue.minus(this.totalOutputValue);
  }

  private calculatePotentialFeeIncrease(): BigNumber {
    const currentFee = this.calculateTxFee();
    const potentialFee = new BigNumber(this._targetFeeRate).multipliedBy(
      this.estimateVsize(),
    );
    return BigNumber.maximum(potentialFee.minus(currentFee), new BigNumber(0));
  }

  /**
   * Estimates the virtual size (vsize) of the transaction
   *
   * This method calculates an estimate of the transaction's vsize, which is
   * used for fee calculations. It accounts for different input types (segwit, legacy)
   * and the complexity of the multisig setup.
   *
   * @private
   * @returns {number} Estimated vsize in virtual bytes
   */
  private estimateVsize(): number {
    let totalWeight = 0;

    // Base transaction overhead
    totalWeight += 10 * 4; // version, locktime, input count, output count

    // Calculate weight for inputs
    for (let i = 0; i < this._psbt.PSBT_GLOBAL_INPUT_COUNT; i++) {
      totalWeight += this.estimateInputWeight(i);
    }

    // Calculate weight for outputs
    for (let i = 0; i < this._psbt.PSBT_GLOBAL_OUTPUT_COUNT; i++) {
      totalWeight += this.estimateOutputWeight(i);
    }

    // Convert weight to vsize (rounded up)
    return Math.ceil(totalWeight / 4);
  }

  /**
   * Estimates the weight of a single input
   *
   * This method calculates the weight of an input, taking into account
   * whether it's a segwit or legacy input, and considering the complexity
   * of multisig setups.
   *
   * @private
   * @param {number} inputIndex - The index of the input in the PSBT
   * @returns {number} Estimated weight of the input
   */
  private estimateInputWeight(inputIndex: number): number {
    // Base input weight
    let weight = 41 * 4; // outpoint (36) + sequence (4) + count (1)

    const witnessUtxo = this._psbt.PSBT_IN_WITNESS_UTXO[inputIndex];
    const redeemScript = this._psbt.PSBT_IN_REDEEM_SCRIPT[inputIndex];
    const witnessScript = this._psbt.PSBT_IN_WITNESS_SCRIPT[inputIndex];

    if (witnessUtxo) {
      // Segwit input
      const m = this.requiredSigners;
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
        1 + (73 * this.requiredSigners + 34 * this.totalSigners);
      weight += scriptSigSize * 4;
    }

    return weight;
  }

  /**
   * Estimates the weight of a single output
   *
   * This method calculates the weight of an output based on its script size.
   *
   * @private
   * @param {number} outputIndex - The index of the output in the PSBT
   * @returns {number} Estimated weight of the output
   */
  private estimateOutputWeight(outputIndex: number): number {
    // 8 bytes for value, 1 byte for script length
    let weight = 9 * 4;

    const script = Buffer.from(this._psbt.PSBT_OUT_SCRIPT[outputIndex], "hex");
    weight += script.length * 4;

    return weight;
  }

  /**
   * Estimates the size of a child transaction for CPFP
   *
   * This method calculates an estimate of the size of a potential child
   * transaction that could be used for a CPFP (Child-Pays-for-Parent) operation.
   * It assumes a simple transaction with one input (from the parent) and one output.
   *
   * @private
   * @returns {number} Estimated size of the child transaction in virtual bytes
   */
  private estimateChildTxSize(): number {
    const inputWeight = this.estimateInputWeight(0); // Assuming similar input structure as parent
    const outputWeight = this.estimateOutputWeight(0); // Assuming similar output structure
    const baseWeight = 10 * 4; // version, locktime, input count, output count

    const totalWeight = baseWeight + inputWeight + outputWeight;
    return Math.ceil(totalWeight / 4);
  }
}
