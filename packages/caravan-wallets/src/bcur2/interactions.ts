/**
 * @module bcur2-interactions
 * This module provides classes for interacting with BCUR2-based wallets.
 * BCUR2 is a format for encoding Bitcoin data in QR codes, particularly
 * useful for airgapped hardware wallets.
 */

import { BitcoinNetwork, Network } from "@caravan/bitcoin";

import {
  IndirectKeystoreInteraction,
  PENDING,
  ACTIVE,
  INFO,
} from "../interaction";

import { BCURDecoder2 } from "./decoder";
import { BCUREncoder2 } from "./encoder";

/** Constant defining BCUR2 interactions */
export const BCUR2 = "bcur2";

/**
 * Base class for interactions with BCUR2-based wallets.
 * Provides common functionality for handling QR code scanning and decoding
 * using the BCUR2 format.
 *
 * @extends IndirectKeystoreInteraction
 */
export class BCUR2Interaction extends IndirectKeystoreInteraction {
  protected decoder: BCURDecoder2;

  protected network: BitcoinNetwork;

  /**
   * Creates a new BCUR2 interaction instance
   * @param {BitcoinNetwork} network - The Bitcoin network to use (mainnet or testnet)
   */
  constructor(network: BitcoinNetwork = Network.MAINNET) {
    super();
    this.network = network;
    this.decoder = new BCURDecoder2();
  }

  /**
   * Returns the status messages for the interaction
   * @returns {Array} Array of message objects describing the current state
   */
  messages() {
    const messages = super.messages();
    messages.push({
      state: ACTIVE,
      level: INFO,
      code: "bcur2.scanning",
      text: "Scan QR code sequence now.",
    });
    return messages;
  }

  /**
   * Resets the decoder state
   */
  reset() {
    this.decoder.reset();
  }

  /**
   * Checks if the QR code scanning is complete
   * @returns {boolean} True if all parts have been scanned
   */
  isComplete(): boolean {
    return this.decoder.isComplete();
  }

  /**
   * Gets the current progress of QR code scanning
   * @returns {string} A string describing the current progress
   */
  getProgress(): string {
    return this.decoder.getProgress();
  }

  /**
   * Gets any error that occurred during scanning
   * @returns {string|null} Error message or null if no error
   */
  getError(): string | null {
    return this.decoder.getError();
  }
}

/**
 * Class for importing extended public keys from BCUR2 wallet QR codes.
 * Handles the scanning and decoding of multi-part QR codes containing
 * extended public key (xpub) data in the BCUR2 format.
 *
 * This interaction class works with the BCURDecoder2 class to process
 * multi-part QR codes. It expects QR codes to contain:
 * - Extended public key (xpub)
 * - Root fingerprint (xfp)
 * - BIP32 derivation path
 *
 * @extends BCUR2Interaction
 *
 * @example
 * const interaction = new BCUR2ExportExtendedPublicKey({
 *   network: Network.TESTNET,
 *   bip32Path: "m/48'/1'/0'/2'"
 * });
 *
 * // When QR code part is scanned:
 * interaction.parse("UR:CRYPTO-ACCOUNT/...");
 *
 * if (interaction.isComplete()) {
 *   const result = interaction.getDecodedData();
 *   console.log(result.xpub);  // The extended public key
 *   console.log(result.path);  // The BIP32 derivation path
 *   console.log(result.xfp);   // The root fingerprint
 * }
 */
export class BCUR2ExportExtendedPublicKey extends BCUR2Interaction {
  private bip32Path: string;

  private decodedData: any = null;

  /**
   * Creates a new BCUR2 extended public key import interaction
   * @param {Object} params - The constructor parameters
   * @param {BitcoinNetwork} [params.network=Network.MAINNET] - The Bitcoin network to use
   * @param {string} params.bip32Path - The BIP32 derivation path to request
   */
  constructor({
    network = Network.MAINNET,
    bip32Path,
  }: {
    network?: BitcoinNetwork;
    bip32Path: string;
  }) {
    super(network);
    this.bip32Path = bip32Path;
    this.workflow = ["request", "parse"];
  }

