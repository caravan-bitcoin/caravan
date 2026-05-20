import { randomBytes } from "crypto";

import { secp256k1 } from "@noble/curves/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToNumberBE, numberToBytesBE } from "@noble/curves/abstract/utils";
import { mod } from "@noble/curves/abstract/modular";

export type ProjectivePoint = InstanceType<typeof secp256k1.ProjectivePoint>;

const N = secp256k1.CURVE.n;
const G = secp256k1.ProjectivePoint.BASE;
const ZERO = secp256k1.ProjectivePoint.ZERO;

function taggedHash(tag: string, msg: Buffer): Buffer {
  const tagHash = Buffer.from(sha256(Buffer.from(tag, "utf8")));
  return Buffer.from(sha256(Buffer.concat([tagHash, tagHash, msg])));
}

function scalarFromPrivateKey(bytes: Buffer, context: string): bigint {
  if (!secp256k1.utils.isValidPrivateKey(bytes)) {
    throw new Error(`${context}: invalid secp256k1 scalar.`);
  }

  return bytesToNumberBE(bytes);
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

function pointFromCompressed(bytes: Buffer): ProjectivePoint {
  return secp256k1.ProjectivePoint.fromHex(bytes);
}

function pointToCompressedBytes(point: typeof G): Buffer {
  if (point.equals(ZERO)) {
    throw new Error("Cannot serialize point at infinity.");
  }

  return Buffer.from(point.toRawBytes(true));
}

/**
 * Computes scalar * compressedPoint and returns a compressed point.
 */
export function multiplyCompressedPoint(
  compressedPoint: Buffer,
  scalarBytes: Buffer,
): Buffer {
  const scalar = scalarFromPrivateKey(
    scalarBytes,
    "multiplyCompressedPoint scalar",
  );

  const result =
    secp256k1.ProjectivePoint.fromHex(compressedPoint).multiply(scalar);

  if (result.equals(ZERO)) {
    throw new Error("multiplyCompressedPoint produced point at infinity.");
  }

  return Buffer.from(result.toRawBytes(true));
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
  const a = scalarFromPrivateKey(secret, "BIP374 secret");
  const B = pointFromCompressed(basePoint);
  const m = assertMessage(message);

  assertAuxRand(auxRand);

  const A = G.multiply(a);
  const C = B.multiply(a);

  if (A.equals(ZERO) || C.equals(ZERO)) {
    throw new Error("BIP374 proof generation produced point at infinity.");
  }

  const ABytes = Buffer.from(A.toRawBytes(true));
  const BBytes = Buffer.from(B.toRawBytes(true));
  const CBytes = Buffer.from(C.toRawBytes(true));

  const t = xor32(secret, taggedHash("BIP0374/aux", auxRand));

  const rand = taggedHash(
    "BIP0374/nonce",
    Buffer.concat([t, ABytes, CBytes, m]),
  );

  const k = mod(bytesToNumberBE(rand), N);

  if (k === 0n) {
    throw new Error("BIP374 nonce produced zero scalar.");
  }

  const R1 = G.multiply(k);
  const R2 = B.multiply(k);

  if (R1.equals(ZERO) || R2.equals(ZERO)) {
    throw new Error("BIP374 nonce produced point at infinity.");
  }

  const R1Bytes = Buffer.from(R1.toRawBytes(true));
  const R2Bytes = Buffer.from(R2.toRawBytes(true));

  const eBytes = taggedHash(
    "BIP0374/challenge",
    Buffer.concat([
      ABytes,
      BBytes,
      CBytes,
      Buffer.from(G.toRawBytes(true)),
      R1Bytes,
      R2Bytes,
      m,
    ]),
  );

  const e = bytesToNumberBE(eBytes);
  const s = mod(k + mod(e, N) * a, N);

  const proof = Buffer.concat([eBytes, Buffer.from(numberToBytesBE(s, 32))]);

  if (
    !verifyDLEQProof({
      publicKey: ABytes,
      basePoint,
      result: CBytes,
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

  let A: ProjectivePoint;
  let B: ProjectivePoint;
  let C: ProjectivePoint;
  try {
    A = pointFromCompressed(publicKey);
    B = pointFromCompressed(basePoint);
    C = pointFromCompressed(result);
  } catch {
    return false;
  }

  const eBytes = proof.subarray(0, 32);
  const sBytes = proof.subarray(32, 64);

  const e = bytesToNumberBE(eBytes);
  const s = bytesToNumberBE(sBytes);

  if (s >= N) {
    return false;
  }

  const eReduced = mod(e, N);

  const R1 = G.multiply(s).add(A.multiply(eReduced).negate());
  const R2 = B.multiply(s).add(C.multiply(eReduced).negate());

  if (R1.equals(ZERO) || R2.equals(ZERO)) {
    return false;
  }

  let m: Buffer;

  try {
    m = assertMessage(message);
  } catch {
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
