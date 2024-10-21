import { Buffer } from "buffer";
import crypto from "crypto";
const DEFAULT_MAX = 2 ** 31 - 1;
export const secureRandomInt = (min = 0, max = DEFAULT_MAX): number => {
  if (typeof min !== "number" || typeof max !== "number") {
    throw new TypeError("Arguments must be numbers");
  }

  if (min > max) {
    throw new RangeError("Min should not be greater than max");
  }

  let getCrypto;
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    // Browser environment
    getCrypto = crypto.getRandomValues;
  } else if (typeof crypto.randomFillSync !== "undefined") {
    // Node.js environment
    getCrypto = crypto.randomFillSync;
  } else {
    throw new Error("Crypto not available in this environment");
  }

  const buffer = Buffer.alloc(4);
  getCrypto(buffer);
  const randomValue = buffer.readUInt32BE(0);
  return min + (randomValue % (max - min + 1));
};
