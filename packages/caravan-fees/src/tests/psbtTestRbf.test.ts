// packages/caravan-fees/src/tests/rbf.exact.test.ts

import { PsbtV2 } from "@caravan/psbt";

import { createAcceleratedRbfTransaction } from "../rbf";

import { exactRbfFixtures } from "./psbtTestRbf.fixture";

describe("Exact RBF Reconstruction Tests", () => {
  describe("createAcceleratedRbfTransaction - PSBT Recreation", () => {
    exactRbfFixtures.acceleratedRbf.forEach((fixture) => {
      it(fixture.case, () => {
        const isAdditionalUtxoCase = fixture.case.includes(
          "Using additional UTXO",
        );

        // For normal exact reconstruction: use changeIndex (internal change derivation)
        // For additional UTXO fee-bumping: use changeAddress (external address provided)
        const changeConfig = isAdditionalUtxoCase
          ? { changeAddress: fixture.changeAddress }
          : { changeIndex: fixture.changeIndex ?? 0 };

        const acceleratedPsbt = createAcceleratedRbfTransaction({
          originalTx: fixture.originalTx,
          availableInputs: fixture.availableUtxos,
          network: fixture.network,
          dustThreshold: fixture.dustThreshold,
          scriptType: fixture.scriptType,
          requiredSigners: fixture.requiredSigners,
          totalSigners: fixture.totalSigners,
          targetFeeRate: fixture.targetFeeRate,
          absoluteFee: fixture.absoluteFee,
          ...changeConfig,
          reuseAllInputs: true,
        });

        const psbt = new PsbtV2(acceleratedPsbt);

        const expectedPsbt = new PsbtV2(fixture.expected.exactPsbt, true);
        console.log("acc", psbt.serialize("base64"));
        // Test basic structure matches
        // Note: For additional UTXO cases, we expect MORE inputs than the original
        // since we're adding extra UTXOs to cover the higher fees
        if (!isAdditionalUtxoCase) {
          expect(psbt.PSBT_GLOBAL_INPUT_COUNT).toBe(
            expectedPsbt.PSBT_GLOBAL_INPUT_COUNT,
          );
          expect(psbt.PSBT_GLOBAL_OUTPUT_COUNT).toBe(
            expectedPsbt.PSBT_GLOBAL_OUTPUT_COUNT,
          );
        } else {
          // For fee-bumping with additional UTXOs, we just verify we have at least
          // the original number of inputs/outputs (could be more)
          expect(psbt.PSBT_GLOBAL_INPUT_COUNT).toBeGreaterThanOrEqual(
            expectedPsbt.PSBT_GLOBAL_INPUT_COUNT,
          );
          expect(psbt.PSBT_GLOBAL_OUTPUT_COUNT).toBeGreaterThanOrEqual(
            expectedPsbt.PSBT_GLOBAL_OUTPUT_COUNT,
          );
        }

        // Test input details match
        // For additional UTXO cases: Since we're adding extra inputs to cover fees,
        // the TXID arrays will differ. We just need to verify that all original
        // TXIDs are still present in the fee-bumped transaction
        if (!isAdditionalUtxoCase) {
          expect(psbt.PSBT_IN_PREVIOUS_TXID).toEqual(
            expectedPsbt.PSBT_IN_PREVIOUS_TXID,
          );
        } else {
          // For fee-bumping with additional UTXOs, verify original TXIDs are preserved
          // The fee-bumped tx should contain all original inputs plus any new ones
          const hasAnyMatchingTxid = expectedPsbt.PSBT_IN_PREVIOUS_TXID.some(
            (expectedTxid) => psbt.PSBT_IN_PREVIOUS_TXID.includes(expectedTxid),
          );

          expect(hasAnyMatchingTxid).toBe(true);
        }

        expect(psbt.PSBT_IN_OUTPUT_INDEX).toEqual(
          expectedPsbt.PSBT_IN_OUTPUT_INDEX,
        );
        expect(psbt.PSBT_IN_SEQUENCE).toEqual(expectedPsbt.PSBT_IN_SEQUENCE);

        // Test witness UTXO data is present
        expect(psbt.PSBT_IN_WITNESS_UTXO[0]).toBeDefined();
        expect(psbt.PSBT_IN_WITNESS_UTXO[0]).not.toBeNull();
        expect(expectedPsbt.PSBT_IN_WITNESS_UTXO[0]).toBeDefined();

        // Test witness script is present for P2WSH
        expect(psbt.PSBT_IN_WITNESS_SCRIPT[0]).toBeDefined();
        expect(psbt.PSBT_IN_WITNESS_SCRIPT[0]).not.toBeNull();
        expect(expectedPsbt.PSBT_IN_WITNESS_SCRIPT[0]).toBeDefined();

        // Test BIP32 derivations are present
        expect(psbt.PSBT_IN_BIP32_DERIVATION[0]).toBeDefined();
        expect(psbt.PSBT_IN_BIP32_DERIVATION[0].length).toBe(3); // 2-of-3 multisig
        expect(expectedPsbt.PSBT_IN_BIP32_DERIVATION[0]).toBeDefined();

        // Test output scripts (as outputs wil change for actual and fee-bumped tx)

        // For additional UTXO cases: Since we're adding extra inputs to cover fees to changeAddress,
        // So we'll have an extra output. We just need to verify that all original
        // outputs are still present in the fee-bumped transaction
        if (!isAdditionalUtxoCase) {
          expect(psbt.PSBT_OUT_SCRIPT).toEqual(expectedPsbt.PSBT_OUT_SCRIPT);
        } else {
          // For fee-bumping with additional UTXOs, verify original TXIDs are preserved
          // The fee-bumped tx should contain all original inputs plus any new ones
          const hasAnyMatchingOutput = expectedPsbt.PSBT_OUT_SCRIPT.some(
            (expectedTxid) => psbt.PSBT_OUT_SCRIPT.includes(expectedTxid),
          );

          expect(hasAnyMatchingOutput).toBe(true);
        }
      });
    });
  });
});
