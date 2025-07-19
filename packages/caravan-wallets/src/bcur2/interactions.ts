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
 * Interaction class for encoding a PSBT transaction into BCUR2 QR codes
 * for signing by airgapped wallets.
 *
 * @extends BCUR2Interaction
 */
export class BCUR2EncodeTransaction extends BCUR2Interaction {
  private encoder: BCUREncoder2;

  private psbt: string;

  private qrCodeFrames: string[];

  private maxFragmentLength: number;

  /**
   * Creates a new BCUR2 encode transaction interaction
   * @param {Object} params - Parameters for the interaction
   * @param {string} params.psbt - Base64 encoded PSBT to encode
   * @param {BitcoinNetwork} params.network - The Bitcoin network
   * @param {number} params.maxFragmentLength - Maximum QR code fragment length (default: 100)
   */
  constructor({
    psbt,
    network = Network.MAINNET,
    maxFragmentLength = 100,
  }: {
    psbt: string;
    network?: BitcoinNetwork;
    maxFragmentLength?: number;
  }) {
    super(network);
    this.psbt = psbt;
    this.maxFragmentLength = maxFragmentLength;
    this.encoder = new BCUREncoder2(psbt, maxFragmentLength);
    this.qrCodeFrames = [];
  }

  /**
   * Returns the status messages for the interaction
   * @returns {Array} Array of message objects describing the current state
   */
  messages() {
    const messages = super.messages();
    if (this.qrCodeFrames.length > 0) {
      messages.push({
        state: ACTIVE,
        level: INFO,
        code: "bcur2.transaction_encoded",
        text: `Transaction encoded into ${this.qrCodeFrames.length} QR code frames`,
      });
      messages.push({
        state: PENDING,
        level: INFO,
        code: "bcur2.display_animated_qr",
        text: "Display animated QR codes to your signing device",
      });
    } else {
      messages.push({
        state: PENDING,
        level: INFO,
        code: "bcur2.encoding_transaction",
        text: "Encoding transaction into QR codes...",
      });
    }
    return messages;
  }

  /**
   * Generates the request data for displaying animated QR codes
   * @returns {Object} Request data containing QR code frames and metadata
   */
  request() {
    if (this.qrCodeFrames.length === 0) {
      this.qrCodeFrames = this.encoder.encodePSBT();
    }

    return {
      instruction: "Scan these animated QR codes with your signing device",
      qrCodeFrames: this.qrCodeFrames,
      fragmentCount: this.qrCodeFrames.length,
      maxFragmentLength: this.maxFragmentLength,
      psbtSize: this.psbt.length,
    };
  }

  /**
   * Gets the encoded QR code frames
   * @returns {string[]} Array of QR code frame strings
   */
  getQRCodeFrames(): string[] {
    if (this.qrCodeFrames.length === 0) {
      this.qrCodeFrames = this.encoder.encodePSBT();
    }
    return this.qrCodeFrames;
  }

  /**
   * Estimates the number of QR code fragments
   * @returns {number} Estimated fragment count
   */
  estimateFragmentCount(): number {
    return this.encoder.estimateFragmentCount();
  }

  /**
   * Sets a new PSBT to encode
   * @param {string} psbt - Base64 encoded PSBT
   */
  setPSBT(psbt: string): void {
    this.psbt = psbt;
    this.encoder.setData(psbt);
    this.qrCodeFrames = []; // Reset frames to force re-encoding
  }

  /**
   * Sets the maximum fragment length for QR codes
   * @param {number} length - Maximum fragment length
   */
  setMaxFragmentLength(length: number): void {
    this.maxFragmentLength = length;
    this.encoder.setMaxFragmentLength(length);
    this.qrCodeFrames = []; // Reset frames to force re-encoding
  }
}