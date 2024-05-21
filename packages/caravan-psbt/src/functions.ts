import { validateHex, validBase64 } from "@caravan/bitcoin";

/**
 * Ensure base64 and hex strings are a buffer. No-op if already a buffer.
 */
export function bufferize(psbt: string | Buffer): Buffer {
  if (Buffer.isBuffer(psbt)) {
    return psbt;
  }

  if (typeof psbt === "string") {
    if (validateHex(psbt) === "") {
      return Buffer.from(psbt, "hex");
    }

    if (validBase64(psbt)) {
      return Buffer.from(psbt, "base64");
    }
  }

  throw Error("Input cannot be bufferized.");
}
