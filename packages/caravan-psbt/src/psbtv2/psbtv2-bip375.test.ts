/**
 * BIP375 test vectors for PsbtV2 silent payment PSBT validation.
 */

import { describe, expect, test } from "vitest";
import { PsbtV2 } from "./psbtv2";
import { PsbtConversionMaps } from "./psbtv2maps";
import bip375Vectors from "../fixtures/bip375_vectors.json";
import { KeyType } from "src/psbtv2/types";
import { secp256k1 } from "@noble/curves/secp256k1";
import { hash160 } from "@caravan/bitcoin";

function hex(s: string): Buffer {
  return Buffer.from(s, "hex");
}

function pubkeyFromSecret(secret: Buffer): Buffer {
  return Buffer.from(
    secp256k1.ProjectivePoint.BASE.multiply(
      BigInt(`0x${secret.toString("hex")}`),
    ).toRawBytes(true),
  );
}

function p2wpkhScript(pubkey: Buffer): Buffer {
  return Buffer.concat([Buffer.from([0x00, 0x14]), hash160(pubkey)]);
}

// ── Invalid vectors ────────────────────────────────────────────────────────

describe("BIP375 invalid vectors", () => {
  test.each(bip375Vectors.invalid)("$description", (vector) => {
    let thrown: unknown;

    try {
      new PsbtV2(vector.psbt);
    } catch (e) {
      thrown = e;
    }

    expect(thrown, `${vector.description} should be rejected`).toBeDefined();

    const error = thrown as Error;

    // A deliberate rejection carries an explanatory message. A TypeError or
    // RangeError means the parser crashed on the way to the check, so the
    // vector would pass for the wrong reason.
    expect(error).toBeInstanceOf(Error);
    expect(error.constructor.name, `${vector.description} threw ${error}`).toBe(
      "Error",
    );
    expect(error.message.length).toBeGreaterThan(0);

    // Vectors may pin the specific reason they are expected to be rejected for.
    if ("expected_error" in vector && vector.expected_error) {
      expect(error.message).toMatch(
        new RegExp(vector.expected_error as string),
      );
    }
  });
});

