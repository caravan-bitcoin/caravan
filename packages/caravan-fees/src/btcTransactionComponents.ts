import { satoshisToBitcoins } from "@caravan/bitcoin";
import { BigNumber } from "bignumber.js";

import { RBF_SEQUENCE } from "./constants";
import { Satoshis, BTC, UTXO, InputDerivation } from "./types";
import { validateNonWitnessUtxo, validateSequence } from "./utils";

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
  private readonly _txid: string; // Note internally in this class we retain the `txid` in **big-endian** form throughout our internal structures.
  private readonly _vout: number;
  private _nonWitnessUtxo?: Buffer;
  private _witnessUtxo?: {
    script: Buffer;
    value: number;
  };
  private _sequence?: number;
  private _redeemScript?: Buffer;
  private _witnessScript?: Buffer;
  private _bip32Derivations: InputDerivation[] = [];

  /**
   * @param {Object} params - The parameters for creating a BtcTxInputTemplate
   * @param {string} params.txid - The transaction ID of the UTXO (reversed, big-endian)
   * @param {number} params.vout - The output index in the transaction
   * @param {Satoshis} params.amountSats - The amount in satoshis
   */
  constructor(params: { txid: string; vout: number; amountSats?: Satoshis }) {
    super(params.amountSats || "0");
    this._txid = params.txid;
    this._vout = params.vout;
  }

  /**
   * Creates a `BtcTxInputTemplate` from a user-provided `UTXO` object.
   *
   * This function prepares the UTXO for internal PSBT construction by:
   * - Mapping UTXO metadata such as amount, witness/non-witness data, scripts, derivation paths, and sequence number into the PSBT-compatible format.
   * - Keeping the `txid` stored in its original **big-endian** (human-readable) form internally.
   * - Only converting the `txid` to **little-endian** at the time of serialization during PSBT construction (inside `toPSBT()` method of `BtcTransactionTemplate`), as required by Bitcoin’s internal protocol format.
   *
   * @param utxo - The UTXO provided by the user, where `txid` is expected to be in **big-endian** format
   *               (as commonly seen in block explorers and UIs).
   *
   * @returns A `BtcTxInputTemplate` instance representing the PSBT input.
   *
   * @remarks
   * Bitcoin internally uses **little-endian** format for transaction IDs during transaction serialization and signing.
   * However, for clarity and consistency with human-readable sources (like block explorers),
   * we retain the `txid` in **big-endian** form throughout our internal structures.
   * The conversion to little-endian is deferred until the final serialization step (`toPSBT()`).
   *
   * For more information on byte order in Bitcoin, see:
   * @see https://learnmeabitcoin.com/technical/general/byte-order
   */
  static fromUTXO(utxo: UTXO): BtcTxInputTemplate {
    const template = new BtcTxInputTemplate({
      txid: utxo.txid,
      vout: utxo.vout,
      amountSats: utxo.value,
    });

    if (utxo.prevTxHex) {
      template.nonWitnessUtxo = Buffer.from(utxo.prevTxHex, "hex");
    }

    if (utxo.witnessUtxo) {
      template.witnessUtxo = utxo.witnessUtxo;
    }
    if (utxo.redeemScript) {
      template.redeemScript = utxo.redeemScript;
    }

    if (utxo.witnessScript) {
      template.witnessScript = utxo.witnessScript;
    }

    if (utxo.bip32Derivations) {
      template.bip32Derivations = utxo.bip32Derivations;
    }
    if (utxo.sequence) {
      template.sequence = utxo.sequence;
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
  set sequence(sequence: number) {
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
    this.sequence = 0xfffffffd;
  }

  /**
   * Disables Replace-By-Fee (RBF) signaling for this input.
   * Sets the sequence number to 0xffffffff.
   */
  disableRBF(): void {
    this.sequence = 0xffffffff;
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
  set nonWitnessUtxo(value: Buffer) {
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
  set witnessUtxo(value: { script: Buffer; value: number }) {
    this._witnessUtxo = value;
  }

  /**
   * Gets the redeem script for P2SH inputs.
   * The redeem script contains the actual spending conditions for P2SH outputs.
   * For multisig P2SH, this is the multisig script with the signature requirements.
   */
  get redeemScript(): Buffer | undefined {
    return this._redeemScript;
  }

  /**
   * Sets the redeem script for P2SH inputs.
   * Required for spending P2SH outputs in PSBTs.
   *
   * @param script - The redeem script buffer
   */
  set redeemScript(script: Buffer) {
    this._redeemScript = script;
  }

  /**
   * Gets the witness script for segwit inputs (P2WSH, P2SH-P2WSH).
   * The witness script contains the actual spending conditions for segwit script outputs.
   * For multisig segwit, this is the multisig script with the signature requirements.
   */
  get witnessScript(): Buffer | undefined {
    return this._witnessScript;
  }

  /**
   * Sets the witness script for segwit inputs.
   * Required for spending P2WSH and P2SH-P2WSH outputs in PSBTs.
   *
   * @param script - The witness script buffer
   */
  set witnessScript(script: Buffer) {
    this._witnessScript = script;
  }

  /**
   * Gets the BIP32 derivation information for all public keys in this input.
   * This information is crucial for hardware wallets and multisig coordinators
   * to identify which keys they control and how to derive them.
   */
  get bip32Derivations(): readonly InputDerivation[] {
    return this._bip32Derivations;
  }

  /**
   * Sets the BIP32 derivation information for all public keys in this input.
   * Each derivation entry maps a public key to its derivation path and master fingerprint.
   *
   * @param derivations - Array of BIP32 derivation information
   */
  set bip32Derivations(derivations: InputDerivation[]) {
    this._bip32Derivations = [...derivations];
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
      sequence: this._sequence || RBF_SEQUENCE, // Default it to signal RBF if not provided
      prevTxHex: this._nonWitnessUtxo?.toString("hex"),
      witnessUtxo: this._witnessUtxo,
      redeemScript: this._redeemScript,
      witnessScript: this._witnessScript,
      bip32Derivations: this._bip32Derivations || undefined,
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
