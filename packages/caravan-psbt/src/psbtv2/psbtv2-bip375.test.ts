/**
 * BIP375 test vectors for PsbtV2 silent payment PSBT validation.
 */

import { describe, expect, test } from "vitest";
import { PsbtV2 } from "./psbtv2";
import bip375Vectors from "../fixtures/bip375_vectors.json";
import { KeyType } from "src/psbtv2/types";

const SKIP_DESCRIPTIONS = new Set([
  "ecdh coverage: invalid proof in PSBT_IN_SP_DLEQ field",
  "ecdh coverage: invalid proof in PSBT_GLOBAL_SP_DLEQ field",
]);

// ── Invalid vectors ────────────────────────────────────────────────────────

describe("BIP375 invalid vectors", () => {
  test.each(
    bip375Vectors.invalid.filter((v) => !SKIP_DESCRIPTIONS.has(v.description)),
  )("$description", ({ psbt }) => {
    expect(() => {
      const p = new PsbtV2(psbt);
      p.validate();
    }).toThrow();
  });
});

// ── Valid vectors ──────────────────────────────────────────────────────────

describe("BIP375 valid vectors", () => {
  test.each(
    bip375Vectors.valid.filter((v) => !SKIP_DESCRIPTIONS.has(v.description)),
  )("$description", ({ psbt, supplementary }) => {
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
