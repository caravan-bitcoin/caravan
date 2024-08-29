import { TransactionAnalyzer } from "../transactionAnalyzer";
import { transactionAnalyzerFixtures } from "./transactionAnalyzer.fixtures";
import { Network } from "@caravan/bitcoin";
import BigNumber from "bignumber.js";
import { estimateTransactionVsize } from "../utils";

describe("TransactionAnalyzer", () => {
  transactionAnalyzerFixtures.forEach((fixture) => {
    describe(fixture.name, () => {
      let analyzer: TransactionAnalyzer;

      beforeEach(() => {
        analyzer = new TransactionAnalyzer({
          txHex: fixture.test.txHex,
          network: fixture.test.network,
          targetFeeRate: fixture.test.targetFeeRate,
          absoluteFee: fixture.test.absoluteFee,
          changeOutputIndex: fixture.test.changeOutputIndex,
          availableUtxos: [],
          requiredSigners: 1,
          totalSigners: 2,
          addressType: "P2SH",
        });
      });

      test("should correctly identify transaction properties", () => {
        expect(analyzer.txid).toBe(fixture.expected.txid);
        // vsize can be off by 1 due to rounding
        expect(
          Math.abs(analyzer.vsize - fixture.expected.vsize),
        ).toBeLessThanOrEqual(1);
        expect(analyzer.weight).toBe(fixture.expected.weight);
        expect(analyzer.inputs.length).toBe(fixture.expected.inputCount);
        expect(analyzer.outputs.length).toBe(fixture.expected.outputCount);
      });

      test("should accurately calculate fee and fee rate", () => {
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
      });

      test("should correctly determine RBF and CPFP eligibility", () => {
        expect(analyzer.canRBF).toBe(fixture.expected.canRBF);
        expect(analyzer.canCPFP).toBe(fixture.expected.canCPFP);
      });

      test("should recommend the correct fee bump strategy", () => {
        expect(analyzer.recommendedStrategy).toBe(
          fixture.expected.recommendedStrategy,
        );
      });

      test("should accurately estimate RBF fee", () => {
        const estimatedRBFFee = new BigNumber(analyzer.estimateRBFFee);
        const expectedRBFFee = new BigNumber(fixture.expected.estimatedRBFFee);
        const allowedError = new BigNumber("1"); // 1 satoshi
        expect(
          estimatedRBFFee
            .minus(expectedRBFFee)
            .abs()
            .isLessThanOrEqualTo(allowedError),
        ).toBe(true);
      });

      test("should accurately estimate CPFP fee", () => {
        const estimatedCPFPFee = new BigNumber(analyzer.estimateCPFPFee);
        const expectedCPFPFee = new BigNumber(
          fixture.expected.estimatedCPFPFee,
        );
        const allowedError = new BigNumber("1"); // 1 satoshi

        expect(
          estimatedCPFPFee
            .minus(expectedCPFPFee)
            .abs()
            .isLessThanOrEqualTo(allowedError),
        ).toBe(true);
      });

      test("should correctly identify input sequences", () => {
        expect(analyzer.inputs.map((input) => input.sequence)).toEqual(
          fixture.expected.inputSequences,
        );
      });

      test("should correctly identify output values", () => {
        expect(analyzer.outputs.map((output) => output.value)).toEqual(
          fixture.expected.outputValues,
        );
      });

      test("should calculate correct RBF fee rate", () => {
        const rbfFeeRate = new BigNumber(analyzer.rbfFeeRate);
        const currentFeeRate = new BigNumber(analyzer.feeRate);
        const targetFeeRate = new BigNumber(fixture.test.targetFeeRate);
        const incrementalRelayFee = new BigNumber(1); // Assuming default value

        const minExpectedRate = BigNumber.max(
          currentFeeRate.plus(incrementalRelayFee),
          targetFeeRate,
        );

        expect(rbfFeeRate.isEqualTo(minExpectedRate)).toBe(true);
      });

      test("should calculate correct CPFP fee rate", () => {
        const cpfpFeeRate = new BigNumber(analyzer.cpfpFeeRate);
        const targetFeeRate = new BigNumber(fixture.test.targetFeeRate);
        const childSize = estimateTransactionVsize();
        const packageSize = analyzer.vsize + childSize;

        const desiredPackageFee = targetFeeRate.times(packageSize);
        const currentFee = new BigNumber(analyzer.fee);
        const expectedCPFPFeeRate = BigNumber.max(
          desiredPackageFee.minus(currentFee).dividedBy(childSize),
          new BigNumber(0),
        );

        expect(
          cpfpFeeRate.minus(expectedCPFPFeeRate).abs().isLessThan(0.1),
        ).toBe(true);
      });
    });
  });
});

describe("TransactionAnalyzer Edge Cases", () => {
  // Additional edge case tests
  test("should throw an error for invalid transaction hex", () => {
    expect(() => {
      new TransactionAnalyzer({
        txHex:
          "0100000002a4814fd0c260334875985613f95b012d9514a6f1d2979b29e0ada7f4f1c5987c010000006b483045022100af590e92332d1a28fd1635cfd86683843daafe875ece517061251844ba92788f022038510d3326532f9c525e298c550daddb2bfc52e34c735e541c96c0cf9e2e14200121021f097756ba020e8ba72f6bcde18dd757b9235b6f613fd4cc56fecd1caefc7a44ffffffff4a69a65d45163278be854789839e57bf2800e52a5a17f859a8236baace57695f000000006b48304502210094dfa2f4ebe267bc76e889ffac833f6e059781020a65e034dd174e74ef7d7ddb022009b245e4e20f44125859627ebc51f8d08e9f600b93a03d30ca8501e9e78f9d3801210290962152a37b473065ff2e8447733da18bfc13938d0cd5bd816154b5b52908d7ffffffff01010000000000000000000000",
        network: Network.MAINNET,
        targetFeeRate: 1,
        absoluteFee: "100",
        availableUtxos: [],
        requiredSigners: 1,
        totalSigners: 2,
        addressType: "P2SH",
      });
    }).toThrow();
  });

  test("should throw an error transactions with no inputs", () => {
    const noInputTxHex =
      "0200000000010000000000000000096a07546573744f505400000000";
    expect(() => {
      new TransactionAnalyzer({
        txHex: noInputTxHex,
        network: Network.MAINNET,
        targetFeeRate: 1,
        absoluteFee: "0",
        availableUtxos: [],
        requiredSigners: 1,
        totalSigners: 2,
        addressType: "P2SH",
      });
    }).toThrow();
  });

  test("should throw an error transactions with no outputs", () => {
    const noOutputTxHex =
      "0200000001f9df8cfa6cb54d8bd0f44d4d2b665a6ab11a0c61f08d5525bb9017eb3a83bf270000000000fdffffff0000000000";
    expect(() => {
      new TransactionAnalyzer({
        txHex: noOutputTxHex,
        network: Network.MAINNET,
        targetFeeRate: 1,
        absoluteFee: "51",
        availableUtxos: [],
        requiredSigners: 1,
        totalSigners: 2,
        addressType: "P2SH",
      });
    }).toThrow();
  });
});
