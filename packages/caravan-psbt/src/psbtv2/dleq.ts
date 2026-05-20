import { randomBytes } from "crypto";

import { secp256k1 } from "@noble/curves/secp256k1";
import { sha256 } from "@noble/hashes/sha256";

const N = secp256k1.CURVE.n;
const G = secp256k1.ProjectivePoint.BASE;
const ZERO = secp256k1.ProjectivePoint.ZERO;

function taggedHash(tag: string, msg: Buffer): Buffer {
  const tagHash = Buffer.from(sha256(Buffer.from(tag, "utf8")));
  return Buffer.from(sha256(Buffer.concat([tagHash, tagHash, msg])));
}

function bytesToBigInt(bytes: Buffer): bigint {
  if (bytes.length === 0) return 0n;
  return BigInt(`0x${bytes.toString("hex")}`);
}

function bigIntTo32Bytes(n: bigint): Buffer {
  if (n < 0n || n >= 1n << 256n) {
    throw new Error("Integer does not fit in 32 bytes.");
  }

  return Buffer.from(n.toString(16).padStart(64, "0"), "hex");
}

function modN(n: bigint): bigint {
  const r = n % N;
  return r >= 0n ? r : r + N;
}

function scalarFrom32Bytes(bytes: Buffer, context: string): bigint {
  if (bytes.length !== 32) {
    throw new Error(
      `${context}: expected 32-byte scalar, got ${bytes.length}.`,
    );
  }

  const scalar = bytesToBigInt(bytes);

  if (scalar === 0n || scalar >= N) {
    throw new Error(`${context}: scalar must be in range [1, n - 1].`);
  }

  return scalar;
}

function assertMessage(message?: Buffer): Buffer {
  if (!message) return Buffer.alloc(0);

  if (message.length !== 32) {
    throw new Error(`BIP374 message must be 32 bytes, got ${message.length}.`);
  }

  return message;
}

function assertAuxRand(auxRand: Buffer): void {
  if (auxRand.length !== 32) {
    throw new Error(`BIP374 auxRand must be 32 bytes, got ${auxRand.length}.`);
  }
}

function xor32(a: Buffer, b: Buffer): Buffer {
  if (a.length !== 32 || b.length !== 32) {
    throw new Error("xor32 requires two 32-byte buffers.");
  }

  const out = Buffer.alloc(32);

  for (let i = 0; i < 32; i++) {
    out[i] = a[i] ^ b[i];
  }

  return out;
}

function parsePoint(bytes: Buffer, context: string): typeof G {
  try {
    const point = secp256k1.ProjectivePoint.fromHex(bytes);

    if (point.equals(ZERO)) {
      throw new Error("point at infinity");
    }

    return point;
  } catch (e) {
    throw new Error(`${context}: invalid secp256k1 point.`);
  }
}

function pointToCompressedBytes(point: typeof G): Buffer {
  if (point.equals(ZERO)) {
    throw new Error("Cannot serialize point at infinity.");
  }

  return Buffer.from(point.toRawBytes(true));
}

function multiplyPoint(point: typeof G, scalar: bigint): typeof G {
  const k = modN(scalar);

  if (k === 0n) {
    return ZERO;
  }

  return point.multiply(k);
}

function multiplyGenerator(scalar: bigint): typeof G {
  const k = modN(scalar);

  if (k === 0n) {
    return ZERO;
  }

  return G.multiply(k);
}

/**
 * Computes scalar * compressedPoint and returns a compressed point.
 */
export function multiplyCompressedPoint(
  compressedPoint: Buffer,
  scalarBytes: Buffer,
): Buffer {
  const scalar = scalarFrom32Bytes(scalarBytes, "multiplyCompressedPoint");
  const point = parsePoint(compressedPoint, "multiplyCompressedPoint point");
  const result = multiplyPoint(point, scalar);

  if (result.equals(ZERO)) {
    throw new Error("multiplyCompressedPoint produced point at infinity.");
  }

  return pointToCompressedBytes(result);
}