// ── Valid vectors ──────────────────────────────────────────────────────────
describe("BIP375 valid vectors", () => {
  test.each(bip375Vectors.valid)("$description", ({ psbt, supplementary }) => {
    const p = new PsbtV2(psbt);

    expect(() => p.validate()).not.toThrow();

    // ── Output checks ──────────────────────────────────────────────────────

    for (const output of supplementary.outputs ?? []) {
      const outputMap = p.outputMaps[output.output_index];
      expect(outputMap, `output ${output.output_index} exists`).toBeDefined();

      if (
        "script" in output &&
        output.script !== null &&
        output.script !== undefined
      ) {
        const script = outputMap.get(KeyType.PSBT_OUT_SCRIPT);
        expect(
          script?.toString("hex"),
          `output ${output.output_index} script`,
        ).toBe(output.script);
      } else {
        expect(
          outputMap.has(KeyType.PSBT_OUT_SCRIPT),
          `output ${output.output_index} should not have PSBT_OUT_SCRIPT`,
        ).toBe(false);
      }

      // SP V0 info (bscan || bspend), checked for labeled outputs too: BIP352
      // publishes the address as (Bscan, Bm), so PSBT_OUT_SP_V0_INFO already
      // carries the label-tweaked spend key and needs no special casing.
      // See bitcoin/bips#2207.
      const hasLabel = "sp_v0_label" in output && output.sp_v0_label !== null;
      if (output.sp_v0_info) {
        const info = p.getSilentPaymentOutputInfo(output.output_index);
        expect(info, `output ${output.output_index} sp_v0_info`).not.toBeNull();
        const combined =
          info!.bscan.toString("hex") + info!.bspend.toString("hex");
        expect(combined, `output ${output.output_index} sp_v0_info`).toBe(
          output.sp_v0_info,
        );
      }

      // SP V0 label
      if (hasLabel) {
        expect(
          p.PSBT_OUT_SP_V0_LABEL[output.output_index],
          `output ${output.output_index} sp_v0_label`,
        ).toBe(output.sp_v0_label);
      }
    }

    // ── Input / proof checks ───────────────────────────────────────────────

    for (const proof of supplementary.sp_proofs ?? []) {
      const isGlobal =
        proof.input_index === undefined || proof.input_index === null;

      if (isGlobal) {
        if (proof.ecdh_share) {
          const entry = p.PSBT_GLOBAL_SP_ECDH_SHARE.find(
            (s) => s.key === KeyType.PSBT_GLOBAL_SP_ECDH_SHARE + proof.scan_key,
          );
          expect(
            entry?.value,
            `global ECDH share for scan key ${proof.scan_key}`,
          ).toBe(proof.ecdh_share);
        }
        if (proof.dleq_proof) {
          const entry = p.PSBT_GLOBAL_SP_DLEQ.find(
            (s) => s.key === KeyType.PSBT_GLOBAL_SP_DLEQ + proof.scan_key,
          );
          expect(
            entry?.value,
            `global DLEQ proof for scan key ${proof.scan_key}`,
          ).toBe(proof.dleq_proof);
        }
      } else {
        if (proof.ecdh_share) {
          const entry = p.PSBT_IN_SP_ECDH_SHARE[proof.input_index].find(
            (s) => s.key === KeyType.PSBT_IN_SP_ECDH_SHARE + proof.scan_key,
          );
          expect(
            entry?.value,
            `input ${proof.input_index} ECDH share for scan key ${proof.scan_key}`,
          ).toBe(proof.ecdh_share);
        }
        if (proof.dleq_proof) {
          const entry = p.PSBT_IN_SP_DLEQ[proof.input_index].find(
            (s) => s.key === KeyType.PSBT_IN_SP_DLEQ + proof.scan_key,
          );
          expect(
            entry?.value,
            `input ${proof.input_index} DLEQ proof for scan key ${proof.scan_key}`,
          ).toBe(proof.dleq_proof);
        }
      }
    }
  });
});

