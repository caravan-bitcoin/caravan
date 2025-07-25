/**
 * @module bcur2
 * This module provides functionality for decoding BCUR2 (Bitcoin URIs) QR codes,
 * specifically focused on crypto-account and crypto-hdkey formats used by hardware wallets.
 */

import { BitcoinNetwork, Network } from "@caravan/bitcoin";
import { URRegistryDecoder, CryptoPSBT } from "@keystonehq/bc-ur-registry";

import { processCryptoAccountCBOR, processCryptoHDKeyCBOR } from "./utils";

/**
 * Factory function type for creating CryptoPSBT instances from CBOR
 */
export type CryptoPSBTFromCBORFactory = (cbor: Buffer) => CryptoPSBT;

/**
 * Supported UR types for BCUR2 decoding
 */
export type SupportedURType = "crypto-account" | "crypto-hdkey" | "crypto-psbt";

/**
 * Type guard to check if a string is a supported UR type
 */
function isSupportedURType(type: string): type is SupportedURType {
  return (
    type === "crypto-account" ||
    type === "crypto-hdkey" ||
    type === "crypto-psbt"
  );
}

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

  private cryptoPSBTFromCBORFactory: CryptoPSBTFromCBORFactory;

  /**
   * Creates a new BCUR2 decoder instance
   * @param decoder - Optional URRegistryDecoder instance. If not provided, creates a new one.
   * @param cryptoPSBTFromCBORFactory - Factory function for creating CryptoPSBT instances from CBOR
   */
  constructor(
    decoder?: URRegistryDecoder,
    cryptoPSBTFromCBORFactory: CryptoPSBTFromCBORFactory = (cbor) =>
      CryptoPSBT.fromCBOR(cbor)
  ) {
    this.decoder = decoder || new URRegistryDecoder();
    this.cryptoPSBTFromCBORFactory = cryptoPSBTFromCBORFactory;
  }

  /**
   * Resets the decoder state to initial values
   * @param decoder - Optional URRegistryDecoder instance. If not provided, creates a new one.
   * @param cryptoPSBTFromCBORFactory - Optional factory function for creating CryptoPSBT instances from CBOR
   */
  reset(
    decoder: URRegistryDecoder = new URRegistryDecoder(),
    cryptoPSBTFromCBORFactory?: CryptoPSBTFromCBORFactory
  ) {
    this.decoder = decoder;
    this.error = null;
    this.progress = "Idle";
    if (cryptoPSBTFromCBORFactory) {
      this.cryptoPSBTFromCBORFactory = cryptoPSBTFromCBORFactory;
    }
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
   * Handles decoding of crypto-psbt type BCUR2 data
   * @private
   */
  private handleCryptoPSBT(cbor: Buffer): string {
    try {
      const cryptoPSBT = this.cryptoPSBTFromCBORFactory(cbor);
      const psbtBuffer = cryptoPSBT.getPSBT();
      return psbtBuffer.toString("base64");
    } catch (err: any) {
      throw new Error(`Failed to decode PSBT: ${err.message}`);
    }
  }

  /**
   * Processes decoded CBOR data based on the UR type
   * @private
   * @param {SupportedURType} type - The UR type (crypto-account, crypto-hdkey, or crypto-psbt)
   * @param {Buffer} cbor - The decoded CBOR data
   * @param {BitcoinNetwork} network - The Bitcoin network to use
   * @returns {ExtendedPublicKeyData|string|null} The decoded wallet data or PSBT string or null if error
   */
  private handleDecodedResult(
    type: "crypto-account",
    cbor: Buffer,
    network: BitcoinNetwork
  ): ExtendedPublicKeyData | null;

  private handleDecodedResult(
    type: "crypto-hdkey",
    cbor: Buffer,
    network: BitcoinNetwork
  ): ExtendedPublicKeyData | null;

  private handleDecodedResult(
    type: "crypto-psbt",
    cbor: Buffer,
    network: BitcoinNetwork
  ): string | null;

  private handleDecodedResult(
    type: SupportedURType,
    cbor: Buffer,
    network: BitcoinNetwork
  ): ExtendedPublicKeyData | string | null;

  private handleDecodedResult(
    type: SupportedURType,
    cbor: Buffer,
    network: BitcoinNetwork
  ): ExtendedPublicKeyData | string | null {
    try {
      switch (type) {
        case "crypto-account":
          return this.handleCryptoAccount(cbor, network);
        case "crypto-hdkey":
          return this.handleCryptoHDKey(cbor, network);
        case "crypto-psbt":
          return this.handleCryptoPSBT(cbor);
        default: {
          // This should never happen due to TypeScript's exhaustiveness checking
          const exhaustiveCheck: never = type;
          throw new Error(`Unsupported UR type: ${exhaustiveCheck}`);
        }
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

      if (!isSupportedURType(result.type)) {
        throw new Error(`Unsupported UR type: ${result.type}`);
      }

      const decodedResult = this.handleDecodedResult(
        result.type,
        Buffer.from(result.cbor.buffer),
        network
      );

      // Only return ExtendedPublicKeyData, not PSBT strings
      if (typeof decodedResult === "string") {
        throw new Error("Use getDecodedPSBT() to get PSBT data");
      }

      return decodedResult;
    } catch (err: any) {
      this.error = err.message || String(err);
      return null;
    }
  }

  /**
   * Gets the decoded PSBT data, if available
   * @returns {string|null} The PSBT in base64 format or null
   */
  getDecodedPSBT(): string | null {
    if (!this.decoder.isComplete()) return null;

    try {
      const result = this.decoder.resultUR();

      if (!isSupportedURType(result.type)) {
        throw new Error(`Unsupported UR type: ${result.type}`);
      }

      if (result.type !== "crypto-psbt") {
        throw new Error("QR code does not contain PSBT data");
      }

      const decodedResult = this.handleDecodedResult(
        result.type,
        Buffer.from(result.cbor.buffer),
        Network.MAINNET // Network doesn't matter for PSBT decoding
      );

      if (typeof decodedResult !== "string") {
        throw new Error("Expected PSBT string data");
      }

      return decodedResult;
    } catch (err: any) {
      this.error = err.message || String(err);
      return null;
    }
  }
}
