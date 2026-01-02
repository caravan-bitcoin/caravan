/**
 * @module bcur2
 * This module provides functionality for encoding Bitcoin transaction data into BCUR2 (Bitcoin URIs) QR codes,
 * specifically focused on PSBT (Partially Signed Bitcoin Transaction) format used by hardware wallets.
 */

import { Bytes, CryptoPSBT, RegistryItem } from "@keystonehq/bc-ur-registry";

/**
 * Factory function type for creating RegistryItem instances
 */
export type RegistryItemFactory = (buffer: Buffer) => RegistryItem;

/**
 * Class for encoding Bitcoin transaction data into BCUR2 QR codes.
 * Supports encoding of:
 * - PSBT: Partially Signed Bitcoin Transactions in base64 format
 */
export class BCUR2Encoder {
  private _data: string;

  private _buffer: Buffer;

  private _maxFragmentLength: number;

  private registryItemFactory: RegistryItemFactory;

  /**
   * Creates a new BCUR2 encoder instance
   * @param data - The data to encode (e.g., base64 PSBT string)
   * @param maxFragmentLength - Maximum length of each QR code fragment (default: 100)
   * @param registryFactory - Factory function for creating RegistryItem instances
   */
  constructor(
    data: string,
    maxFragmentLength: number = 100,
    registyType: "crypto-psbt" | "bytes" = "crypto-psbt",
  ) {
    this._data = data;
    this._maxFragmentLength = maxFragmentLength;
    switch (registyType) {
      case "crypto-psbt":
        this._buffer = Buffer.from(data.trim(), "base64");
        this.registryItemFactory = (buffer) => new CryptoPSBT(buffer);
        break;
      case "bytes":
        this._buffer = Buffer.from(data.trim(), "utf8");
        this.registryItemFactory = (buffer) => new Bytes(buffer);
        break;
      default:
        throw new Error(`Unsupported registry type: ${registyType}`);
    }
  }

  /**
   * Encodes a PSBT (Partially Signed Bitcoin Transaction) into BCUR2 QR code fragments
   * @returns Array of QR code fragments as strings
   * @throws Error if encoding fails
   */
  encodePSBT(): string[] {
    try {
      return this.qrFragments;
    } catch (err: any) {
      throw new Error(`Failed to encode PSBT: ${err.message}`);
    }
  }

  /**
   * Sets new data to encode
   */
  set data(data: string) {
    this._data = data;
  }

  /**
   * Gets the current data
   */
  get data(): string {
    return this._data;
  }

  /**
   * Sets the maximum fragment length for QR codes
   */
  set maxFragmentLength(length: number) {
    this._maxFragmentLength = length;
  }

  /**
   * Gets the current maximum fragment length
   */
  get maxFragmentLength(): number {
    return this._maxFragmentLength;
  }

  private get encoder(): ReturnType<RegistryItem["toUREncoder"]> {
    return this.registryItemFactory(this._buffer).toUREncoder(
      this._maxFragmentLength,
    );
  }

  get qrFragments(): string[] {
    return this.encoder.encodeWhole();
  }

  /**
   * Estimates the number of QR code fragments that will be generated
   * @returns Estimated number of fragments
   */
  estimateFragmentCount(): number {
    try {
      return this.encoder.fragmentsLength;
    } catch (err: any) {
      throw new Error(`Failed to estimate fragment count: ${err.message}`);
    }
  }
}
