/**
 * @module bcur2
 * This module provides functionality for decoding BCUR2 (Bitcoin URIs) QR codes,
 * specifically focused on crypto-account and crypto-hdkey formats used by hardware wallets.
 */

import { ExtendedPublicKey, Network, BitcoinNetwork } from "@caravan/bitcoin";
import { CryptoHDKey, CryptoAccount, URRegistryDecoder } from "@keystonehq/bc-ur-registry";

/**
 * Interface representing the decoded data from a BCUR2 QR code
 * @interface DecodedData
 */
export interface DecodedData {
  /** The type of UR data (e.g., "crypto-account" or "crypto-hdkey") */
  type: string;
  /** The extended public key in base58 format */
  xpub: string;
  /** The root fingerprint of the master key (optional) */
  xfp?: string;
  /** The BIP32 derivation path (optional) */
  path?: string;
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

  private network: BitcoinNetwork = Network.MAINNET;

  /**
   * Creates a new BCUR2 decoder instance
   * @param {BitcoinNetwork} network - The Bitcoin network to use (mainnet or testnet)
   */
  constructor(network: BitcoinNetwork = Network.MAINNET) {
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
   * Processes decoded CBOR data based on the UR type
   * @private
   * @param {string} type - The UR type (crypto-account or crypto-hdkey)
   * @param {Buffer} cbor - The decoded CBOR data
   * @returns {DecodedData|null} The decoded wallet data or null if error
   */
  private handleDecodedResult(type: string, cbor: Buffer): DecodedData | null {
    try {
      if (type === "crypto-account") {
        const account = CryptoAccount.fromCBOR(cbor);
        const descriptors = account.getOutputDescriptors();
        if (!descriptors.length) throw new Error("No output descriptors found");
        
        const hdKey = descriptors[0].getCryptoKey();
        if (!hdKey || !(hdKey instanceof CryptoHDKey)) {
          throw new Error("Invalid HDKey in crypto-account");
        }

        // Extract components from CryptoHDKey
        const chainCode = hdKey.getChainCode();
        const key = hdKey.getKey();
        const origin = hdKey.getOrigin();
        const xfp = origin?.getSourceFingerprint()?.toString("hex")?.toUpperCase();
        const path = origin?.getPath();
        const depth = origin?.getDepth() || 0;
        const components = origin?.getComponents() || [];
        const index = components.length > 0 ? components[components.length - 1]?.getIndex() || 0 : 0;
        const parentFp = origin?.getSourceFingerprint() || Buffer.alloc(4);

        // Construct ExtendedPublicKey
        const xpubObj = new ExtendedPublicKey({
          depth,
          index,
          chaincode: chainCode.toString('hex'),
          pubkey: key.toString('hex'), 
          parentFingerprint: parentFp.readUInt32BE(0),
          network: this.network
        });

        const xpub = xpubObj.toBase58();

        if (!xpub) throw new Error("Failed to construct xpub from HDKey");
        return { type, xpub, xfp, path };
      }

      if (type === "crypto-hdkey") {
        const hdkey = CryptoHDKey.fromCBOR(cbor);
        if (!hdkey) {
          throw new Error("Invalid crypto-hdkey data");
        }

        const xpub = hdkey.toString();
        const origin = hdkey.getOrigin();
        const xfp = origin?.getSourceFingerprint()?.toString("hex")?.toUpperCase();
        const path = origin?.getPath();

        if (!xpub) throw new Error("xpub missing in crypto-hdkey");
        return { type, xpub, xfp, path };
      }

      throw new Error(`Unsupported UR type: ${type}`);
    } catch (err: any) {
      console.error("Error decoding UR:", err);
      this.error = err.message || String(err);
      return null;
    }
  }

  /**
   * Processes a single QR code part
   * @param {string} text - The scanned QR code text (must start with "UR:")
   * @throws {Error} If the QR code format is invalid or there's a decoding error
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
   * Checks if all required QR code parts have been received
   * @returns {boolean} True if decoding is complete or error occurred
   */
  isComplete(): boolean {
    return this.decoder.isComplete() || Boolean(this.error);
  }

  /**
   * Gets the current decoding progress
   * @returns {string} A string describing the current progress
   */
  getProgress(): string {
    return this.progress;
  }

  /**
   * Gets any error that occurred during decoding
   * @returns {string|null} Error message or null if no error
   */
  getError(): string | null {
    return this.error;
  }

  /**
   * Gets the fully decoded data if all parts are received
   * @returns {DecodedData|null} The decoded wallet data or null if incomplete/error
   */
  getDecodedData(): DecodedData | null {
    if (!this.decoder.isComplete()) return null;

    try {
      const result = this.decoder.resultUR();
      return this.handleDecodedResult(result.type, Buffer.from(result.cbor.buffer));
    } catch (err: any) {
      this.error = err.message || String(err);
      return null;
    }
  }
}
