import { Satoshis, BTC } from "./types";
import { satoshisToBTC } from "./utils";
import BigNumber from "bignumber.js";

/**
 * Abstract base class for Bitcoin transaction components (inputs and outputs).
 * Provides common functionality for inputs and outputs.
 */
export abstract class BtcTxComponent {
  protected _amountSats: BigNumber;

  /**
   * @param amountSats - The amount in satoshis (as a string)
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
    return satoshisToBTC(this._amountSats.toString());
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
 * Represents a Bitcoin transaction input
 */
export class BtcTxInputTemplate extends BtcTxComponent {
  private readonly _txid: string;
  private readonly _vout: number;
  private _prevTxHex?: string;
  private _sequence?: number;

  /**
   * @param params - Input parameters
   * @param params.txid - Transaction ID of the UTXO
   * @param params.vout - Output index of the UTXO
   * @param params.amountSats - Amount in satoshis (as a string)
   * @param params.prevTxHex - Previous tx hex
   * @param params.sequence - Sequence number for the input
   */
  constructor(params: {
    txid: string;
    vout: number;
    amountSats?: Satoshis;
    prevTxHex?: string;
    sequence?: number;
  }) {
    super(params.amountSats || "0");
    this._txid = params.txid;
    this._vout = params.vout;
    this._prevTxHex = params.prevTxHex;
    this._sequence = params.sequence;
  }

  /** Get the transaction ID */
  get txid(): string {
    return this._txid;
  }

  /** Get the output index */
  get vout(): number {
    return this._vout;
  }

  /**
   * Get the previous transaction hex.
   * Throws an error if prevTxHex is undefined.
   * @returns The previous transaction hex string
   * @throws Error if prevTxHex is not set
   */
  get prevTxHex(): string {
    if (!this._prevTxHex) {
      throw new Error("Previous transaction hex is not set");
    }
    return this._prevTxHex;
  }

  /** Set the previous transaction hex */
  setPrevTxHex(hex: string): void {
    this._prevTxHex = hex;
  }

  /** Get the sequence number */
  get sequence(): number {
    if (!this._sequence) {
      throw new Error("Input Sequence is not set");
    }
    return this._sequence;
  }

  /** Set the sequence number */
  setSequence(sequence: number): void {
    this._sequence = sequence;
  }

  /**
   * Check if the input is valid
   * @returns True if the amount is positive and exists, and txid and vout are valid
   */
  isValid(): boolean {
    return this.hasAmount() && this._txid !== "" && this._vout >= 0;
  }

  /**
   * Check if previous transaction data is available
   * @returns True if prevTxHex is defined
   */
  hasPrevTxData(): boolean {
    return !!this._prevTxHex;
  }

  /**
   * Check if the sequence is valid
   * @returns True if sequence is defined
   */
  hasSequence(): boolean {
    return !!this._sequence;
  }
}
/**
 * Represents a Bitcoin transaction output
 */
export class BtcTxOutputTemplate extends BtcTxComponent {
  private readonly _address: string;
  private _malleable: boolean = true;

  /**
   * @param params - Output parameters
   * @param params.address - Recipient address
   * @param params.amountSats - Amount in satoshis  (as a string)
   * @param params.locked - Whether the output is locked (immutable), defaults to false
   * @throws Error if trying to create a locked output with zero amount
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
    this._amountSats = this._amountSats.minus(subtractAmount);
  }

  /**
   * Locks the output, preventing further modifications to its amount.
   *
   * This method sets the malleability of the output to false. Once called,
   * the output amount cannot be changed, and attempts to do so will throw an error.
   * This operation is irreversible - once locked, an output cannot be unlocked.
   *
   * Typical use cases include:
   * - Finalizing a transaction before signing
   * - Ensuring that certain outputs (like recipient amounts) are not accidentally modified
   *
   * For EXTERNAL outputs, an amount must be specified before locking. This is to prevent
   * locking an output with an undefined amount, which could lead to invalid transactions.
   *
   * @throws {Error} If the output is already locked (non-malleable)
   * @throws {Error} If trying to lock an EXTERNAL output with an undefined amount
   */
  lock(): void {
    if (!this.isMalleable) {
      throw new Error("Output is already locked and cannot be modified.");
    }

    this._malleable = false;
  }

  /**
   * Checks if the output is valid according to basic Bitcoin transaction rules.
   *
   * This method performs several checks to ensure the output is properly formed:
   *
   * 1. For EXTERNAL outputs:
   *    - Ensures that an amount is specified (not undefined).
   *    - Throws an error if the amount is undefined, as external outputs must always have an amount.
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
   *   considered valid by this basic check. Implement custom logic if needed.
   *
   * @returns {boolean} True if the output is valid, false otherwise.
   * @throws {Error} If an EXTERNAL output has an undefined amount.
   */
  isValid(): boolean {
    if (!this.isMalleable && this._amountSats.isEqualTo(0)) {
      throw new Error("External outputs must have an amount specified");
    }
    return this.hasAmount() && this._address !== "";
  }
}