describe("BIP375 DLEQ integration", () => {
  it("adds and validates a global ECDH share with DLEQ proof", () => {
    const inputSecret = hex(
      "0000000000000000000000000000000000000000000000000000000000000001",
    );
    const scanSecret = hex(
      "0000000000000000000000000000000000000000000000000000000000000002",
    );
    const spendSecret = hex(
      "0000000000000000000000000000000000000000000000000000000000000003",
    );

    const inputPubkey = pubkeyFromSecret(inputSecret);
    const scanKey = pubkeyFromSecret(scanSecret);
    const spendKey = pubkeyFromSecret(spendSecret);

    const psbt = new PsbtV2();

    psbt.addInput({
      previousTxId: Buffer.alloc(32, 1),
      outputIndex: 0,
      witnessUtxo: {
        amount: 100_000,
        script: p2wpkhScript(inputPubkey),
      },
      bip32Derivation: [
        {
          pubkey: inputPubkey,
          masterFingerprint: Buffer.alloc(4, 0),
          path: "m/84'/0'/0'/0/0",
        },
      ],
    });

    psbt.addOutput({
      amount: 50_000,
      silentPayment: {
        bscan: scanKey,
        bspend: spendKey,
      },
    });

    psbt.addGlobalSPECDHShareWithDLEQ(
      scanKey,
      inputSecret,
      Buffer.alloc(32, 0),
    );

    psbt.computeSilentPaymentOutputScripts();

    expect(() => new PsbtV2(psbt.serialize())).not.toThrow();
  });

  it("rejects a mutated global DLEQ proof", () => {
    const inputSecret = hex(
      "0000000000000000000000000000000000000000000000000000000000000001",
    );
    const scanSecret = hex(
      "0000000000000000000000000000000000000000000000000000000000000002",
    );
    const spendSecret = hex(
      "0000000000000000000000000000000000000000000000000000000000000003",
    );

    const inputPubkey = pubkeyFromSecret(inputSecret);
    const scanKey = pubkeyFromSecret(scanSecret);
    const spendKey = pubkeyFromSecret(spendSecret);

    const psbt = new PsbtV2();

    psbt.addInput({
      previousTxId: Buffer.alloc(32, 1),
      outputIndex: 0,
      witnessUtxo: {
        amount: 100_000,
        script: p2wpkhScript(inputPubkey),
      },
      bip32Derivation: [
        {
          pubkey: inputPubkey,
          masterFingerprint: Buffer.alloc(4, 0),
          path: "m/84'/0'/0'/0/0",
        },
      ],
    });

    psbt.addOutput({
      amount: 50_000,
      silentPayment: {
        bscan: scanKey,
        bspend: spendKey,
      },
    });

    psbt.addGlobalSPECDHShareWithDLEQ(
      scanKey,
      inputSecret,
      Buffer.alloc(32, 0),
    );

    const proofKey = KeyType.PSBT_GLOBAL_SP_DLEQ + scanKey.toString("hex");
    const proof = Buffer.from(psbt.globalMap.get(proofKey) as Buffer);
    proof[0] ^= 1;
    psbt.globalMap.set(proofKey, proof);

    // The producer verifies DLEQ proofs before deriving, so the tampered proof
    // is rejected at compute time rather than later on round-trip construction.
    expect(() => psbt.computeSilentPaymentOutputScripts()).toThrow(
      /Invalid global silent payment DLEQ proof/,
    );
  });

  it("adds and validates per-input ECDH shares with DLEQ proofs", () => {
    const inputSecret = hex(
      "0000000000000000000000000000000000000000000000000000000000000001",
    );
    const scanSecret = hex(
      "0000000000000000000000000000000000000000000000000000000000000002",
    );
    const spendSecret = hex(
      "0000000000000000000000000000000000000000000000000000000000000003",
    );

    const inputPubkey = pubkeyFromSecret(inputSecret);
    const scanKey = pubkeyFromSecret(scanSecret);
    const spendKey = pubkeyFromSecret(spendSecret);

    const psbt = new PsbtV2();

    psbt.addInput({
      previousTxId: Buffer.alloc(32, 1),
      outputIndex: 0,
      witnessUtxo: {
        amount: 100_000,
        script: p2wpkhScript(inputPubkey),
      },
      bip32Derivation: [
        {
          pubkey: inputPubkey,
          masterFingerprint: Buffer.alloc(4, 0),
          path: "m/84'/0'/0'/0/0",
        },
      ],
    });

    psbt.addOutput({
      amount: 50_000,
      silentPayment: {
        bscan: scanKey,
        bspend: spendKey,
      },
    });

    psbt.addInputSPECDHShareWithDLEQ(
      0,
      scanKey,
      inputSecret,
      Buffer.alloc(32, 0),
    );

    psbt.computeSilentPaymentOutputScripts();

    expect(() => new PsbtV2(psbt.serialize())).not.toThrow();
  });

  it("rejects a mutated per-input DLEQ proof", () => {
    const inputSecret = hex(
      "0000000000000000000000000000000000000000000000000000000000000001",
    );
    const scanSecret = hex(
      "0000000000000000000000000000000000000000000000000000000000000002",
    );
    const spendSecret = hex(
      "0000000000000000000000000000000000000000000000000000000000000003",
    );

    const inputPubkey = pubkeyFromSecret(inputSecret);
    const scanKey = pubkeyFromSecret(scanSecret);
    const spendKey = pubkeyFromSecret(spendSecret);

    const psbt = new PsbtV2();

    psbt.addInput({
      previousTxId: Buffer.alloc(32, 1),
      outputIndex: 0,
      witnessUtxo: {
        amount: 100_000,
        script: p2wpkhScript(inputPubkey),
      },
      bip32Derivation: [
        {
          pubkey: inputPubkey,
          masterFingerprint: Buffer.alloc(4, 0),
          path: "m/84'/0'/0'/0/0",
        },
      ],
    });

    psbt.addOutput({
      amount: 50_000,
      silentPayment: {
        bscan: scanKey,
        bspend: spendKey,
      },
    });

    psbt.addInputSPECDHShareWithDLEQ(
      0,
      scanKey,
      inputSecret,
      Buffer.alloc(32, 0),
    );

    const proofKey = KeyType.PSBT_IN_SP_DLEQ + scanKey.toString("hex");
    const proof = Buffer.from(psbt.inputMaps[0].get(proofKey) as Buffer);
    proof[0] ^= 1;
    psbt.inputMaps[0].set(proofKey, proof);

    // The producer verifies DLEQ proofs before deriving, so the tampered proof
    // is rejected at compute time rather than later on round-trip construction.
    expect(() => psbt.computeSilentPaymentOutputScripts()).toThrow(
      /Invalid input 0 silent payment DLEQ proof/,
    );
  });
});

