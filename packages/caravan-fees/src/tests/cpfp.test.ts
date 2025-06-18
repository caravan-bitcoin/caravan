import { PsbtV2 } from "@caravan/psbt";
import { BigNumber } from "bignumber.js";

import { createCPFPTransaction } from "../cpfp";
import { TransactionAnalyzer } from "../transactionAnalyzer";
import {
  calculateTotalInputValue,
  calculateTotalOutputValue,
  estimateTransactionVsize,
  reverseHex,
} from "../utils";

import { cpfpValidFixtures, cpfpInvalidFixtures } from "./cpfp.fixtures";

describe("CPFP Transaction Creation", () => {
  describe("Valid CPFP Transactions", () => {
    cpfpValidFixtures.forEach((fixture) => {
      it(fixture.case, () => {
        const cpfpPsbtBase64 = createCPFPTransaction(fixture.options);
        const psbt = new PsbtV2(cpfpPsbtBase64);

        // Step 1: Verify transaction analysis
        const txAnalyzer = new TransactionAnalyzer({
          txHex: fixture.options.originalTx,
          network: fixture.options.network,
          targetFeeRate: fixture.options.targetFeeRate,
          absoluteFee: fixture.options.absoluteFee,
          availableUtxos: fixture.options.availableInputs,
          requiredSigners: fixture.options.requiredSigners,
          totalSigners: fixture.options.totalSigners,
          addressType: fixture.options.scriptType,
          changeOutputIndex: fixture.options.spendableOutputIndex,
        });

        const analysis = txAnalyzer.analyze();
        // Step 2: Verify CPFP possibility
        expect(analysis.canCPFP).toBe(true);

        // Step 3: Verify new transaction template
        expect(psbt.PSBT_GLOBAL_INPUT_COUNT).toBe(1);
        expect(psbt.PSBT_GLOBAL_OUTPUT_COUNT).toBe(1);

        // Step 4: Verify spendable output is used as input
        expect(reverseHex(psbt.PSBT_IN_PREVIOUS_TXID[0])).toBe(
          fixture.expected.parentTxid,
        );
        expect(psbt.PSBT_IN_OUTPUT_INDEX[0]).toBe(
          fixture.options.spendableOutputIndex,
        );

        // Step 5: Verify change output
        expect(psbt.PSBT_OUT_SCRIPT[0]).toContain(
          fixture.options.availableInputs[
            fixture.options.spendableOutputIndex
          ].witnessUtxo?.script.toString("hex"),
        );

        // Step 6 & 7: Verify fee calculation and change amount
        const totalInputAmount = calculateTotalInputValue(psbt);
        const totalOutputAmount = calculateTotalOutputValue(psbt);
        const fee = totalInputAmount.minus(totalOutputAmount);
        expect(fee.toString()).toBe(fixture.expected.childFee);
        expect(totalOutputAmount.toString()).toBe(
          fixture.expected.changeOutput.value,
        );

        // Step 8: Verify child transaction validity
        const childVsize = estimateTransactionVsize({
          addressType: fixture.options.scriptType,
          numInputs: psbt.PSBT_GLOBAL_INPUT_COUNT,
          numOutputs: psbt.PSBT_GLOBAL_OUTPUT_COUNT,
          m: fixture.options.requiredSigners,
          n: fixture.options.totalSigners,
        });
        expect(childVsize).toBeCloseTo(fixture.expected.childVsize, 0);

        // Step 9: Verify combined fee rate
        const parentFee = new BigNumber(fixture.expected.parentFee);
        const combinedFee = parentFee.plus(fee);
        const combinedSize = new BigNumber(fixture.expected.parentVsize).plus(
          childVsize,
        );
        const combinedFeeRate = combinedFee.dividedBy(combinedSize);
        expect(combinedFeeRate.toFixed(2)).toBe(
          fixture.expected.combinedFeeRate.toFixed(2),
        );
      });
    });
  });

  describe("Invalid CPFP Transactions", () => {
    cpfpInvalidFixtures.forEach((fixture) => {
      it(fixture.case, () => {
        expect(() => createCPFPTransaction(fixture.options)).toThrow();
      });
    });
  });
});
