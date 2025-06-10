/**
 * @module bcur2
 * This module provides functionality for decoding BCUR2 (Bitcoin URIs) QR codes,
 * specifically focused on crypto-account and crypto-hdkey formats used by hardware wallets.
 */

import { ExtendedPublicKey, Network, BitcoinNetwork } from "@caravan/bitcoin";
import {
  CryptoHDKey,
  CryptoAccount,
  URRegistryDecoder,
} from "@keystonehq/bc-ur-registry";

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

  private network: BitcoinNetwork = Network.TESTNET;

  /**
   * Creates a new BCUR2 decoder instance
   * @param {BitcoinNetwork} network - The Bitcoin network to use (mainnet or testnet)
   */
  constructor(network: BitcoinNetwork = Network.TESTNET) {
    this.decoder = new URRegistryDecoder();
    this.network = network;
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
  private handleCryptoAccount(cbor: Buffer): ExtendedPublicKeyData {
    const account = CryptoAccount.fromCBOR(cbor);
    const descriptors = account.getOutputDescriptors();
    if (!descriptors.length) throw new Error("No output descriptors found");

    // Ensured we have  only 1 descriptor here
    const hdKey = descriptors[0].getCryptoKey();
    if (!hdKey || !(hdKey instanceof CryptoHDKey)) {
      throw new Error("Invalid HDKey in crypto-account");
    }

    // Extract components from CryptoHDKey
    const chainCode = hdKey.getChainCode();
    const key = hdKey.getKey();
    const parentFp = hdKey.getParentFingerprint() || Buffer.alloc(4);
    const origin = hdKey.getOrigin();
    const rootFingerprint = origin
      ?.getSourceFingerprint()
      ?.toString("hex")
      ?.toUpperCase();
    const bip32Path = origin?.getPath();

    // Get the correct depth and index from the path components
    const components = origin?.getComponents() || [];
    const depth = components.length;
    const lastComponent = components[components.length - 1];

    // Handle hardened vs non-hardened indices correctly
    let index = 0;
    if (lastComponent) {
      if (lastComponent.isHardened()) {
        index = lastComponent.getIndex() + 0x80000000;
      } else {
        index = lastComponent.getIndex();
      }
    }
    // Construct ExtendedPublicKey
    const xpubObj = new ExtendedPublicKey({
      depth,
      index,
      chaincode: chainCode.toString("hex"),
      pubkey: key.toString("hex"),
      parentFingerprint: parentFp.readUInt32BE(0),
      network: this.network,
    });

    const xpub = xpubObj.toBase58();
    if (!xpub) throw new Error("Failed to construct xpub from HDKey");

    return { type: "crypto-account", xpub, rootFingerprint, bip32Path };
  }

  /**
   * Handles decoding of crypto-hdkey type BCUR2 data
   * @private
   */
  private handleCryptoHDKey(cbor: Buffer): ExtendedPublicKeyData {
    const hdkey = CryptoHDKey.fromCBOR(cbor);
    if (!hdkey) {
      throw new Error("Invalid crypto-hdkey data");
    }

    // Extract key details
    const chainCode = hdkey.getChainCode();
    const key = hdkey.getKey();
    const parentFp = hdkey.getParentFingerprint() || Buffer.alloc(4);
    const origin = hdkey.getOrigin();
    const rootFingerprint = origin
      ?.getSourceFingerprint()
      ?.toString("hex")
      ?.toUpperCase();
    const bip32Path = origin?.getPath();

    // Get depth and index from path
    const components = origin?.getComponents() || [];
    const depth = components.length;
    const lastComponent = components[components.length - 1];

    // Handle hardened vs non-hardened indices
    let index = 0;
    if (lastComponent) {
      if (lastComponent.isHardened()) {
        index = lastComponent.getIndex() + 0x80000000;
      } else {
        index = lastComponent.getIndex();
      }
    }

    // Create xpub with proper network version
    const xpubObj = new ExtendedPublicKey({
      depth,
      index,
      chaincode: chainCode.toString("hex"),
      pubkey: key.toString("hex"),
      parentFingerprint: parentFp.readUInt32BE(0),
      rootFingerprint,
      network: this.network,
      path: bip32Path,
    });

    const xpub = xpubObj.toBase58();
    if (!xpub) throw new Error("Failed to construct xpub from HDKey");
    return { type: "crypto-hdkey", xpub, rootFingerprint, bip32Path };
  }

  /**
   * Processes decoded CBOR data based on the UR type
   * @private
   * @param {string} type - The UR type (crypto-account or crypto-hdkey)
   * @param {Buffer} cbor - The decoded CBOR data
   * @returns {ExtendedPublicKeyData|null} The decoded wallet data or null if error
   */
  private handleDecodedResult(
    type: string,
    cbor: Buffer
  ): ExtendedPublicKeyData | null {
    try {
      switch (type) {
        case "crypto-account":
          return this.handleCryptoAccount(cbor);
        case "crypto-hdkey":
          return this.handleCryptoHDKey(cbor);
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
   * @returns {ExtendedPublicKeyData|null} The decoded data or null
   */
  getDecodedData(): ExtendedPublicKeyData | null {
    if (!this.decoder.isComplete()) return null;

    try {
      const result = this.decoder.resultUR();
      return this.handleDecodedResult(
        result.type,
        Buffer.from(result.cbor.buffer)
      );
    } catch (err: any) {
      this.error = err.message || String(err);
      return null;
    }
  }
}
