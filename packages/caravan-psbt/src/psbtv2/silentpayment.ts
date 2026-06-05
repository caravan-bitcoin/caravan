/**
 * @file BIP352 / BIP375 Silent Payment cryptographic primitives.
 *
 * Pure functions with no PSBT state. Imported by {@link PsbtV2} for use in
 * {@link PsbtV2.computeSilentPaymentOutputScripts}.
 *
 * @see {@link https://github.com/bitcoin/bips/blob/master/bip-0352.mediawiki BIP352}
 * @see {@link https://github.com/bitcoin/bips/blob/master/bip-0375.mediawiki BIP375}
 */

import { secp256k1, schnorr } from "@noble/curves/secp256k1";
import { createHash } from "crypto";
import { script } from "bitcoinjs-lib-v6";

const CURVE_ORDER = secp256k1.CURVE.n;
const { bytesToNumberBE } = schnorr.utils;
const { OPS } = script;
import { Transaction } from "bitcoinjs-lib-v6";
import {
  generateDLEQProof,
  multiplyCompressedPoint,
  verifyDLEQProof,
  ProjectivePoint,
} from "./dleq";

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
  witnessUtxo: Buffer | null;
  nonWitnessUtxo?: Buffer | null;
  outputIndex?: number | null;
  redeemScript?: Buffer | null;
  tapInternalKey?: string | null; // PSBT_IN_TAP_INTERNAL_KEY, hex
  tapLeafScriptKeys?: string[]; // PSBT_IN_TAP_LEAF_SCRIPT entry keys, hex
}

export type SPInputScriptType =
  | "p2tr"
  | "p2wpkh"
  | "p2wsh"
  | "segwit_v2plus"
  | "p2pkh_or_unknown_legacy"
  | "p2sh_p2wpkh"
  | "ineligible";

export const BIP352_NUMS_H =
  "50929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0";

// ── Field validators ───────────────────────────────────────────────────────
// Called from both field setters in PsbtV2 and validateSilentPayments().

/**
 * Asserts that a scan public key is a valid 33-byte compressed point.
 *
 * @param bscan - Candidate scan public key buffer.
 * @throws {Error} If `bscan` is not exactly 33 bytes.
 */
function assertValidCompressedPoint(value: Buffer, name: string): void {
  if (value.length !== 33) {
    throw new Error(
      `${name} must be a 33-byte compressed pubkey, got ${value.length}`,
    );
  }
  if (value[0] !== 0x02 && value[0] !== 0x03) {
    throw new Error(
      `${name} must use compressed secp256k1 prefix 0x02 or 0x03`,
    );
  }
  secp256k1.ProjectivePoint.fromHex(value);
}

export function assertValidBscan(bscan: Buffer): void {
  assertValidCompressedPoint(bscan, "bscan");
}

export function parseSilentPaymentScanKeyData(
  key: string,
  keyType: string,
  context: string,
): Buffer {
  const scanKey = key.slice(keyType.length);
  if (!/^[0-9a-fA-F]+$/.test(scanKey)) {
    throw new Error(`${context} scan keydata must be hex encoded.`);
  }
  const bscan = Buffer.from(scanKey, "hex");
  assertValidBscan(bscan);
  return bscan;
}

export function scanKeyHexFromBIP375Key(
  key: string,
  keyType: string,
  context: string,
): string {
  return parseSilentPaymentScanKeyData(key, keyType, context).toString("hex");
}

/**
 * Asserts that a spend public key is a valid 33-byte compressed point.
 *
 * @param bspend - Candidate scan public key buffer.
 * @throws {Error} If `bspend` is not exactly 33 bytes.
 */
export function assertValidBspend(bspend: Buffer): void {
  assertValidCompressedPoint(bspend, "bspend");
}

/**
 * Asserts that an ECDH share is a valid 33-byte compressed EC point.
 *
 * @param share - Candidate ECDH share buffer.
 * @throws {Error} If `share` is not exactly 33 bytes.
 */
