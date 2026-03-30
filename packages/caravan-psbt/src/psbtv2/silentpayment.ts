/**
 * @file BIP352 / BIP375 Silent Payment cryptographic primitives.
 *
 * Pure functions with no PSBT state. Imported by {@link PsbtV2} for use in
 * {@link PsbtV2.computeSilentPaymentOutputScripts}.
 *
 * @see {@link https://github.com/bitcoin/bips/blob/master/bip-0352.mediawiki BIP352}
 * @see {@link https://github.com/bitcoin/bips/blob/master/bip-0375.mediawiki BIP375}
 */

import { secp256k1 } from "@noble/curves/secp256k1";
import { createHash } from "crypto";
import { script } from "bitcoinjs-lib-v6";
import { xOnlyPointAddTweak } from "src/noble-ecc";

const CURVE_ORDER = secp256k1.CURVE.n;
const { OPS } = script;

// ── Internal types ─────────────────────────────────────────────────────────

export type ProjectivePoint = InstanceType<typeof secp256k1.ProjectivePoint>;

// ── Public types ───────────────────────────────────────────────────────────

/**
 * A single silent payment output entry within a scan-key group, used to
 * determine recipient ordering and k-value assignment per BIP375.
 */
export interface SPOutputEntry {
  /** Index of this output in the PSBT output maps. */
  outputIndex: number;
  /** 33-byte compressed scan public key. */
  bscan: Buffer;
  /** 33-byte compressed spend public key. */
  bspend: Buffer;
}

/**
 * Input descriptor passed to {@link eligibleIndices}. One entry per input,
 * in original index order.
 */
export interface SPInputDescriptor {
  /**
   * Raw `PSBT_IN_WITNESS_UTXO` value for this input, or `null` if the field
   * is absent (legacy P2PKH / P2SH-P2WPKH inputs).
   *
   * Format: `amount(8) || scriptLen(varint) || script`.
   */
  witnessUtxo: Buffer | null;
}

// ── Field validators ───────────────────────────────────────────────────────
// Called from both field setters in PsbtV2 and validateSilentPayments().

/**
 * Asserts that a scan public key is a valid 33-byte compressed point.
 *
 * @param bscan - Candidate scan public key buffer.
 * @throws {Error} If `bscan` is not exactly 33 bytes.
 */
export function assertValidBscan(bscan: Buffer): void {
  if (bscan.length !== 33) {
    throw new Error(
      `bscan must be a 33-byte compressed pubkey, got ${bscan.length}`,
    );
  }
}

/**
 * Asserts that an ECDH share is a valid 33-byte compressed EC point.
 *
 * @param share - Candidate ECDH share buffer.
 * @throws {Error} If `share` is not exactly 33 bytes.
 */
export function assertValidECDHShare(share: Buffer): void {
  if (share.length !== 33) {
    throw new Error(
      `ECDH share must be a 33-byte compressed EC point, got ${share.length}`,
    );
  }
}

/**
 * Asserts that a DLEQ proof is exactly 64 bytes.
 *
 * @param proof - Candidate DLEQ proof buffer.
 * @throws {Error} If `proof` is not exactly 64 bytes.
 */
export function assertValidDLEQProof(proof: Buffer): void {
  if (proof.length !== 64) {
    throw new Error(`DLEQ proof must be 64 bytes, got ${proof.length}`);
  }
}

/**
 * Asserts that a `PSBT_OUT_SP_V0_INFO` value is exactly 66 bytes
 * (`bscan(33) || bspend(33)`).
 *
 * @param raw - Candidate SP V0 info buffer.
 * @param outputIndex - Output index for error context.
 * @throws {Error} If `raw` is not exactly 66 bytes.
 */
export function assertValidSPV0Info(raw: Buffer, outputIndex: number): void {
  if (raw.length !== 66) {
    throw new Error(
      `PSBT_OUT_SP_V0_INFO at output ${outputIndex}: ` +
        `expected 66 bytes, got ${raw.length}`,
    );
  }
}

export function assertValidKLabel(k: number, outputIndex: number): void {
  if (!Number.isInteger(k) || k < 0 || k > 0xffffffff) {
    throw new Error(
      `Silent payment recipient index k is invalid at output ${outputIndex}: ${k}`,
    );
  }
}

