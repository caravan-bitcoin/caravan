/**
 * Provides classes for encoding & decoding data using the Blockchain
 * Commons UR (BC-UR) format.
 *
 * The following API classes are implemented:
 *
 * * BCUREncoder
 * * BCURDecoder
 */

import { encodeUR, smartDecodeUR } from "./vendor/bcur";

/**
 * Encoder class for BC UR data.
 *
 * Encodes a hex string as a sequence of UR parts.  Each UR is a string.
 *
 * Designed for use by a calling application which will typically take
 * the resulting strings and display them as a sequence of animated QR
 * codes.
 *
 * @example
 * import {BCUREncoder} from "@caravan/wallets";
 * const hexString = "deadbeef";
 * const encoder = BCUREncoder(hexString);
 * console.log(encoder.parts())
 * // [ "ur:...", "ur:...", ... ]
 *
 *
 */
export class BCUREncoder {
  hexString: string;

  fragmentCapacity: number;

  /**
   * Create a new encoder.
   */
  constructor(hexString: string, fragmentCapacity = 200) {
    this.hexString = hexString;
    this.fragmentCapacity = fragmentCapacity;
  }

  /**
   * Return all UR parts.
   */
  parts(): string[] {
    return encodeUR(this.hexString, this.fragmentCapacity);
  }
}

/**
 * Decoder class for BC UR data.
 *
 * Decodes a hex string from a collection of UR parts.
 *
 * Designed for use by a calling application which is typically
 * in a loop parsing an animated sequence of QR codes.
 *
 * @example
 * import {BCURDecoder} from "@caravan/wallets";
 * const decoder = new BCURDecoder();
 *
 * // Read data until the decoder is complete...
 * while (!decoder.isComplete()) {
 *
 *   // Progress can be fed back to the calling application for visualization in its UI
 *   console.log(decoder.progress());  // {totalParts: 10, partsReceived; 3}
 *
 *   // Application-defined function to obtain a single UR part string.
 *   const part = scanQRCode();
 *   decoder.receivePart(part);
 * }
 *
 * // Check for an error
 * if (decoder.isSuccess()) {
 *
 *   // Data can be passed back to the calling application
 *   console.log(decoder.data()); // "deadbeef"
 *
 * } else {
 *
 *   // Errors can be passed back to the calling application
 *   console.log(decoder.errorMessage());
 * }
 *
 *
 */
export class BCURDecoder {
  // TODO: type these
  error: any;

  summary: ReturnType<typeof smartDecodeUR>;

  constructor() {
    this.summary = {
      success: false,
      current: 0,
      length: 0,
      workloads: [],
      result: "",
    };
    this.error = null;
  }

  /**
   * Reset this decoder.
   *
   * Clears any error message and received parts and returns counts to zero.
   */
  reset() {
    this.summary = {
      success: false,
      current: 0,
      length: 0,
      workloads: [],
      result: "",
    };
    this.error = null;
  }

  /**
   * Receive a new UR part.
   *
   * It's OK to call this method multiple times for the same UR part.
   */
  receivePart(part: string) {
    try {
      const workloads = this.summary.workloads.includes(part)
        ? this.summary.workloads
        : [...this.summary.workloads, part];
      this.summary = smartDecodeUR(workloads);
    } catch (e) {
      this.error = e;
    }
  }

  /**
   * Returns the current progress of this decoder.
   *
   * @example
   * import {BCURDecoder} from "@caravan/wallets";
   * const decoder = BCURDecoder();
   * console.log(decoder.progress())
   * // { totalParts: 0, partsReceived: 0 }
   *
   * decoder.receivePart(part);
   * ...
   * decoder.receivePart(part);
   * ...
   * decoder.receivePart(part);
   * ...
   * console.log(decoder.progress())
   * // { totalParts: 10, partsReceived: 3 }
   *
   */
  progress() {
    const totalParts = this.summary.length;
    const partsReceived = this.summary.current;
    return { totalParts, partsReceived };
  }

  /**
   * Is this decoder complete?
   *
   * Will return `true` if there was an error.
   */
  isComplete() {
    return this.summary.success || Boolean(this.error);
  }

  /**
   * Was this decoder successful?
   *
   * Will return `false` if completed because of an error.
   */
  isSuccess() {
    return this.summary.success;
  }

  /**
   * Returns the decoded data as a hex string.
   */
  data() {
    if (this.isSuccess()) {
      return this.summary.result;
    } else {
      return null;
    }
  }

  /**
   * Returns the error message.
   */
  errorMessage(): string | null {
    if (this.error) {
      return this.error.message;
    } else {
      return null;
    }
  }
}