export function assertValidECDHShare(share: Buffer): void {
  assertValidCompressedPoint(share, "ECDH share");
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
  assertValidBscan(raw.subarray(0, 33));
  assertValidBspend(raw.subarray(33, 66));
}

export function assertValidLabel(m: number, outputIndex: number): void {
  if (!Number.isInteger(m) || m < 0 || m > 0xffffffff) {
    throw new Error(
      `Silent payment label m is invalid at output ${outputIndex}: ${m}`,
    );
  }
}

export function assertValidOutputK(k: number, outputIndex: number): void {
  if (!Number.isInteger(k) || k < 0 || k > 2323) {
    throw new Error(
      `Silent payment recipient index should be 0 < k < 2323 (Kmax) but was at output ${outputIndex}: ${k}`,
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

function readWitnessUtxoScript(witnessUtxo: Buffer): Buffer {
  if (witnessUtxo.length < 9) return Buffer.alloc(0);
  const scriptLen = witnessUtxo[8];
  return witnessUtxo.subarray(9, 9 + scriptLen);
}

function readNonWitnessUtxoScript(
  nonWitnessUtxo?: Buffer | null,
  outputIndex?: number | null,
): Buffer | null {
  if (!nonWitnessUtxo || outputIndex === null || outputIndex === undefined) {
    return null;
  }

  const tx = Transaction.fromBuffer(nonWitnessUtxo);
  return tx.outs[outputIndex]?.script ?? null;
}

export function classifyWitnessScript(scriptPubKey: Buffer): SPInputScriptType {
  if (
    scriptPubKey.length === 34 &&
    scriptPubKey[0] === OPS.OP_1 &&
    scriptPubKey[1] === 0x20
  ) {
    return "p2tr";
  }
  if (
    scriptPubKey.length === 22 &&
    scriptPubKey[0] === OPS.OP_0 &&
    scriptPubKey[1] === 0x14
  ) {
    return "p2wpkh";
  }
  if (
    scriptPubKey.length === 34 &&
    scriptPubKey[0] === OPS.OP_0 &&
    scriptPubKey[1] === 0x20
  ) {
    return "p2wsh";
  }
  if (
    scriptPubKey.length >= 4 &&
    scriptPubKey[0] >= OPS.OP_2 &&
    scriptPubKey[0] <= OPS.OP_16
  ) {
    return "segwit_v2plus";
  }
  if (
    scriptPubKey.length === 25 &&
    scriptPubKey[0] === OPS.OP_DUP &&
    scriptPubKey[1] === OPS.OP_HASH160 &&
    scriptPubKey[2] === 0x14 &&
    scriptPubKey[23] === OPS.OP_EQUALVERIFY &&
    scriptPubKey[24] === OPS.OP_CHECKSIG
  ) {
    return "p2pkh_or_unknown_legacy";
  }
  if (
    scriptPubKey.length === 23 &&
    scriptPubKey[0] === OPS.OP_HASH160 &&
    scriptPubKey[1] === 0x14 &&
    scriptPubKey[22] === OPS.OP_EQUAL
  ) {
    return "ineligible";
  }
  return "ineligible";
}

export function classifyInputDescriptor(
  input: SPInputDescriptor,
): SPInputScriptType {
  const script = input.witnessUtxo
    ? readWitnessUtxoScript(input.witnessUtxo)
    : readNonWitnessUtxoScript(input.nonWitnessUtxo, input.outputIndex);

  if (!script) {
    return "ineligible";
  }

  const scriptType = classifyWitnessScript(script);

  if (scriptType === "p2sh_p2wpkh") {
    return scriptType;
  }

  if (
    script.length === 23 &&
    script[0] === OPS.OP_HASH160 &&
    script[1] === 0x14 &&
    script[22] === OPS.OP_EQUAL
  ) {
    if (
      input.redeemScript &&
      classifyWitnessScript(input.redeemScript) === "p2wpkh"
    ) {
      return "p2sh_p2wpkh";
    }

    return "ineligible";
  }

  return scriptType;
}

export function isEligibleInputType(type: SPInputScriptType): boolean {
  return (
    type === "p2tr" ||
    type === "p2wpkh" ||
    type === "p2sh_p2wpkh" ||
    type === "p2pkh_or_unknown_legacy"
  );
}

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
function eligibleIndices(inputs: SPInputDescriptor[]): number[] {
  const eligible: number[] = [];

  for (let i = 0; i < inputs.length; i++) {
    if (isEligibleInputType(classifyInputDescriptor(inputs[i]))) {
      eligible.push(i);
    }
  }

  return eligible;
}

/**
 * A taproot input spent via script path using the BIP352 NUMS point H as its
 * internal key is eligible by type but never contributes an ECDH share.
 */
function isNumsScriptPathSpend(input: SPInputDescriptor): boolean {
  if (input.tapInternalKey === BIP352_NUMS_H) {
    return true;
  }

  return (input.tapLeafScriptKeys ?? []).some((key) => {
    const keydata = Buffer.from(key.slice(2), "hex");

    if (keydata.length < 33) {
      return false;
    }

    return keydata.subarray(1, 33).toString("hex") === BIP352_NUMS_H;
  });
}

/**
 * Eligible inputs that actually contribute an ECDH share — i.e. eligible by
 * type and not a NUMS script-path spend.
 */
export function contributingIndices(inputs: SPInputDescriptor[]): number[] {
  return eligibleIndices(inputs).filter(
    (i) => !isNumsScriptPathSpend(inputs[i]),
  );
}

export function hasSegwitV2PlusInput(inputs: SPInputDescriptor[]): boolean {
  return inputs.some(
    (input) => classifyInputDescriptor(input) === "segwit_v2plus",
  );
}

export function getTaprootOutputKeyFromWitnessUtxo(
  witnessUtxo: Buffer,
): Buffer | null {
  const scriptPubKey = readWitnessUtxoScript(witnessUtxo);
  if (classifyWitnessScript(scriptPubKey) !== "p2tr") return null;
  return Buffer.concat([Buffer.from([0x02]), scriptPubKey.subarray(2, 34)]);
}

function hash160(buffer: Buffer): Buffer {
  const sha = createHash("sha256").update(buffer).digest();
  return createHash("ripemd160").update(sha).digest();
}

/**
 * Returns the public key that should contribute to BIP352 derivation for an
 * input, but only when it is committed by that input's prevout script.
 *
 * `candidatePubkeys` may be sourced from PSBT_IN_BIP32_DERIVATION,
 * PSBT_IN_PARTIAL_SIG, final script witness, or final scriptSig. This helper
 * deliberately treats those as untrusted candidates and validates them against
 * the prevout script before returning one.
 */
export function getSilentPaymentPubkeyFromInputDescriptor(
  input: SPInputDescriptor,
  candidatePubkeys: Buffer[],
): Buffer | null {
  const scriptPubKey = input.witnessUtxo
    ? readWitnessUtxoScript(input.witnessUtxo)
    : readNonWitnessUtxoScript(input.nonWitnessUtxo, input.outputIndex);

  if (!scriptPubKey) {
    return null;
  }

  const scriptType = classifyInputDescriptor(input);

  if (scriptType === "p2tr") {
    return input.witnessUtxo
      ? getTaprootOutputKeyFromWitnessUtxo(input.witnessUtxo)
      : null;
  }

  for (const pubkey of candidatePubkeys) {
    assertValidCompressedPoint(pubkey, "silent payment input pubkey");

    const pubkeyHash = hash160(pubkey);

    if (scriptType === "p2wpkh") {
      const witnessProgram = scriptPubKey.subarray(2, 22);

      if (pubkeyHash.equals(witnessProgram)) {
        return pubkey;
      }

      continue;
    }

    if (scriptType === "p2pkh_or_unknown_legacy") {
      const scriptPubkeyHash = scriptPubKey.subarray(3, 23);

      if (pubkeyHash.equals(scriptPubkeyHash)) {
        return pubkey;
      }

      continue;
    }

    if (scriptType === "p2sh_p2wpkh") {
      if (!input.redeemScript) {
        continue;
      }

      const p2shHash = scriptPubKey.subarray(2, 22);

      if (!hash160(input.redeemScript).equals(p2shHash)) {
        continue;
      }

      if (classifyWitnessScript(input.redeemScript) !== "p2wpkh") {
        continue;
      }

      const redeemWitnessProgram = input.redeemScript.subarray(2, 22);

      if (pubkeyHash.equals(redeemWitnessProgram)) {
        return pubkey;
      }
    }
  }

  return null;
}

export function groupSilentPaymentOutputs(
  entries: SPOutputEntry[],
): Map<string, SPOutputEntry[]> {
  const groups = new Map<string, SPOutputEntry[]>();
  for (const entry of entries) {
    const key = entry.bscan.toString("hex");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entry);
  }
  for (const group of groups.values()) {
    group.sort((a, b) => {
      const cmp = a.bspend.compare(b.bspend);
      return cmp !== 0 ? cmp : a.outputIndex - b.outputIndex;
    });
  }
  return groups;
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
 * Uses full compressed point arithmetic for `Bspend` to correctly handle
 * both even-y (0x02) and odd-y (0x03) spend keys.
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
 */
export function deriveSilentPaymentOutput(
  ecdhShare: Buffer,
  inputHash: Buffer,
  bspend: Buffer,
  k: number,
): Buffer {
  const inputScalar = bytesToNumberBE(inputHash);
  assertValidScalar(inputScalar, "Silent payment input hash");

  // ecdhSecret = inputHash · ecdhShare
  const ecdhSecretPoint =
    secp256k1.ProjectivePoint.fromHex(ecdhShare).multiply(inputScalar);
  const ecdhSecretBytes = ecdhSecretPoint.toRawBytes(true);

  // tweak_k = taggedHash("BIP0352/SharedSecret", ecdhSecret_compressed || k_be32)
  const kBuf = Buffer.allocUnsafe(4);
  kBuf.writeUInt32BE(k, 0);
  const tweak = bip352TaggedHash(
    "BIP0352/SharedSecret",
    Buffer.concat([ecdhSecretBytes, kBuf]),
  );

  const tweakScalar = bytesToNumberBE(tweak);
  assertValidScalar(tweakScalar, "Silent payment shared-secret tweak");

  // Pk = Bspend + tweak_k·G
  const Pk = secp256k1.ProjectivePoint.fromHex(bspend).add(
    secp256k1.ProjectivePoint.BASE.multiply(tweakScalar),
  );

  // P2TR output script: OP_1 <0x20> <x-only pubkey>
  const xOnlyPk = Pk.toRawBytes(true).subarray(1);
  return Buffer.concat([Buffer.from([OPS.OP_1, 0x20]), xOnlyPk]);
}

export function generateSilentPaymentDLEQProof({
  secret,
  scanKey,
  auxRand,
}: {
  secret: Buffer;
  scanKey: Buffer;
  auxRand?: Buffer;
}): {
  ecdhShare: Buffer;
  proof: Buffer;
} {
  assertValidBscan(scanKey);

  const ecdhShare = multiplyCompressedPoint(scanKey, secret);
  assertValidECDHShare(ecdhShare);

  const proof = generateDLEQProof({
    secret,
    basePoint: scanKey,
    auxRand,
  });

  assertValidDLEQProof(proof);

  return {
    ecdhShare,
    proof,
  };
}

export function verifySilentPaymentDLEQProof({
  publicKey,
  scanKey,
  ecdhShare,
  proof,
}: {
  publicKey: Buffer;
  scanKey: Buffer;
  ecdhShare: Buffer;
  proof: Buffer;
}): boolean {
  assertValidBscan(scanKey);
  assertValidECDHShare(ecdhShare);
  assertValidDLEQProof(proof);

  return verifyDLEQProof({
    publicKey,
    basePoint: scanKey,
    result: ecdhShare,
    proof,
  });
}
