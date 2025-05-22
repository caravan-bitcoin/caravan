import { satoshisToBitcoins } from "@caravan/bitcoin";
import { BigNumber } from "bignumber.js";

import { Satoshis, BTC, UTXO } from "./types";
import { validateNonWitnessUtxo, validateSequence } from "./utils";

/**
 * Abstract base class for Bitcoin transaction components (inputs and outputs).
 * Provides common functionality for inputs and outputs.
 */
export abstract class BtcTxComponent {
  protected _amountSats: BigNumber;

  /**
   * Creates a new transaction component with the specified amount.
   * @param {Satoshis} amountSats - The amount in satoshis (as a string)
   */
  constructor(amountSats: Satoshis) {
    this._amountSats = new BigNumber(amountSats);
  }

  /**
   * Get the amount in satoshis
   * @returns The amount in satoshis (as a string)
   */
  get amountSats(): Satoshis {
    return this._amountSats.toString();
  }

  /**
   * Set  amount in satoshis
   * @param amountSats - New amount in satoshis (as a string)
   */
  set amountSats(value: Satoshis) {
    this._amountSats = new BigNumber(value);
  }

  /**
   * Get the amount in BTC
   * @returns The amount in BTC (as a string)
   */
  get amountBTC(): BTC {
    return satoshisToBitcoins(this._amountSats.toString());
  }

  hasAmount(): boolean {
    return this._amountSats.isGreaterThanOrEqualTo(0);
  }

  /**
   * Check if the component is valid
   * @returns True if valid, false otherwise
   */
  abstract isValid(): boolean;
}

/**
 * Represents a Bitcoin transaction input template for PSBT creation.
 * This class contains the minimal required fields and optional fields
 * necessary for creating a valid PSBT input.
 *
 * @see https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki
 */
export class BtcTxInputTemplate extends BtcTxComponent {
  private readonly _txid: string;
  private readonly _vout: number;
  private _nonWitnessUtxo?: Buffer;
  private _witnessUtxo?: {
    script: Buffer;
    value: number;
  };
  private _sequence?: number;

  /**
   * Creates a new input template for use in a Bitcoin transaction.
   * @param {Object} params - The parameters for creating the input template
   * @param {string} params.txid - The transaction ID of the UTXO being spent (in reversed byte order)
   * @param {number} params.vout - The output index within the transaction being spent
   * @param {Satoshis} [params.amountSats] - The amount in satoshis. Optional since it may come from UTXO data.
   */
  constructor(params: { txid: string; vout: number; amountSats?: Satoshis }) {
    super(params.amountSats || "0");
    this._txid = params.txid;
    this._vout = params.vout;
  }
  /**
   * Creates a BtcTxInputTemplate from a UTXO object.
   */
  static fromUTXO(utxo: UTXO): BtcTxInputTemplate {
    const template = new BtcTxInputTemplate({
      txid: utxo.txid,
      vout: utxo.vout,
      amountSats: utxo.value,
    });

    if (utxo.prevTxHex) {
      template.setNonWitnessUtxo(Buffer.from(utxo.prevTxHex, "hex"));
    }

    if (utxo.witnessUtxo) {
      template.setWitnessUtxo(utxo.witnessUtxo);
    }

    return template;
  }
  /**
   * The transaction ID of the UTXO (reversed, big-endian).
   * Required for all PSBT inputs.
   */
  get txid(): string {
    return this._txid;
  }

  /**
   * The output index in the transaction.
   * Required for all PSBT inputs.
   */
  get vout(): number {
    return this._vout;
  }

  /** Get the sequence number */
  get sequence(): number | undefined {
    return this._sequence;
  }

  /**
   * Sets the sequence number for the input.
   * Optional, but useful for RBF signaling.
   * @param {number} sequence - The sequence number
   */
  setSequence(sequence: number): void {
    if (!validateSequence(sequence)) {
      throw new Error("Invalid sequence number");
    }
    this._sequence = sequence;
  }

  /**
   * Enables Replace-By-Fee (RBF) signaling for this input.
   * Sets the sequence number to 0xfffffffd .
   */
  enableRBF(): void {
    this.setSequence(0xfffffffd);
  }

  /**
   * Disables Replace-By-Fee (RBF) signaling for this input.
   * Sets the sequence number to 0xffffffff.
   */
  disableRBF(): void {
    this.setSequence(0xffffffff);
  }

  /**
   * Checks if RBF is enabled for this input.
   * @returns {boolean} True if RBF is enabled, false otherwise.
   */
  isRBFEnabled(): boolean {
    return this._sequence !== undefined && this._sequence < 0xfffffffe;
  }

  /**
   * Gets the non-witness UTXO.
   */
  get nonWitnessUtxo(): Buffer | undefined {
    return this._nonWitnessUtxo;
  }

  /**
   * Sets the non-witness UTXO.
   * Required for non-segwit inputs in PSBTs.
   * @param {Buffer} value - The full transaction containing the UTXO being spent
   */
  setNonWitnessUtxo(value: Buffer): void {
    if (!validateNonWitnessUtxo(value, this._txid, this._vout)) {
      throw new Error("Invalid non-witness UTXO");
    }
    this._nonWitnessUtxo = value;
  }

  /**
   * Gets the witness UTXO.
   */
  get witnessUtxo(): { script: Buffer; value: number } | undefined {
    return this._witnessUtxo;
  }

  /**
   * Sets the witness UTXO.
   * Required for segwit inputs in PSBTs.
   * @param {Object} value - The witness UTXO
   * @param {Buffer} value.script - The scriptPubKey of the output
   * @param {number} value.value - The value of the output in satoshis
   */
  setWitnessUtxo(value: { script: Buffer; value: number }): void {
    this._witnessUtxo = value;
  }

