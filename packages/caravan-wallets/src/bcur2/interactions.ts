/**
 * @module bcur2-interactions
 * This module provides classes for interacting with BCUR2-based wallets.
 * BCUR2 is a format for encoding Bitcoin data in QR codes, particularly
 * useful for airgapped hardware wallets.
 */

import {
  BitcoinNetwork,
  Network,
  parseSignaturesFromPSBT,
} from "@caravan/bitcoin";

import {
  IndirectKeystoreInteraction,
  PENDING,
  ACTIVE,
  INFO,
} from "../interaction";

import { BCUR2Decoder } from "./decoder";
import { BCUR2Encoder } from "./encoder";

/**
 * Factory function type for creating BCUR2Decoder instances
 */
export type BCUR2DecoderFactory = () => BCUR2Decoder;

/**
 * Factory function type for creating BCUR2Encoder instances
 */
export type BCUR2EncoderFactory = (
  data: string,
  maxFragmentLength: number
) => BCUR2Encoder;

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
  protected decoder: BCUR2Decoder;

  protected network: BitcoinNetwork;

  protected decoderFactory: BCUR2DecoderFactory;

  /**
   * Creates a new BCUR2 interaction instance
   * @param {BitcoinNetwork} network - The Bitcoin network to use (mainnet or testnet)
   * @param {BCUR2DecoderFactory} decoderFactory - Factory function for creating BCUR2Decoder instances
   */
  constructor(
    network: BitcoinNetwork = Network.MAINNET,
    decoderFactory: BCUR2DecoderFactory = () => new BCUR2Decoder()
  ) {
    super();
    this.network = network;
    this.decoderFactory = decoderFactory;
    this.decoder = decoderFactory();
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
 * This interaction class works with the BCUR2Decoder class to process
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
   * @param {BCUR2DecoderFactory} [params.decoderFactory] - Factory function for creating BCUR2Decoder instances
   */
  constructor({
    network = Network.MAINNET,
    bip32Path,
    decoderFactory,
  }: {
    network?: BitcoinNetwork;
    bip32Path: string;
    decoderFactory?: BCUR2DecoderFactory;
  }) {
    super(network, decoderFactory);
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
  private encoder: BCUR2Encoder;

  private psbt: string;

  private qrCodeFrames: string[];

  private maxFragmentLength: number;

  private encoderFactory: BCUR2EncoderFactory;

  /**
   * Creates a new BCUR2 encode transaction interaction
   * @param {Object} params - Parameters for the interaction
   * @param {string} params.psbt - Base64 encoded PSBT to encode
   * @param {BitcoinNetwork} params.network - The Bitcoin network
   * @param {number} params.maxFragmentLength - Maximum QR code fragment length (default: 100)
   * @param {BCUR2DecoderFactory} [params.decoderFactory] - Factory function for creating BCUR2Decoder instances
   * @param {BCUR2EncoderFactory} [params.encoderFactory] - Factory function for creating BCUR2Encoder instances
   */
  constructor({
    psbt,
    network = Network.MAINNET,
    maxFragmentLength = 100,
    decoderFactory,
    encoderFactory = (data, maxLen) => new BCUR2Encoder(data, maxLen),
  }: {
    psbt: string;
    network?: BitcoinNetwork;
    maxFragmentLength?: number;
    decoderFactory?: BCUR2DecoderFactory;
    encoderFactory?: BCUR2EncoderFactory;
  }) {
    super(network, decoderFactory);
    this.psbt = psbt;
    this.maxFragmentLength = maxFragmentLength;
    this.encoderFactory = encoderFactory;
    this.encoder = encoderFactory(psbt, maxFragmentLength);
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
    this.encoder.data = psbt;
    this.qrCodeFrames = []; // Reset frames to force re-encoding
  }

  /**
   * Sets the maximum fragment length for QR codes
   * @param {number} length - Maximum fragment length
   */
  setMaxFragmentLength(length: number): void {
    this.maxFragmentLength = length;
    this.encoder.maxFragmentLength = length;
    this.qrCodeFrames = []; // Reset frames to force re-encoding
  }
}

/**
 * Interaction class for signing multisig transactions using BCUR2 QR codes.
 * This class handles the complete signing workflow:
 * 1. Encodes the transaction PSBT into QR codes for display
 * 2. Accepts the signed PSBT back from the device via QR code scanning
 * 3. Parses and extracts signatures from the signed PSBT
 *
 * @extends BCUR2Interaction
 */
export class BCUR2SignMultisigTransaction extends BCUR2Interaction {
  private encoder: BCUR2Encoder;

  private psbt: string;

  private qrCodeFrames: string[];

  private maxFragmentLength: number;

  private encoderFactory: BCUR2EncoderFactory;

  /**
   * Creates a new BCUR2 sign multisig transaction interaction
   * @param {Object} params - Parameters for the interaction
   * @param {string} params.psbt - Base64 encoded PSBT to sign
   * @param {BitcoinNetwork} params.network - The Bitcoin network
   * @param {number} params.maxFragmentLength - Maximum QR code fragment length (default: 100)
   * @param {BCUR2DecoderFactory} [params.decoderFactory] - Factory function for creating BCUR2Decoder instances
   * @param {BCUR2EncoderFactory} [params.encoderFactory] - Factory function for creating BCUR2Encoder instances
   */
  constructor({
    psbt,
    network = Network.MAINNET,
    maxFragmentLength = 100,
    decoderFactory,
    encoderFactory = (data, maxLen) => new BCUR2Encoder(data, maxLen),
  }: {
    psbt: string;
    network?: BitcoinNetwork;
    maxFragmentLength?: number;
    decoderFactory?: BCUR2DecoderFactory;
    encoderFactory?: BCUR2EncoderFactory;
  }) {
    super(network, decoderFactory);

    if (!psbt) {
      throw new Error("PSBT is required for signing");
    }

    this.psbt = psbt;
    this.maxFragmentLength = maxFragmentLength;
    this.encoderFactory = encoderFactory;
    this.encoder = encoderFactory(psbt, maxFragmentLength);
    this.qrCodeFrames = [];

    // Set workflow for test framework
    this.workflow = ["request", "parse"];
  }

  /**
   * Returns the status messages for the interaction
   * @returns {Array} Array of message objects describing the current state
   */
  messages() {
    const messages = super.messages();

    messages.push({
      state: PENDING,
      level: INFO,
      code: "bcur2.display_qr_for_signing",
      text: "Display the QR codes to your signing device",
    });

    messages.push({
      state: PENDING,
      level: INFO,
      code: "bcur2.scan_signed_psbt",
      text: "After signing, scan the signed PSBT QR codes from your device",
    });

    return messages;
  }

  /**
   * Generates the request data for the signing process
   * @returns {Object} Request data containing QR code frames for display
   */
  request() {
    // Generate QR frames if not already done
    if (this.qrCodeFrames.length === 0) {
      this.qrCodeFrames = this.encoder.encodePSBT();
    }

    const requestData = {
      instruction:
        "Display these QR codes to your signing device, then scan the signed result",
      qrCodeFrames: this.qrCodeFrames,
      fragmentCount: this.qrCodeFrames.length,
      maxFragmentLength: this.maxFragmentLength,
      psbtSize: this.psbt.length,
    };

    return requestData;
  }

  /**
   * Parses a signed PSBT and extracts signatures
   * @param {string} signedPSBTData - The signed PSBT data (base64 or UR format)
   * @returns {Object} Object with signatures property for test framework compatibility
   */
  parse(signedPSBTData: string): { signatures: string[] } {
    try {
      // Reset decoder for new scan
      this.decoder.reset();

      // If it's a UR format (multi-part QR), process with decoder
      if (signedPSBTData.toLowerCase().startsWith("ur:")) {
        this.decoder.receivePart(signedPSBTData);

        if (!this.decoder.isComplete()) {
          throw new Error(
            "Incomplete PSBT data received - scan all QR code parts"
          );
        }

        const psbtData = this.decoder.getDecodedPSBT();
        if (!psbtData) {
          throw new Error("Failed to decode PSBT data");
        }

        const signatures = this.extractSignatures(psbtData);
        // Find the first non-empty signature array (the one that was actually signed)
        const signatureArrays = Object.values(signatures);
        const actualSignatures =
          signatureArrays.find((sigArray) => sigArray && sigArray.length > 0) ||
          [];
        const result = { signatures: actualSignatures };
        return result;
      } else {
        // If it's base64 PSBT, process directly
        const signatures = this.extractSignatures(signedPSBTData);
        // Find the first non-empty signature array (the one that was actually signed)
        const signatureArrays = Object.values(signatures);
        const actualSignatures =
          signatureArrays.find((sigArray) => sigArray && sigArray.length > 0) ||
          [];
        const result = { signatures: actualSignatures };
        return result;
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      throw new Error(`Error parsing signed PSBT: ${errorMessage}`);
    }
  }

  /**
   * Extracts signatures from a base64 PSBT
   * @private
   * @param {string} psbtBase64 - Base64 encoded PSBT
   * @returns {Object} Object mapping public keys to signature arrays (same format as parseSignaturesFromPSBT)
   */
  private extractSignatures(psbtBase64: string): {
    [publicKey: string]: string[];
  } {
    try {
      if (!psbtBase64 || psbtBase64.length === 0) {
        throw new Error("No signatures found");
      }

      // Convert base64 PSBT to hex for parseSignaturesFromPSBT
      const psbtHex = Buffer.from(psbtBase64, "base64").toString("hex");
      const signatures = parseSignaturesFromPSBT(psbtHex);
      if (!signatures) {
        throw new Error("No signatures found in PSBT");
      }

      // Return the signatures object directly (same format as HERMIT)
      return signatures;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to extract signatures: ${errorMessage}`);
    }
  }

  /**
   * Gets the encoded QR code frames for the transaction
   * @returns {string[]} Array of QR code frame strings
   */
  getQRCodeFrames(): string[] {
    if (this.qrCodeFrames.length === 0) {
      this.qrCodeFrames = this.encoder.encodePSBT();
    }
    return this.qrCodeFrames;
  }
}