function assertValidScalar(value: bigint, name: string): void {
  if (value === 0n || value >= CURVE_ORDER) {
    throw new Error(`${name} is not a valid secp256k1 scalar`);
  }
}

// ── Tagged hash ────────────────────────────────────────────────────────────

/**
 * Computes a BIP340 tagged hash.
 *
 * ```
 * taggedHash(tag, data) = SHA256(SHA256(tag) || SHA256(tag) || data)
 * ```
 *
 * @param tag - ASCII tag string, e.g. `"BIP0352/Inputs"`.
 * @param data - Arbitrary data to hash.
 * @returns 32-byte hash buffer.
 */
export function bip352TaggedHash(tag: string, data: Buffer): Buffer {
  const tagHash = createHash("sha256").update(tag).digest();
  return createHash("sha256")
    .update(tagHash)
    .update(tagHash)
    .update(data)
    .digest();
}

// ── Eligible input indices ─────────────────────────────────────────────────

/**
 * Determines which transaction inputs are eligible for silent payment ECDH
 * derivation per BIP352.
 *
 * Eligible input types:
 * - P2TR (Taproot keypath) — `OP_1 <32-byte x-only key>`
 * - P2WPKH — `OP_0 <20-byte hash>`
 * - P2SH-P2WPKH / P2PKH — no witness UTXO present
 *
 * Ineligible input types:
 * - P2WSH — `OP_0 <32-byte hash>` (multisig, multiple keys)
 * - Segwit v2+ — not permitted alongside SP outputs per BIP375
 *
 * @param inputs - One entry per input, in original index order. The array
 *   must be complete and unfiltered so that returned indices correctly
 *   correspond to positions in the original input list.
 * @returns Array of input indices eligible for SP ECDH derivation.
 */
export function eligibleIndices(inputs: SPInputDescriptor[]): number[] {
  const eligible: number[] = [];

  for (let i = 0; i < inputs.length; i++) {
    const { witnessUtxo } = inputs[i];

    if (!witnessUtxo) {
      // No witness UTXO — legacy input (P2PKH / P2SH-P2WPKH), eligible
      eligible.push(i);
      continue;
    }

    // witnessUtxo format: 8-byte amount || varint scriptLen || script
    const scriptLen = witnessUtxo[8];
    const inputScript = witnessUtxo.slice(9, 9 + scriptLen);
    const version = inputScript[0];

    if (version === OPS.OP_1 && inputScript.length === 34) {
      // P2TR (OP_1 + 32-byte x-only key) — eligible
      eligible.push(i);
    } else if (version === OPS.OP_0 && inputScript.length === 22) {
      // P2WPKH (OP_0 + 20-byte hash) — eligible
      eligible.push(i);
    } else if (version === OPS.OP_0 && inputScript.length === 34) {
      // P2WSH (OP_0 + 32-byte hash) — NOT eligible (multisig)
      continue;
    } else if (version >= OPS.OP_2) {
      // Segwit v2+ — NOT eligible per BIP375
      continue;
    } else {
      // Anything else (P2SH-P2WPKH wrapped, P2PKH) — eligible
      eligible.push(i);
    }
  }

  return eligible;
}

// ── ECDH share accumulation ────────────────────────────────────────────────

/**
 * Sums a list of 33-byte compressed EC points (per-input ECDH shares) into a
 * single point. Used when a global ECDH share is not available and per-input
 * shares must be combined before output script derivation.
 *
 * @param shares - Array of 33-byte compressed EC point buffers.
 * @returns The accumulated projective point.
 * @throws {Error} If `shares` is empty.
 */
export function sumECDHShares(shares: Buffer[]): ProjectivePoint {
  if (shares.length === 0) {
    throw new Error("Cannot sum zero ECDH shares.");
  }
  let sum: ProjectivePoint | null = null;
  for (const buf of shares) {
    const point = secp256k1.ProjectivePoint.fromHex(buf);
    sum = sum ? sum.add(point) : point;
  }
  return sum!;
}

// ── Input hash ────────────────────────────────────────────────────────────

