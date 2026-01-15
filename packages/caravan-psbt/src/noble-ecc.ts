/**
 * Wrapper around @noble/curves to provide the TinySecp256k1Interface
 * required by bitcoinjs-lib v6's initEccLib.
 *
 * This is a minimal implementation that only includes the methods
 * actually required by bitcoinjs-lib. The full tiny-secp256k1 interface
 * has many more methods, but bitcoinjs-lib v6 only requires:
 * - isXOnlyPoint
 * - xOnlyPointAddTweak
 *
 * Using @noble/curves instead of tiny-secp256k1 because:
 * - Pure JavaScript (no WASM loading issues in browsers)
 * - Small bundle size
 * - Audited implementation
 */

import { secp256k1 } from "@noble/curves/secp256k1";

const CURVE_ORDER = secp256k1.CURVE.n;

/**
 * Interface matching bitcoinjs-lib's TinySecp256k1Interface
 */
export interface XOnlyPointAddTweakResult {
  parity: 0 | 1;
  xOnlyPubkey: Uint8Array;
}

/**
 * Check if a 32-byte buffer is a valid x-only public key (BIP340)
 * An x-only point is valid if:
 * 1. It is exactly 32 bytes
 * 2. The x-coordinate corresponds to a valid point on the secp256k1 curve
 */
export function isXOnlyPoint(p: Uint8Array): boolean {
  if (p.length !== 32) return false;

  try {
    // To check if x is valid, we try to lift it to a point with even y (02 prefix)
    // noble/curves will throw if the x-coordinate doesn't have a valid y on the curve
    const prefixed = new Uint8Array(33);
    prefixed[0] = 0x02; // Assume even y
    prefixed.set(p, 1);
    secp256k1.ProjectivePoint.fromHex(prefixed);
    return true;
  } catch {
    return false;
  }
}

/**
 * Tweak an x-only public key by adding tweak * G
 * Returns the resulting x-only public key and its parity
 */
export function xOnlyPointAddTweak(
  p: Uint8Array,
  tweak: Uint8Array,
): XOnlyPointAddTweakResult | null {
  if (p.length !== 32 || tweak.length !== 32) return null;

  try {
    // Convert tweak bytes to bigint
    const tweakNum = bytesToBigInt(tweak);

    // Tweak must be less than the curve order
    if (tweakNum >= CURVE_ORDER) return null;

    // Lift x-only point to full point (assume even Y per BIP340)
    const prefixed = new Uint8Array(33);
    prefixed[0] = 0x02;
    prefixed.set(p, 1);
    const point = secp256k1.ProjectivePoint.fromHex(prefixed);

    // Handle zero tweak specially - just return the lifted point
    if (tweakNum === 0n) {
      const affine = point.toAffine();
      const parity: 0 | 1 = (affine.y & 1n) === 0n ? 0 : 1;
      const xOnlyPubkey = bigIntToBytes(affine.x, 32);
      return { parity, xOnlyPubkey };
    }

    // Add tweak * G to the point
    const tweakPoint = secp256k1.ProjectivePoint.BASE.multiply(tweakNum);
    const result = point.add(tweakPoint);

    // Check if result is the point at infinity
    if (result.equals(secp256k1.ProjectivePoint.ZERO)) return null;

    // Get the affine coordinates
    const affine = result.toAffine();

    // Determine parity (0 for even Y, 1 for odd Y)
    const parity: 0 | 1 = (affine.y & 1n) === 0n ? 0 : 1;

    // Extract x-coordinate as 32 bytes
    const xOnlyPubkey = bigIntToBytes(affine.x, 32);

    return { parity, xOnlyPubkey };
  } catch {
    return null;
  }
}

/**
 * Convert Uint8Array to bigint (big-endian)
 */
function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = 0n;
  for (const byte of bytes) {
    result = (result << 8n) + BigInt(byte);
  }
  return result;
}

/**
 * Convert bigint to Uint8Array (big-endian, fixed length)
 */
function bigIntToBytes(num: bigint, length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  for (let i = length - 1; i >= 0; i--) {
    bytes[i] = Number(num & 0xffn);
    num >>= 8n;
  }
  return bytes;
}

/**
 * The ecc object to pass to bitcoinjs-lib's initEccLib
 */
export const ecc = {
  isXOnlyPoint,
  xOnlyPointAddTweak,
};

export default ecc;