export function generateDLEQProof({
  secret,
  basePoint,
  auxRand = randomBytes(32),
  message,
}: {
  secret: Buffer;
  basePoint: Buffer;
  auxRand?: Buffer;
  message?: Buffer;
}): Buffer {
  const a = scalarFrom32Bytes(secret, "BIP374 secret");
  const B = parsePoint(basePoint, "BIP374 basePoint");
  const m = assertMessage(message);

  assertAuxRand(auxRand);

  const A = multiplyGenerator(a);
  const C = multiplyPoint(B, a);

  if (A.equals(ZERO) || C.equals(ZERO)) {
    throw new Error("BIP374 proof generation produced point at infinity.");
  }

  const t = xor32(secret, taggedHash("BIP0374/aux", auxRand));

  const rand = taggedHash(
    "BIP0374/nonce",
    Buffer.concat([t, pointToCompressedBytes(A), pointToCompressedBytes(C), m]),
  );

  const k = modN(bytesToBigInt(rand));

  if (k === 0n) {
    throw new Error("BIP374 nonce produced zero scalar.");
  }

  const R1 = multiplyGenerator(k);
  const R2 = multiplyPoint(B, k);

  if (R1.equals(ZERO) || R2.equals(ZERO)) {
    throw new Error("BIP374 nonce produced point at infinity.");
  }

  const eBytes = taggedHash(
    "BIP0374/challenge",
    Buffer.concat([
      pointToCompressedBytes(A),
      pointToCompressedBytes(B),
      pointToCompressedBytes(C),
      pointToCompressedBytes(G),
      pointToCompressedBytes(R1),
      pointToCompressedBytes(R2),
      m,
    ]),
  );

  const e = bytesToBigInt(eBytes);
  const s = modN(k + modN(e) * a);
  const proof = Buffer.concat([eBytes, bigIntTo32Bytes(s)]);

  if (
    !verifyDLEQProof({
      publicKey: pointToCompressedBytes(A),
      basePoint,
      result: pointToCompressedBytes(C),
      proof,
      message,
    })
  ) {
    throw new Error("Generated BIP374 DLEQ proof did not verify.");
  }

  return proof;
}

export function verifyDLEQProof({
  publicKey,
  basePoint,
  result,
  proof,
  message,
}: {
  publicKey: Buffer;
  basePoint: Buffer;
  result: Buffer;
  proof: Buffer;
  message?: Buffer;
}): boolean {
  if (proof.length !== 64) {
    return false;
  }

  let A: typeof G;
  let B: typeof G;
  let C: typeof G;

  try {
    A = parsePoint(publicKey, "BIP374 publicKey");
    B = parsePoint(basePoint, "BIP374 basePoint");
    C = parsePoint(result, "BIP374 result");
  } catch {
    return false;
  }

  const eBytes = proof.subarray(0, 32);
  const sBytes = proof.subarray(32, 64);

  const e = bytesToBigInt(eBytes);
  const s = bytesToBigInt(sBytes);

  // BIP374 bounds s, but not e. e is the full 32-byte challenge hash integer.
  if (s >= N) {
    return false;
  }

  let m: Buffer;

  try {
    m = assertMessage(message);
  } catch {
    return false;
  }

  const eA = multiplyPoint(A, e);
  const eC = multiplyPoint(C, e);

  const R1 = multiplyGenerator(s).add(eA.negate());
  const R2 = multiplyPoint(B, s).add(eC.negate());

  if (R1.equals(ZERO) || R2.equals(ZERO)) {
    return false;
  }

  const expectedE = taggedHash(
    "BIP0374/challenge",
    Buffer.concat([
      pointToCompressedBytes(A),
      pointToCompressedBytes(B),
      pointToCompressedBytes(C),
      pointToCompressedBytes(G),
      pointToCompressedBytes(R1),
      pointToCompressedBytes(R2),
      m,
    ]),
  );

  return expectedE.equals(eBytes);
}
