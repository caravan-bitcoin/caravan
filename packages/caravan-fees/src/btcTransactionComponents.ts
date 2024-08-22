import { Satoshis, BTC, TxOutputType } from "./types";
import { satoshisToBTC } from "./utils";

/**
 * Abstract base class for Bitcoin transaction components.
 * Provides common functionality for inputs and outputs.
 */
export abstract class BtcTxComponent {
  protected _amountSats: Satoshis;

  /**
   * @param amountSats - The amount in satoshis
   */
  constructor(amountSats: Satoshis) {
    this._amountSats = amountSats;
  }

  /**
   * Get the amount in satoshis
   * @returns The amount in satoshis
   */
  get amountSats(): Satoshis {
    return this._amountSats;
  }

  /**
   * Set  amount in satoshis
   * @param amountSats - New amount in satoshis
   */
  set amountSats(value: Satoshis) {
    this._amountSats = value;
  }

  /**
   * Get the amount in BTC
   * @returns The amount in BTC
   */
  get amountBTC(): BTC {
    return satoshisToBTC(this._amountSats);
  }

  hasAmount(): boolean {
    return this._amountSats > 0;
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

  /**
   * @param params - Input parameters
   * @param params.txid - Transaction ID of the UTXO
   * @param params.vout - Output index of the UTXO
   * @param params.amountSats - Amount in satoshis
   */
  constructor(params: { txid: string; vout: number; amountSats?: Satoshis }) {
    super(params.amountSats || 0);
    this._txid = params.txid;
    this._vout = params.vout;
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
   * Check if the input is valid
   * @returns True if the amount is positive and exists
   */
  isValid(): boolean {
    return this.hasAmount();
  }
}
/**
 * Represents a Bitcoin transaction output
 */
export class BtcTxOutputTemplate extends BtcTxComponent {
  private readonly _address: string;
  private readonly _type: TxOutputType;
  private _malleable: boolean;

  /**
   * @param params - Output parameters
   * @param params.address - Recipient address
   * @param params.amountSats - Amount in satoshis
   * @param params.type - Type of output (destination or change)
   */
  constructor(params: {
    address: string;
    amountSats?: Satoshis | undefined;
    type: TxOutputType;
  }) {
    super(params.amountSats || 0);
    this._address = params.address;
    this._type = params.type;
    this._malleable = params.type === TxOutputType.CHANGE;

    if (
      this._type === TxOutputType.DESTINATION &&
      params.amountSats === undefined
    ) {
      throw new Error("Destination outputs must have an amount specified");
    }
  }

  /** Get the recipient address */
  get address(): string {
    return this._address;
  }

  /** Get the output type */
  get type(): TxOutputType {
    return this._type;
  }

  /** Check if the output is malleable (can be modified) */
  get isMalleable(): boolean {
    return this._malleable;
  }

  /**
   * Set a new amount for the output
   * @param amountSats - New amount in satoshis
   * @throws Error if trying to modify a non-malleable output
   */
  setAmount(amountSats: Satoshis): void {
    if (!this._malleable) {
      throw new Error("Cannot modify non-malleable output");
    }
    this._amountSats = amountSats;
  }

  addAmount(amountSats: number): void {
    if (!this._malleable) {
      throw new Error("Cannot modify non-malleable output");
    }
    this._amountSats += amountSats;
  }

  subtractAmount(amountSats: number): void {
    if (!this._malleable) {
      throw new Error("Cannot modify non-malleable output");
    }
    if (amountSats > this._amountSats) {
      throw new Error("Cannot subtract more than the current amount");
    }
    this._amountSats -= amountSats;
  }

  lock(malleable: boolean): void {
    this._malleable = malleable;
  }

  /**
   * Check if the output is valid
   * @returns True if the amount is positive and address is not empty
   */
  isValid(): boolean {
    return this.hasAmount() && this._address !== "";
  }
}
