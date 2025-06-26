// packages/caravan-fees/src/tests/rbf.exact.test.ts

import { PsbtV2 } from "@caravan/psbt";

import {
  createAcceleratedRbfTransaction,
  createCancelRbfTransaction,
} from "../rbf";

import { exactRbfFixtures } from "./psbtTestRbf.fixture";

describe("Exact RBF Reconstruction Tests", () => {
  describe("createAcceleratedRbfTransaction - PSBT Recreation", () => {
    exactRbfFixtures.acceleratedRbf.forEach((fixture) => {
      it(fixture.case, () => {
        // For normal exact reconstruction: use changeIndex (internal change derivation)
        // For additional UTXO fee-bumping: use changeAddress (external address provided)
        const changeConfig = fixture.isAdditionalUtxoCase
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
          ...(fixture.globalXpubs && { globalXpubs: fixture.globalXpubs }), // Only add if fixture provides us globalXpubs
        });

        const psbt = new PsbtV2(acceleratedPsbt);
        const expectedPsbt = new PsbtV2(fixture.expected.exactPsbt, true);

        // Test basic structure matches
        // Note: For additional UTXO cases, we expect MORE inputs than the original
        // since we're adding extra UTXOs to cover the higher fees
        if (!fixture.isAdditionalUtxoCase) {
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
        if (!fixture.isAdditionalUtxoCase) {
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

        // Test Global Xpubs if present in fixture
        if (fixture.globalXpubs && fixture.globalXpubs.length > 0) {
          expect(psbt.PSBT_GLOBAL_XPUB).toBeDefined();
          expect(psbt.PSBT_GLOBAL_XPUB.length).toBe(fixture.globalXpubs.length);

          // Validate each global xpub
          fixture.globalXpubs.forEach((expectedXpub, index) => {
            const psbtXpub = psbt.PSBT_GLOBAL_XPUB[index];
            expect(psbtXpub).toBeDefined();
            expect(psbtXpub.key).toBeDefined();
            expect(psbtXpub.value).toBeDefined();

            // Extract and validate the fingerprint and path from the PSBT
            if (psbtXpub.value) {
              const valueBuffer = Buffer.from(psbtXpub.value, "hex");
              const fingerprint = valueBuffer.slice(0, 4).toString("hex");

              expect(fingerprint).toBe(expectedXpub.masterFingerprint);

              // Parse BIP32 path from bytes
              const pathBytes = valueBuffer.slice(4);
              const pathNodes = [];
              for (let i = 0; i < pathBytes.length; i += 4) {
                const nodeValue = pathBytes.readUInt32LE(i);
                const isHardened = nodeValue >= 0x80000000;
                const nodeIndex = isHardened
                  ? nodeValue - 0x80000000
                  : nodeValue;
                //@ts-expect-error some type error here
                pathNodes.push(`/${nodeIndex}${isHardened ? "'" : ""}`);
              }
              const parsedPath = `m${pathNodes.join("")}`;
              expect(parsedPath).toBe(expectedXpub.path);
            }
          });
        }

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
        if (!fixture.isAdditionalUtxoCase) {
          expect(psbt.PSBT_OUT_SCRIPT).toEqual(expectedPsbt.PSBT_OUT_SCRIPT);
        } else {
          // For fee-bumping with additional UTXOs, verify original TXIDs are preserved
          // The fee-bumped tx should contain all original inputs plus any new ones
          const hasAnyMatchingOutput = expectedPsbt.PSBT_OUT_SCRIPT.some(
            (expectedTxid) => psbt.PSBT_OUT_SCRIPT.includes(expectedTxid),
          );

          expect(hasAnyMatchingOutput).toBe(true);
        }

        // Finally we check the PSBT's
        expect(psbt.serialize("base64")).toBe(expectedPsbt.serialize("base64"));
      });
    });
  });
  describe("createCancelRbfTransaction - PSBT Recreation", () => {
    exactRbfFixtures.cancelRbf.forEach((fixture) => {
      it(fixture.case, () => {
        const cancelPsbt = createCancelRbfTransaction({
          originalTx: fixture.originalTx,
          availableInputs: fixture.availableUtxos,
          network: fixture.network,
          dustThreshold: fixture.dustThreshold,
          scriptType: fixture.scriptType,
          requiredSigners: fixture.requiredSigners,
          totalSigners: fixture.totalSigners,
          targetFeeRate: fixture.targetFeeRate,
          absoluteFee: fixture.absoluteFee,
          cancelAddress: fixture.cancelAddress,
          reuseAllInputs: true,
        });

        const psbt = new PsbtV2(cancelPsbt);
        const expectedPsbt = new PsbtV2(fixture.expected.exactPsbt, true);

        // Cancel RBF creates a completely new transaction structure
        // Unlike accelerated RBF, it only has ONE output (the cancel address)

        // Test basic structure
        expect(psbt.PSBT_GLOBAL_INPUT_COUNT).toBe(
          expectedPsbt.PSBT_GLOBAL_INPUT_COUNT,
        );

        // Cancel RBF always creates exactly ONE output (to cancel address)
        expect(psbt.PSBT_GLOBAL_OUTPUT_COUNT).toBe(1);
        expect(expectedPsbt.PSBT_GLOBAL_OUTPUT_COUNT).toBe(1);

        // Test input details - Cancel RBF must conflict with original tx
        // So we need at least one matching TXID from the original transaction ( to also consider case where extra additional UTXO are used , for fee-bump though rare in cancel RBF)
        const hasConflictingInput = expectedPsbt.PSBT_IN_PREVIOUS_TXID.some(
          (expectedTxid) => psbt.PSBT_IN_PREVIOUS_TXID.includes(expectedTxid),
        );
        expect(hasConflictingInput).toBe(true);

        // Test witness UTXO data is present
        expect(psbt.PSBT_IN_WITNESS_UTXO[0]).toBeDefined();
        expect(psbt.PSBT_IN_WITNESS_UTXO[0]).not.toBeNull();

        // Test witness script is present
        expect(psbt.PSBT_IN_WITNESS_SCRIPT[0]).toBeDefined();
        expect(psbt.PSBT_IN_WITNESS_SCRIPT[0]).not.toBeNull();

        // Test BIP32 derivations are present
        expect(psbt.PSBT_IN_BIP32_DERIVATION[0]).toBeDefined();
        expect(psbt.PSBT_IN_BIP32_DERIVATION[0].length).toBe(3); // 2-of-3 multisig

        // Test output script - Cancel RBF has only one output to cancel address
        expect(psbt.PSBT_OUT_SCRIPT).toHaveLength(1);
        expect(psbt.PSBT_OUT_SCRIPT).toEqual(expectedPsbt.PSBT_OUT_SCRIPT);

        // Finally we check the PSBT's
        expect(psbt.serialize("base64")).toBe(expectedPsbt.serialize("base64"));
      });
    });
  });
});