/**
 * Computes the BIP352 input hash used to bind the silent payment derivation
 * to the specific set of transaction inputs.
 *
 * ```
 * inputHash = taggedHash("BIP0352/Inputs", outpointL || A)
 * ```
 *
 * Where `outpointL` is the lexicographically smallest outpoint and `A` is
 * the sum of compressed public keys of all eligible inputs.
 *
 * @param outpoints - Array of 36-byte buffers, each `txid(32 LE) || vout(4 LE)`.
 * @param combinedPubkey - 33-byte compressed sum of eligible input public keys.
 * @returns 32-byte input hash buffer.
 * @throws {Error} If `outpoints` is empty.
 */
export function computeInputHash(
  outpoints: Buffer[],
  combinedPubkey: Buffer,
): Buffer {
  if (outpoints.length === 0) {
    throw new Error("At least one outpoint is required to compute inputHash.");
  }
  const sorted = [...outpoints].sort(Buffer.compare);
  const data = Buffer.concat([sorted[0], combinedPubkey]);
  return bip352TaggedHash("BIP0352/Inputs", data);
}

// ── Output script derivation ───────────────────────────────────────────────

/**
 * Derives the taproot (P2TR) output script for a single silent payment
 * recipient within a scan-key group.
 *
 * Per BIP352:
 * ```
 * ecdhSecret   = inputHash · ecdhShare
 * tweak_k      = taggedHash("BIP0352/SharedSecret", ecdhSecret_compressed || k_be32)
 * Pk           = Bspend + tweak_k · G
 * outputScript = OP_1 <0x20> <x-only(Pk)>
 * ```
 *
 * @param ecdhShare - 33-byte compressed EC point `C = a·Bscan`, where `a` is
 *   the sum of eligible input private keys (global share) or a single input's
 *   private key (per-input share).
 * @param inputHash - 32-byte scalar produced by {@link computeInputHash}.
 * @param bspend - 33-byte compressed spend public key from the recipient's
 *   silent payment address.
 * @param k - Zero-based recipient index within the scan-key group. Increments
 *   for each recipient sharing the same `Bscan`.
 * @returns 34-byte P2TR output script: `OP_1 <0x20> <32-byte x-only pubkey>`.
 * @throws {Error} If the tweak produces an invalid point.
 */
export function deriveSilentPaymentOutput(
  ecdhShare: Buffer,
  inputHash: Buffer,
  bspend: Buffer,
  k: number,
): Buffer {
  // ecdhSecret = inputHash · ecdhShare
  // Fn.fromBytes handles modular reduction internally — no manual BigInt needed.
  const inputHashScalar = secp256k1.ProjectivePoint.Fn.fromBytes(inputHash);
  const ecdhSecretPoint =
    secp256k1.ProjectivePoint.fromHex(ecdhShare).multiply(inputHashScalar);
  const ecdhSecretBytes = Buffer.from(ecdhSecretPoint.toRawBytes(true));

  // tweak_k = taggedHash("BIP0352/SharedSecret", ecdhSecret_compressed || k_be32)
  const kBuf = Buffer.allocUnsafe(4);
  kBuf.writeUInt32BE(k, 0);
  const tweak = bip352TaggedHash(
    "BIP0352/SharedSecret",
    Buffer.concat([ecdhSecretBytes, kBuf]),
  );

  // Pk = Bspend + tweak·G
  // xOnlyPointAddTweak expects an x-only (32-byte) pubkey — strip the 02/03 prefix.
  // It is already tested against BIP341 vectors in noble-ecc.test.ts.
  const bspendXOnly = bspend.slice(1);
  const tweakResult = xOnlyPointAddTweak(bspendXOnly, tweak);
  if (!tweakResult) {
    throw new Error(
      "Silent payment output derivation failed: invalid tweak result.",
    );
  }

  // P2TR output script: OP_1 <push 32 bytes> <x-only pubkey>
  // THIRTY_TWO_BYTE_PUSH_LENGTH is a raw data push length, not an opcode.
  const THIRTY_TWO_BYTE_PUSH_LENGTH = 0x20;
  return Buffer.concat([
    Buffer.from([OPS.OP_1, THIRTY_TWO_BYTE_PUSH_LENGTH]),
    Buffer.from(tweakResult.xOnlyPubkey),
  ]);
}
