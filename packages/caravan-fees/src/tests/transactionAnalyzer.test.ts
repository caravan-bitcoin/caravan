import { TransactionAnalyzer } from "../transactionAnalyzer";
import { transactionAnalyzerFixtures } from "./transactionAnalyzer.fixtures";
import BigNumber from "bignumber.js";

describe("TransactionAnalyzer", () => {
  transactionAnalyzerFixtures.validTransactions.forEach((fixture) => {
    test(`Valid Transaction: ${fixture.case}`, () => {
      const analyzer = new TransactionAnalyzer({
        txHex: fixture.txHex,
        ...fixture.options,
        requiredSigners: 1,
        totalSigners: 2,
        addressType: "P2SH",
      });

      expect(analyzer.txid).toBe(fixture.expected.txid);
      expect(
        Math.abs(analyzer.vsize - fixture.expected.vsize),
      ).toBeLessThanOrEqual(1);
      expect(analyzer.weight).toBe(fixture.expected.weight);
      expect(analyzer.inputs.length).toBe(fixture.expected.inputCount);
      expect(analyzer.outputs.length).toBe(fixture.expected.outputCount);
      expect(analyzer.fee).toBe(fixture.expected.fee);
      const feeRate = new BigNumber(analyzer.feeRate);
      const expectedFeeRate = new BigNumber(fixture.expected.feeRate);
      const allowedFeeRateError = new BigNumber("0.1"); // 0.1 sat/vbyte

      expect(
        feeRate
          .minus(expectedFeeRate)
          .abs()
          .isLessThanOrEqualTo(allowedFeeRateError),
      ).toBe(true);

      expect(analyzer.canRBF).toBe(fixture.expected.canRBF);
      expect(analyzer.canCPFP).toBe(fixture.expected.canCPFP);
      expect(analyzer.recommendedStrategy).toBe(
        fixture.expected.recommendedStrategy,
      );

      const feeTolerance = 15; // Allowable tolerance of up to 5 sats

      const minimumRBFFee = Number(analyzer.minimumRBFFee);
      const minimumCPFPFee = Number(analyzer.minimumCPFPFee);

      // Ensure the minimum RBF fee is greater than or equal to the estimated RBF fee
      expect(minimumRBFFee).toBeGreaterThanOrEqual(
        fixture.expected.estimatedRBFFee,
      );

      // Ensure the minimum RBF fee is not more than 5 sats above the estimated RBF fee
      expect(minimumRBFFee).toBeLessThanOrEqual(
        fixture.expected.estimatedRBFFee + feeTolerance,
      );

      // Ensure the minimum CPFP fee is greater than or equal to the estimated CPFP fee
      expect(minimumCPFPFee).toBeGreaterThanOrEqual(
        fixture.expected.estimatedCPFPFee,
      );

      // Ensure the minimum CPFP fee is not more than 5 sats above the estimated CPFP fee
      expect(minimumCPFPFee).toBeLessThanOrEqual(
        fixture.expected.estimatedCPFPFee + feeTolerance,
      );

      expect(analyzer.inputs.map((input) => input.sequence)).toEqual(
        fixture.expected.inputSequences,
      );
      expect(analyzer.outputs.map((output) => output.amountSats)).toEqual(
        fixture.expected.outputValues.map(String),
      );
    });
  });

  transactionAnalyzerFixtures.invalidTransactions.forEach((fixture) => {
    test(`Invalid Transaction: ${fixture.case}`, () => {
      expect(() => {
        new TransactionAnalyzer({
          txHex: fixture.txHex,
          ...fixture.options,
          requiredSigners: 1,
          totalSigners: 2,
          addressType: "P2SH",
        });
      }).toThrow();
    });
  });
});
