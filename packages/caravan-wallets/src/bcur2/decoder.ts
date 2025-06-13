/**
 * @module bcur2
 * This module provides functionality for decoding BCUR2 (Bitcoin URIs) QR codes,
 * specifically focused on crypto-account and crypto-hdkey formats used by hardware wallets.
 */

import { BitcoinNetwork } from "@caravan/bitcoin";
import { URRegistryDecoder } from "@keystonehq/bc-ur-registry";

import { processCryptoAccountCBOR, processCryptoHDKeyCBOR } from "./utils";

/**
 * Interface representing decoded extended public key data from a BCUR2 QR code
 * @interface ExtendedPublicKeyData
 */
export interface ExtendedPublicKeyData {
  /** The type of UR data (e.g., "crypto-account" or "crypto-hdkey") */
  type: string;
  /** The extended public key in base58 format */
  xpub: string;
  /** The root fingerprint of the master key (optional) */
  rootFingerprint?: string;
  /** The BIP32 derivation path (optional) */
  bip32Path?: string;
}

/**
 * Class for decoding BCUR2 QR codes containing Bitcoin wallet data.
 * Supports decoding of:
 * - crypto-account: Contains output descriptors with keys
 * - crypto-hdkey: Contains hierarchical deterministic keys
 */
export class BCURDecoder2 {
  private decoder: URRegistryDecoder;

  private error: string | null = null;

  private progress: string = "Idle";

  /**
   * Creates a new BCUR2 decoder instance
   */
  constructor() {
    this.decoder = new URRegistryDecoder();
  }

  /**
   * Resets the decoder state to initial values
   */
  reset() {
    this.decoder = new URRegistryDecoder();
    this.error = null;
    this.progress = "Idle";
  }

  /**
   * Handles decoding of crypto-account type BCUR2 data
   * @private
   */
  private handleCryptoAccount(
    cbor: Buffer,
    network: BitcoinNetwork
  ): ExtendedPublicKeyData {
    return processCryptoAccountCBOR(cbor, network);
  }

  /**
   * Handles decoding of crypto-hdkey type BCUR2 data
   * @private
   */
  private handleCryptoHDKey(
    cbor: Buffer,
    network: BitcoinNetwork
  ): ExtendedPublicKeyData {
    return processCryptoHDKeyCBOR(cbor, network);
  }

  /**
   * Processes decoded CBOR data based on the UR type
   * @private
   * @param {string} type - The UR type (crypto-account or crypto-hdkey)
   * @param {Buffer} cbor - The decoded CBOR data
   * @param {BitcoinNetwork} network - The Bitcoin network to use
   * @returns {ExtendedPublicKeyData|null} The decoded wallet data or null if error
   */
  private handleDecodedResult(
    type: string,
    cbor: Buffer,
    network: BitcoinNetwork
  ): ExtendedPublicKeyData | null {
    try {
      switch (type) {
        case "crypto-account":
          return this.handleCryptoAccount(cbor, network);
        case "crypto-hdkey":
          return this.handleCryptoHDKey(cbor, network);
        default:
          throw new Error(`Unsupported UR type: ${type}`);
      }
    } catch (err: any) {
      console.error("Error decoding UR:", err);
      this.error = err.message || String(err);
      return null;
    }
  }

  /**
   * Receives a part of the QR code data and processes it
   * @param {string} text - The text data from the QR code
   */
  receivePart(text: string): void {
    try {
      if (text.toUpperCase().startsWith("UR:")) {
        this.decoder.receivePart(text);

        if (this.decoder.isComplete()) {
          this.progress = "Complete";
        } else {
          const progress = this.decoder.getProgress();
          this.progress = `Processing QR parts: ${Math.round(progress * 100)}%`;
        }
      } else {
        this.error = "Invalid QR format: Must start with UR:";
      }
    } catch (err: any) {
      this.error = err.message || String(err);
    }
  }

  /**
   * Checks if the decoding process is complete
   * @returns {boolean} True if complete, false otherwise
   */
  isComplete(): boolean {
    return this.decoder.isComplete() || Boolean(this.error);
  }

  /**
   * Gets the current progress of the decoding process
   * @returns {string} The progress message
   */
  getProgress(): string {
    return this.progress;
  }

  /**
   * Gets the last error message, if any
   * @returns {string|null} The error message or null
   */
  getError(): string | null {
    return this.error;
  }

  /**
   * Gets the decoded wallet data, if available
   * @param {BitcoinNetwork} network - The Bitcoin network to use for decoding
   * @returns {ExtendedPublicKeyData|null} The decoded data or null
   */
  getDecodedData(network: BitcoinNetwork): ExtendedPublicKeyData | null {
    if (!this.decoder.isComplete()) return null;

    try {
      const result = this.decoder.resultUR();
      return this.handleDecodedResult(
        result.type,
        Buffer.from(result.cbor.buffer),
        network
      );
    } catch (err: any) {
      this.error = err.message || String(err);
      return null;
    }
  }
}
