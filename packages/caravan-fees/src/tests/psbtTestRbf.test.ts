// packages/caravan-fees/src/tests/rbf.exact.test.ts

import { PsbtV2 } from "@caravan/psbt";

import { createAcceleratedRbfTransaction } from "../rbf";
import { calculateTotalInputValue, calculateTotalOutputValue } from "../utils";

import { exactRbfFixtures } from "./psbtTestRbf.fixture";

describe("Exact RBF Reconstruction Tests", () => {
  describe("createAcceleratedRbfTransaction - Exact PSBT Recreation", () => {
    exactRbfFixtures.acceleratedRbf.forEach((fixture) => {
      it(fixture.case, () => {
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
          changeIndex: 1,
          reuseAllInputs: true,
        });

        const psbt = new PsbtV2(acceleratedPsbt);

        const expectedPsbt = new PsbtV2(fixture.expected.exactPsbt, true);

        // Test basic structure matches
        expect(psbt.PSBT_GLOBAL_INPUT_COUNT).toBe(
          expectedPsbt.PSBT_GLOBAL_INPUT_COUNT,
        );
        expect(psbt.PSBT_GLOBAL_OUTPUT_COUNT).toBe(
          expectedPsbt.PSBT_GLOBAL_OUTPUT_COUNT,
        );

        // Test input details match
        expect(psbt.PSBT_IN_PREVIOUS_TXID).toEqual(
          expectedPsbt.PSBT_IN_PREVIOUS_TXID,
        );
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

        // Test output amounts and scripts
        expect(psbt.PSBT_OUT_AMOUNT).toEqual(expectedPsbt.PSBT_OUT_AMOUNT);
        expect(psbt.PSBT_OUT_SCRIPT).toEqual(expectedPsbt.PSBT_OUT_SCRIPT);

        // Verify fee calculation
        const totalInputAmount = calculateTotalInputValue(psbt);
        const totalOutputAmount = calculateTotalOutputValue(psbt);
        const actualFee = totalInputAmount.minus(totalOutputAmount);

        expect(actualFee.toString()).toBe(fixture.expected.fee);
      });
    });
  });
});
