/**
 * BIP375 test vectors for PsbtV2 silent payment PSBT validation.
 */

import { describe, expect, test } from "vitest";
import { PsbtV2 } from "./psbtv2";
import bip375Vectors from "../fixtures/bip375_vectors.json";
import { KeyType } from "src/psbtv2/types";
import { secp256k1 } from "@noble/curves/secp256k1";

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
  // Test-only: use a fixed valid witness program derived from pubkey bytes.
  // If the repo already has address/script helpers, prefer those.
  const h = Buffer.from(
    require("crypto")
      .createHash("ripemd160")
      .update(require("crypto").createHash("sha256").update(pubkey).digest())
      .digest(),
  );

  return Buffer.concat([Buffer.from([0x00, 0x14]), h]);
}

// ── Invalid vectors ────────────────────────────────────────────────────────

describe("BIP375 invalid vectors", () => {
  test.each(bip375Vectors.invalid)("$description", ({ psbt }) => {
    expect(() => {
      const p = new PsbtV2(psbt);
      p.validate();
    }).toThrow();
  });
});

// ── Valid vectors ──────────────────────────────────────────────────────────

describe("BIP375 valid vectors", () => {
  test.each(bip375Vectors.valid)("$description", ({ psbt, supplementary }) => {
    const p = new PsbtV2(psbt);

    expect(() => p.validate()).not.toThrow();

    // ── Output checks ──────────────────────────────────────────────────────

    for (const output of supplementary.outputs ?? []) {
      // Output script
      if (output.script) {
        expect(
          p.PSBT_OUT_SCRIPT[output.output_index],
          `output ${output.output_index} script`,
        ).toBe(output.script);
      }

      // SP V0 info (bscan || bspend): only check unlabeled outputs.
      // For labeled outputs, the supplementary bspend is the label-tweaked key
      // (B_spend + label·G), but PSBT_OUT_SP_V0_INFO stores the raw bspend.
      // The label relationship is verified separately via PSBT_OUT_SP_V0_LABEL.
      const hasLabel = "sp_v0_label" in output && output.sp_v0_label !== null;
      if (output.sp_v0_info && !hasLabel) {
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

    psbt.computeSilentPaymentOutputScripts();

    expect(() => new PsbtV2(psbt.serialize())).toThrow(
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

    psbt.computeSilentPaymentOutputScripts();

    expect(() => new PsbtV2(psbt.serialize())).toThrow(
      /Invalid input 0 silent payment DLEQ proof/,
    );
  });
});