  /**
   * Returns the interaction messages for the UI
   * @returns {Array} Array of message objects describing the workflow
   */
  messages() {
    const messages = super.messages();
    messages.push({
      state: PENDING,
      level: INFO,
      code: "bcur2.display_qr",
      text: `Display the QR code for path: ${this.bip32Path}`,
    });
    messages.push({
      state: PENDING,
      level: INFO,
      code: "bcur2.scan_qr",
      text: "Scan the QR code sequence from your device",
    });
    return messages;
  }

  /**
   * Generates the request data for displaying QR codes
   * @returns {Object} Request data containing instructions and BIP32 path
   */
  request() {
    return {
      instruction: `Please display your QR code for ${this.bip32Path}`,
      bip32Path: this.bip32Path,
    };
  }

  /**
   * Processes a scanned QR code part
   * @param {string} urPart - The scanned UR:CRYPTO-ACCOUNT QR code data
   * @returns {Object|null} The decoded data if complete, null if more parts needed
   * @throws {Error} If there's an error parsing the QR code data
   */
  parse(urPart: string) {
    if (!urPart) {
      throw new Error("No QR code data received.");
    }

    try {
      // Process the QR code part
      this.decoder.receivePart(urPart);

      // If we have all parts, get the decoded data
      if (this.decoder.isComplete()) {
        const data = this.decoder.getDecodedData(this.network);
        if (!data) {
          throw new Error("Failed to decode QR code data");
        }
        this.decodedData = data;
        return data;
      }

      // Not complete yet
      return null;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      throw new Error(`Error parsing BCUR2 data: ${errorMessage}`);
    }
  }

  /**
   * Gets the fully decoded data after all QR code parts are scanned
   * @returns {Object|null} The decoded data containing xpub, path and fingerprint
   */
  getDecodedData() {
    if (!this.decodedData && this.decoder.isComplete()) {
      this.decodedData = this.decoder.getDecodedData(this.network);
    }
    return this.decodedData;
  }
}

/**
 * Base class for BCUR2 encoding interactions.
 * Provides functionality for encoding data into QR code fragments.
 *
 * @extends IndirectKeystoreInteraction
 */
export class BCUR2EncodeInteraction extends IndirectKeystoreInteraction {
  protected encoder: BCUREncoder2;

  protected fragments: string[];

  protected currentFragmentIndex: number;

  /**
   * Creates a new BCUR2 encode interaction instance
   * @param {string} data - The data to encode
   * @param {number} maxFragmentLength - Maximum length of each QR code fragment
   */
  constructor(data: string, maxFragmentLength: number = 100) {
    super();
    this.encoder = new BCUREncoder2(data, maxFragmentLength);
    this.fragments = [];
    this.currentFragmentIndex = 0;
  }

  /**
   * Returns the status messages for the interaction
   * @returns {Array} Array of message objects describing the current state
   */
  messages() {
    const messages = super.messages();
    
    if (this.fragments.length === 0) {
      messages.push({
        state: PENDING,
        level: INFO,
        code: "bcur2.encode.ready",
        text: "Ready to encode data into QR codes.",
      });
    } else {
      messages.push({
        state: ACTIVE,
        level: INFO,
        code: "bcur2.encode.displaying",
        text: `Displaying QR code ${this.currentFragmentIndex + 1} of ${this.fragments.length}`,
      });
    }

    return messages;
  }

