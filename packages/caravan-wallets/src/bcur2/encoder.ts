/**
 * @module bcur2
 * This module provides functionality for encoding Bitcoin transaction data into BCUR2 (Bitcoin URIs) QR codes,
 * specifically focused on PSBT (Partially Signed Bitcoin Transaction) format used by hardware wallets.
 */

import { CryptoPSBT } from "@keystonehq/bc-ur-registry";
import { UREncoder } from "@ngraveio/bc-ur";

/**
 * Class for encoding Bitcoin transaction data into BCUR2 QR codes.
 * Supports encoding of:
 * - PSBT: Partially Signed Bitcoin Transactions in base64 format
 */
export class BCUREncoder2 {
  private data: string;

  private maxFragmentLength: number;

  /**
   * Creates a new BCUR2 encoder instance
   * @param data - The data to encode (e.g., base64 PSBT string)
   * @param maxFragmentLength - Maximum length of each QR code fragment (default: 100)
   */
  constructor(data: string, maxFragmentLength: number = 100) {
    this.data = data;
    this.maxFragmentLength = maxFragmentLength;
  }

  /**
   * Encodes a PSBT (Partially Signed Bitcoin Transaction) into BCUR2 QR code fragments
   * @returns Array of QR code fragments as strings
   * @throws Error if encoding fails
   */
  encodePSBT(): string[] {
    try {
      // Convert base64 PSBT to buffer
      const psbtBuffer = Buffer.from(this.data.trim(), "base64");

      // Create CryptoPSBT object
      const cryptoPSBT = new CryptoPSBT(psbtBuffer);
      const ur = cryptoPSBT.toUR();

      // Create encoder with fragment length
      const encoder = new UREncoder(ur, this.maxFragmentLength);

      // Generate all fragments
      const frames: string[] = [];
      for (let i = 0; i < encoder.fragmentsLength; i++) {
        frames.push(encoder.nextPart());
      }

      return frames;
    } catch (err: any) {
      throw new Error(`Failed to encode PSBT: ${err.message}`);
    }
  }

  /**
   * Sets new data to encode
   * @param data - The new data to encode
   */
  setData(data: string): void {
    this.data = data;
  }

  /**
   * Gets the current data
   * @returns The current data string
   */
  getData(): string {
    return this.data;
  }

  /**
   * Sets the maximum fragment length for QR codes
   * @param length - Maximum fragment length
   */
  setMaxFragmentLength(length: number): void {
    this.maxFragmentLength = length;
  }

  /**
   * Gets the current maximum fragment length
   * @returns The current maximum fragment length
   */
  getMaxFragmentLength(): number {
    return this.maxFragmentLength;
  }

  /**
   * Estimates the number of QR code fragments that will be generated
   * @returns Estimated number of fragments
   */
  estimateFragmentCount(): number {
    try {
      const psbtBuffer = Buffer.from(this.data.trim(), "base64");
      const cryptoPSBT = new CryptoPSBT(psbtBuffer);
      const ur = cryptoPSBT.toUR();
      const encoder = new UREncoder(ur, this.maxFragmentLength);
      return encoder.fragmentsLength;
    } catch (err: any) {
      throw new Error(`Failed to estimate fragment count: ${err.message}`);
    }
  }
}