describe("BIP375 signing gate", () => {
  const inputSecret = hex(
    "0000000000000000000000000000000000000000000000000000000000000001",
  );
  const scanSecret = hex(
    "0000000000000000000000000000000000000000000000000000000000000002",
  );
  const spendSecret = hex(
    "0000000000000000000000000000000000000000000000000000000000000003",
  );

  const inputPubkey = pubkeyFromSecret(inputSecret);
  const scanKey = pubkeyFromSecret(scanSecret);
  const spendKey = pubkeyFromSecret(spendSecret);

  // 71-byte SIGHASH_ALL dummy sig: only the trailing sighash byte is parsed
  // by addPartialSig (handleSighashType reads the last byte).
  const dummySig = Buffer.concat([Buffer.alloc(71, 0), Buffer.from([0x01])]);

  function buildSPPsbt(): PsbtV2 {
    const psbt = new PsbtV2();

    psbt.addInput({
      previousTxId: Buffer.alloc(32, 1),
      outputIndex: 0,
      witnessUtxo: {
        amount: 100_000,
        script: p2wpkhScript(inputPubkey),
      },
      bip32Derivation: [
        {
          pubkey: inputPubkey,
          masterFingerprint: Buffer.alloc(4, 0),
          path: "m/84'/0'/0'/0/0",
        },
      ],
    });

    psbt.addOutput({
      amount: 50_000,
      silentPayment: {
        bscan: scanKey,
        bspend: spendKey,
      },
    });

    psbt.addGlobalSPECDHShareWithDLEQ(
      scanKey,
      inputSecret,
      Buffer.alloc(32, 0),
    );

    return psbt;
  }

  it("signs a valid SP PSBT on the live object after computing scripts", () => {
    const psbt = buildSPPsbt();
    psbt.computeSilentPaymentOutputScripts();

    expect(() => psbt.addPartialSig(0, inputPubkey, dummySig)).not.toThrow();
    expect(psbt.PSBT_IN_PARTIAL_SIG[0].length).toBe(1);
  });

  it("rejects signing when the SP output script was tampered after computing", () => {
    const psbt = buildSPPsbt();
    psbt.computeSilentPaymentOutputScripts();

    const proofKey = KeyType.PSBT_GLOBAL_SP_DLEQ + scanKey.toString("hex");
    const proof = Buffer.from(psbt.globalMap.get(proofKey) as Buffer);
    proof[0] ^= 1;
    psbt.globalMap.set(proofKey, proof);

    expect(() => psbt.addPartialSig(0, inputPubkey, dummySig)).toThrow();
    // The signature must not have been written.
    expect(psbt.PSBT_IN_PARTIAL_SIG[0].length).toBe(0);
  });

  it("allows signing a non-SP PSBT (early-return path is a no-op)", () => {
    const psbt = new PsbtV2();

    psbt.addInput({
      previousTxId: Buffer.alloc(32, 1),
      outputIndex: 0,
      witnessUtxo: {
        amount: 100_000,
        script: p2wpkhScript(inputPubkey),
      },
      bip32Derivation: [
        {
          pubkey: inputPubkey,
          masterFingerprint: Buffer.alloc(4, 0),
          path: "m/84'/0'/0'/0/0",
        },
      ],
    });

    psbt.addOutput({
      amount: 50_000,
      script: p2wpkhScript(spendKey),
    });

    expect(() => psbt.addPartialSig(0, inputPubkey, dummySig)).not.toThrow();
    expect(psbt.PSBT_IN_PARTIAL_SIG[0].length).toBe(1);
  });
});