  /**
   * Encodes the data and prepares QR code fragments
   * @returns {Array<string>} Array of QR code fragments
   */
  encode(): string[] {
    try {
      this.fragments = this.encoder.encodePSBT();
      this.currentFragmentIndex = 0;
      return this.fragments;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to encode data: ${errorMessage}`);
    }
  }

  /**
   * Gets all QR code fragments
   * @returns {Array<string>} Array of all QR code fragments
   */
  getFragments(): string[] {
    return this.fragments;
  }

  /**
   * Gets the current QR code fragment
   * @returns {string|null} Current QR code fragment or null if not available
   */
  getCurrentFragment(): string | null {
    if (this.fragments.length === 0) return null;
    return this.fragments[this.currentFragmentIndex] || null;
  }

  /**
   * Moves to the next QR code fragment
   * @returns {string|null} Next QR code fragment or null if at the end
   */
  nextFragment(): string | null {
    if (this.currentFragmentIndex < this.fragments.length - 1) {
      this.currentFragmentIndex++;
      return this.getCurrentFragment();
    }
    return null;
  }

  /**
   * Moves to the previous QR code fragment
   * @returns {string|null} Previous QR code fragment or null if at the beginning
   */
  previousFragment(): string | null {
    if (this.currentFragmentIndex > 0) {
      this.currentFragmentIndex--;
      return this.getCurrentFragment();
    }
    return null;
  }

  /**
   * Gets the total number of fragments
   * @returns {number} Total number of QR code fragments
   */
  getFragmentCount(): number {
    return this.fragments.length;
  }

  /**
   * Gets the current fragment index (0-based)
   * @returns {number} Current fragment index
   */
  getCurrentFragmentIndex(): number {
    return this.currentFragmentIndex;
  }

  /**
   * Sets the current fragment index
   * @param {number} index - The fragment index to set
   * @returns {string|null} The fragment at the specified index or null if invalid
   */
  setCurrentFragmentIndex(index: number): string | null {
    if (index >= 0 && index < this.fragments.length) {
      this.currentFragmentIndex = index;
      return this.getCurrentFragment();
    }
    return null;
  }

  /**
   * Checks if there are more fragments after the current one
   * @returns {boolean} True if there are more fragments
   */
  hasNextFragment(): boolean {
    return this.currentFragmentIndex < this.fragments.length - 1;
  }

  /**
   * Checks if there are fragments before the current one
   * @returns {boolean} True if there are previous fragments
   */
  hasPreviousFragment(): boolean {
    return this.currentFragmentIndex > 0;
  }

  /**
   * Resets the encoder with new data
   * @param {string} data - New data to encode
   */
  setData(data: string): void {
    this.encoder.setData(data);
    this.fragments = [];
    this.currentFragmentIndex = 0;
  }

  /**
   * Estimates the number of fragments for the current data
   * @returns {number} Estimated fragment count
   */
  estimateFragmentCount(): number {
    return this.encoder.estimateFragmentCount();
  }
}

/**
 * Interaction class for encoding PSBTs into BCUR2 QR codes.
 * Specifically designed for encoding Partially Signed Bitcoin Transactions.
 */
export class BCUR2EncodePSBT extends BCUR2EncodeInteraction {
  /**
   * Creates a new BCUR2 PSBT encode interaction instance
   * @param {string} psbtBase64 - The base64-encoded PSBT to encode
   * @param {number} maxFragmentLength - Maximum length of each QR code fragment
   */
  constructor(psbtBase64: string, maxFragmentLength: number = 100) {
    super(psbtBase64, maxFragmentLength);
  }

  /**
   * Returns the status messages for the interaction
   * @returns {Array} Array of message objects describing the current state
   */
  messages() {
    const messages = super.messages();
    
    // Override the generic messages with PSBT-specific ones
    if (this.fragments.length === 0) {
      messages[messages.length - 1] = {
        state: PENDING,
        level: INFO,
        code: "bcur2.encode.psbt.ready",
        text: "Ready to encode PSBT into QR codes.",
      };
    } else {
      messages[messages.length - 1] = {
        state: ACTIVE,
        level: INFO,
        code: "bcur2.encode.psbt.displaying",
        text: `Displaying PSBT QR code ${this.currentFragmentIndex + 1} of ${this.fragments.length}`,
      };
    }

    return messages;
  }
}
