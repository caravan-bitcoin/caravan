import { createCPFPTransaction } from "../cpfp";
import { TransactionAnalyzer } from "../transactionAnalyzer";
import { cpfpFixture } from "./cpfp.fixtures";
import { PsbtV2 } from "@caravan/psbt";
import BigNumber from "bignumber.js";
import {
  calculateTotalInputValue,
  calculateTotalOutputValue,
  estimatePSBTvsize,
} from "../utils";

describe("CPFP Transaction Creation", () => {
  describe("CPFP Transaction Creation", () => {
    const fixture = cpfpFixture[0];

    it("should create a valid CPFP transaction", () => {
      const cpfpPsbtBase64 = createCPFPTransaction(fixture.test);
      const psbt = new PsbtV2(cpfpPsbtBase64);

      // Step 1: Verify transaction analysis
      const txAnalyzer = new TransactionAnalyzer({
        txHex: fixture.test.originalTx,
        network: fixture.test.network,
        targetFeeRate: fixture.test.targetFeeRate,
        absoluteFee: fixture.test.absoluteFee,
        availableUtxos: fixture.test.availableInputs,
        requiredSigners: fixture.test.requiredSigners,
        totalSigners: fixture.test.totalSigners,
        addressType: fixture.test.scriptType,
        changeOutputIndex: fixture.test.spendableOutputIndex,
      });

      const analysis = txAnalyzer.analyze();
      // Step 2: Verify CPFP possibility
      expect(analysis.canCPFP).toBe(true);

      // Step 3: Verify new transaction template
      expect(psbt.PSBT_GLOBAL_INPUT_COUNT).toBe(1);
      expect(psbt.PSBT_GLOBAL_OUTPUT_COUNT).toBe(1);

      // Step 4: Verify spendable output is used as input
      expect(psbt.PSBT_IN_PREVIOUS_TXID[0]).toBe(fixture.expected.parentTxid);
      expect(psbt.PSBT_IN_OUTPUT_INDEX[0]).toBe(
        fixture.test.spendableOutputIndex,
      );

      // Step 5: Verify change output
      expect(psbt.PSBT_OUT_SCRIPT[0]).toContain(
        fixture.test.availableInputs[
          fixture.test.spendableOutputIndex
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
      const childVsize = estimatePSBTvsize(psbt);
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

    it("should throw an error if CPFP is not possible", () => {
      const invalidFixture = {
        ...fixture.test,
        spendableOutputIndex: 0, // This output doesn't exist in the parent transaction
      };
      expect(() => createCPFPTransaction(invalidFixture)).toThrow();
    });

    it("should not create a transaction if combined fee rate is too low", () => {
      const lowFeeFixture = {
        ...fixture.test,
        targetFeeRate: 2000, // Much higher than what can be achieved
      };
      expect(() => createCPFPTransaction(lowFeeFixture)).toThrow();
    });
  });

  it("should throw an error if CPFP is not possible", () => {
    const invalidFixture = {
      ...cpfpFixture[0].test,
      spendableOutputIndex: 0, // This output doesn't exist in the parent transaction
    };
    expect(() => createCPFPTransaction(invalidFixture)).toThrow();
  });

  it("should handle dust threshold correctly", () => {
    const lowValueFixture = {
      ...cpfpFixture[0].test,
      availableInputs: [
        { ...cpfpFixture[0].test.availableInputs[0], value: "1000" },
      ],
    };
    expect(() => createCPFPTransaction(lowValueFixture)).toThrow();
  });

  it("should correctly handle additional inputs if necessary", () => {
    const multiInputFixture = {
      ...cpfpFixture[0].test,
      availableInputs: [
        ...cpfpFixture[0].test.availableInputs,
        {
          txid: "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
          vout: 0,
          value: "10000",
          witnessUtxo: {
            script: Buffer.from(
              "0014f2aecd6ab28d970ee8eea34665c181393b8754c6",
              "hex",
            ),
            value: 10000,
          },
        },
      ],
      targetFeeRate: 10, // Higher fee rate to necessitate additional input
    };
    const cpfpPsbt = createCPFPTransaction(multiInputFixture);
    const decodedPsbt = new PsbtV2(cpfpPsbt);

    expect(decodedPsbt.PSBT_GLOBAL_INPUT_COUNT).toBeGreaterThanOrEqual(1);
  });
});