// ── BIP375 conversion and identification ──────────────────────────────────

describe("BIP375 PSBT conversion and identification", () => {
  const inputSecret = hex(
    "0000000000000000000000000000000000000000000000000000000000000001",
  );
  const scanKey = pubkeyFromSecret(
    hex("0000000000000000000000000000000000000000000000000000000000000002"),
  );
  const spendKey = pubkeyFromSecret(
    hex("0000000000000000000000000000000000000000000000000000000000000003"),
  );
  const inputPubkey = pubkeyFromSecret(inputSecret);

  function spPsbt(): PsbtV2 {
    const psbt = new PsbtV2();

    psbt.addInput({
      previousTxId: Buffer.alloc(32, 1),
      outputIndex: 0,
      witnessUtxo: { amount: 100_000, script: p2wpkhScript(inputPubkey) },
      bip32Derivation: [
        {
          pubkey: inputPubkey,
          masterFingerprint: Buffer.alloc(4, 0),
          path: "m/84'/0'/0'/0/0",
        },
      ],
    });

    psbt.addOutput({
      amount: 50_000,
      silentPayment: { bscan: scanKey, bspend: spendKey },
    });

    psbt.addGlobalSPECDHShareWithDLEQ(
      scanKey,
      inputSecret,
      Buffer.alloc(32, 0),
    );

    return psbt;
  }

  const converter = (psbt: PsbtV2) => new PsbtConversionMaps(psbt.serialize());

  it("keeps the transaction id stable across output script computation", () => {
    const psbt = spPsbt();

    // The BIP375 identifier substitutes 0x00 || Bscan || Bspend for the output
    // script, so it must not move once the real script is derived.
    const before = converter(psbt).getTransactionId();
    psbt.computeSilentPaymentOutputScripts();
    const after = converter(psbt).getTransactionId();

    expect(after).toBe(before);
  });

  it("refuses to convert an in-progress silent payment PSBT to v0", () => {
    expect(() => spPsbt().toV0()).toThrow(
      /PSBT_OUT_SP_V0_INFO is set but PSBT_OUT_SCRIPT has not been computed/,
    );
  });

  it("uses the derived script, not the identifier placeholder, in the v0 unsigned tx", () => {
    const psbt = spPsbt();
    psbt.computeSilentPaymentOutputScripts();

    const derived = psbt.outputMaps[0].get(KeyType.PSBT_OUT_SCRIPT)!;
    const converted = converter(psbt);
    converted.convertToV0();

    const unsignedTx = converted.globalMap.get("00")!;

    expect(unsignedTx.includes(derived)).toBe(true);
    // 0x00 || Bscan || Bspend would be a 67-byte pseudo-script.
    expect(
      unsignedTx.includes(
        Buffer.concat([Buffer.from([0x00]), scanKey, spendKey]),
      ),
    ).toBe(false);
  });

  it("strips silent payment fields that carry keydata when converting to v0", () => {
    const psbt = spPsbt();
    psbt.computeSilentPaymentOutputScripts();

    const converted = converter(psbt);

    // The fixture uses a global share. Seed input-level SP fields as well so
    // this test actually exercises the keydata deletion path for 0x1d/0x1e
    // rather than merely asserting that fields which were never present remain
    // absent.
    const scanKeyHex = scanKey.toString("hex");
    converted.inputMaps[0].set(
      `${KeyType.PSBT_IN_SP_ECDH_SHARE}${scanKeyHex}`,
      Buffer.alloc(33, 2),
    );
    converted.inputMaps[0].set(
      `${KeyType.PSBT_IN_SP_DLEQ}${scanKeyHex}`,
      Buffer.alloc(64, 3),
    );

    expect(
      [...converted.globalMap.keys()].some((k) =>
        k.startsWith(KeyType.PSBT_GLOBAL_SP_ECDH_SHARE),
      ),
      "fixture should carry a global ECDH share before conversion",
    ).toBe(true);
    expect(
      [...converted.inputMaps[0].keys()].some((k) =>
        k.startsWith(KeyType.PSBT_IN_SP_ECDH_SHARE),
      ),
      "fixture should carry an input ECDH share before conversion",
    ).toBe(true);
    expect(
      [...converted.inputMaps[0].keys()].some((k) =>
        k.startsWith(KeyType.PSBT_IN_SP_DLEQ),
      ),
      "fixture should carry an input DLEQ proof before conversion",
    ).toBe(true);

    converted.convertToV0();

    // These four are the only BIP375 fields suffixed with a 33-byte scan key,
    // so an exact-match delete silently leaves them behind.
    for (const keyType of [
      KeyType.PSBT_GLOBAL_SP_ECDH_SHARE,
      KeyType.PSBT_GLOBAL_SP_DLEQ,
    ]) {
      expect(
        [...converted.globalMap.keys()].filter((k) => k.startsWith(keyType)),
        `global keytype ${keyType} should be removed`,
      ).toEqual([]);
    }

    for (const inputMap of converted.inputMaps) {
      for (const keyType of [
        KeyType.PSBT_IN_SP_ECDH_SHARE,
        KeyType.PSBT_IN_SP_DLEQ,
      ]) {
        expect(
          [...inputMap.keys()].filter((k) => k.startsWith(keyType)),
          `input keytype ${keyType} should be removed`,
        ).toEqual([]);
      }
    }
  });
});