  /**
   * Check if the input is valid
   * @returns True if the amount is positive and exists, and txid and vout are valid
   */
  isValid(): boolean {
    return this.hasAmount() && this._txid !== "" && this._vout >= 0;
  }

  /**
   * Checks if the input has the required fields for PSBT creation.
   */
  hasRequiredFieldsforPSBT(): boolean {
    return Boolean(
      this._txid &&
        this._vout >= 0 &&
        (this._nonWitnessUtxo || this._witnessUtxo),
    );
  }

  /**
   * Converts the input template to a UTXO object.
   */
  toUTXO(): UTXO {
    return {
      txid: this._txid,
      vout: this._vout,
      value: this._amountSats.toString(),
      prevTxHex: this._nonWitnessUtxo?.toString("hex"),
      witnessUtxo: this._witnessUtxo,
    };
  }
}
/**
 * Represents a Bitcoin transaction output
 */
export class BtcTxOutputTemplate extends BtcTxComponent {
  private readonly _address: string;
  private _malleable: boolean = true;

  /**
   * Creates a new output template for use in a Bitcoin transaction.
   * @param {Object} params - The parameters for the output
   * @param {string} params.address - The Bitcoin address to send funds to
   * @param {Satoshis} [params.amountSats] - The amount to send in satoshis (as a string). Optional for malleable outputs.
   * @param {boolean} [params.locked=false] - Whether the output amount is locked (immutable)
   * @throws {Error} If trying to create a locked output with zero amount
   */
  constructor(params: {
    address: string;
    amountSats?: Satoshis | undefined;
    locked?: boolean;
  }) {
    super(params.amountSats || "0");
    this._address = params.address;
    this._malleable = !params.locked;

    if (!this._malleable && this._amountSats.isEqualTo(0)) {
      throw new Error("Locked outputs must have an amount specified.");
    }
  }

  /** Get the recipient address */
  get address(): string {
    return this._address;
  }

  /** Check if the output is malleable (can be modified) */
  get isMalleable(): boolean {
    return this._malleable;
  }

  /**
   * Set a new amount for the output
   * @param amountSats - New amount in satoshis(as a string)
   * @throws Error if trying to modify a non-malleable output
   */
  setAmount(amountSats: Satoshis): void {
    if (!this._malleable) {
      throw new Error("Cannot modify non-malleable output");
    }
    this._amountSats = new BigNumber(amountSats);
  }

  /**
   * Add amount to the output
   * @param amountSats - Amount to add in satoshis (as a string)
   * @throws Error if trying to modify a non-malleable output
   */
  addAmount(amountSats: Satoshis): void {
    if (!this._malleable) {
      throw new Error("Cannot modify non-malleable output");
    }
    this._amountSats = this._amountSats.plus(new BigNumber(amountSats));
  }

  /**
   * Subtract amount from the output
   * @param amountSats - Amount to subtract in satoshis (as a string)
   * @throws Error if trying to modify a non-malleable output or if subtracting more than the current amount
   */
  subtractAmount(amountSats: Satoshis): void {
    if (!this._malleable) {
      throw new Error("Cannot modify non-malleable output");
    }
    const subtractAmount = new BigNumber(amountSats);
    if (subtractAmount.isGreaterThan(this._amountSats)) {
      throw new Error("Cannot subtract more than the current amount");
    }
    this.setAmount(this._amountSats.minus(subtractAmount).toString());
  }

  /**
   * Locks the output, preventing further modifications to its amount.
   *
   * This method sets the malleability of the output to false. Once called,
   * the output amount cannot be changed. If the output is already locked,
   * this method has no effect.
   *
   * Typical use cases include:
   * - Finalizing a transaction before signing
   * - Ensuring that certain outputs (like recipient amounts) are not accidentally modified
   *
   * An amount must be specified before locking. This is to prevent
   * locking an output with a zero amount, which could lead to invalid transactions.
   *
   * @throws {Error} If trying to lock an output with a zero amount
   */
  lock(): void {
    if (!this.isMalleable) {
      // Output is already locked, so we just return without doing anything
      return;
    }

    if (this._amountSats.isEqualTo(0)) {
      throw new Error("Cannot lock an output with a zero amount.");
    }

    this._malleable = false;
  }

  /**
   * Checks if the output is valid according to basic Bitcoin transaction rules.
   *
   * This method performs several checks to ensure the output is properly formed:
   *
   * 1. For locked outputs:
   *    - Ensures that a non-zero amount is specified.
   *    - Throws an error if the amount is zero, as locked outputs must always have a valid amount.
   *
   * 2. For all output types:
   *    - Checks if the output has a non-zero amount (via hasAmount() method).
   *    - Verifies that the address is not an empty string.
   *
   * Note: This method does not perform exhaustive validation. For more thorough checks,
   * consider implementing a separate, comprehensive validation method.
   *
   * Special considerations:
   * - OP_RETURN outputs might require different validation logic (not implemented here).
   * - Zero-amount outputs for certain special cases (like Ephemeral Anchors) are not
   *   considered valid by this basic check. Implement custom logic if needed for such cases.
   *
   * @returns {boolean} True if the output is valid, false otherwise.
   * @throws {Error} If a locked output has a zero amount.
   */
  isValid(): boolean {
    if (!this.isMalleable && this._amountSats.isEqualTo(0)) {
      throw new Error("Locked outputs must have a non-zero amount specified");
    }
    return this.hasAmount() && this._address !== "";
  }
}