describe("BIP375 partial signature validation", () => {
  it("rejects a serialized PSBT carrying a non-SIGHASH_ALL partial signature", () => {
    const inputSecret = hex(
      "0000000000000000000000000000000000000000000000000000000000000001",
    );
    const scanKey = pubkeyFromSecret(
      hex("0000000000000000000000000000000000000000000000000000000000000002"),
    );
    const spendKey = pubkeyFromSecret(
      hex("0000000000000000000000000000000000000000000000000000000000000003"),
    );
    const inputPubkey = pubkeyFromSecret(inputSecret);

    const psbt = new PsbtV2();
    psbt.addInput({
      previousTxId: Buffer.alloc(32, 1),
      outputIndex: 0,
      witnessUtxo: { amount: 100_000, script: p2wpkhScript(inputPubkey) },
      bip32Derivation: [
        {
          pubkey: inputPubkey,
          masterFingerprint: Buffer.alloc(4, 0),
          path: "m/84'/0'/0'/0/0",
        },
      ],
    });
    psbt.addOutput({
      amount: 50_000,
      silentPayment: { bscan: scanKey, bspend: spendKey },
    });
    psbt.addGlobalSPECDHShareWithDLEQ(
      scanKey,
      inputSecret,
      Buffer.alloc(32, 0),
    );

    // Written straight into the map, bypassing addPartialSig, to model a PSBT
    // arriving from another signer. PSBT_IN_SIGHASH_TYPE is deliberately absent
    // so only the trailing flag byte gives it away.
    // 30 06 02 01 01 02 01 01 is a minimal DER ECDSA signature; 03 is
    // SIGHASH_SINGLE.
    const sighashSingleSig = Buffer.from("300602010102010103", "hex");
    psbt.inputMaps[0].set(
      `${KeyType.PSBT_IN_PARTIAL_SIG}${inputPubkey.toString("hex")}`,
      sighashSingleSig,
    );

    const serialized = psbt.serialize();

    expect(() => new PsbtV2(serialized)).toThrow(
      /non-SIGHASH_ALL partial signature/,
    );
  });
});
