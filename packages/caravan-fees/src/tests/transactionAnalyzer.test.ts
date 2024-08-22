import { TransactionAnalyzer } from "../transactionAnalyzer";
import { FeeBumpStrategy } from "../types";
import {
  baseOptions,
  rbfTxHex,
  nonRbfTxHex,
  cpfpTxHex,
  invalidTxHex,
  noInputTxHex,
  noOutputTxHex,
  highFeeRateTxHex,
  minTxHex,
} from "../fixtures/transactionAnalyzer.fixtures";

describe("TransactionAnalyzer", () => {
  describe("RBF-enabled transaction", () => {
    let analyzer: TransactionAnalyzer;

    beforeEach(() => {
      analyzer = new TransactionAnalyzer({ ...baseOptions, txHex: rbfTxHex });
    });

    test("should correctly identify RBF signaling", () => {
      expect(analyzer.canRBF).toBe(true);
    });

    test("should have correct size", () => {
      expect(analyzer.vsize).toBe(113);
      expect(analyzer.weight).toBe(452);
    });

    test("should identify correct number of inputs and outputs", () => {
      expect(analyzer.inputs.length).toBe(1);
      expect(analyzer.outputs.length).toBe(2);
    });

    test("should recommend RBF as fee bump strategy", () => {
      expect(analyzer.recommendedStrategy).toBe(FeeBumpStrategy.RBF);
    });
  });

  describe("Non-RBF transaction", () => {
    let analyzer: TransactionAnalyzer;

    beforeEach(() => {
      analyzer = new TransactionAnalyzer({
        ...baseOptions,
        txHex: nonRbfTxHex,
      });
    });

    test("should correctly identify non-RBF signaling", () => {
      expect(analyzer.canRBF).toBe(false);
    });

    test("should have correct size", () => {
      expect(analyzer.vsize).toBe(135);
      expect(analyzer.weight).toBe(540);
    });

    test("should identify correct number of inputs and outputs", () => {
      expect(analyzer.inputs.length).toBe(1);
      expect(analyzer.outputs.length).toBe(1);
    });

    test("should not recommend RBF as fee bump strategy", () => {
      expect(analyzer.recommendedStrategy).not.toBe(FeeBumpStrategy.RBF);
    });
  });

  describe("CPFP-candidate transaction", () => {
    let analyzer: TransactionAnalyzer;

    beforeEach(() => {
      analyzer = new TransactionAnalyzer({ ...baseOptions, txHex: cpfpTxHex });
    });

    test("should have correct size", () => {
      expect(analyzer.vsize).toBe(220);
      expect(analyzer.weight).toBe(880);
    });

    test("should identify correct number of inputs and outputs", () => {
      expect(analyzer.inputs.length).toBe(3);
      expect(analyzer.outputs.length).toBe(2);
    });

    test("should identify CPFP opportunity", () => {
      expect(analyzer.canCPFP).toBe(true);
    });

    test("should recommend CPFP as fee bump strategy when RBF is not possible", () => {
      expect(analyzer.canRBF).toBe(false);
      expect(analyzer.recommendedStrategy).toBe(FeeBumpStrategy.CPFP);
    });
  });

  describe("Fee calculations", () => {
    let analyzer: TransactionAnalyzer;

    beforeEach(() => {
      analyzer = new TransactionAnalyzer({
        ...baseOptions,
        txHex: rbfTxHex,
        targetFeeRate: 20,
        absoluteFee: "1130",
      });
    });

    test("should calculate correct fee rate", () => {
      expect(parseFloat(analyzer.feeRate)).toBeCloseTo(10, 1);
    });

    test("should estimate RBF fee correctly", () => {
      expect(analyzer.estimateRBFFee).toBeGreaterThan(0);
    });

    test("should estimate CPFP fee correctly", () => {
      expect(analyzer.estimateCPFPFee).toBeGreaterThan(0);
    });
  });

  describe("Edge cases", () => {
    test("should throw error for invalid transaction", () => {
      expect(
        () => new TransactionAnalyzer({ ...baseOptions, txHex: invalidTxHex }),
      ).toThrow(/Invalid transaction:/);
    });

    test("should throw error for transaction with no inputs", () => {
      expect(
        () => new TransactionAnalyzer({ ...baseOptions, txHex: noInputTxHex }),
      ).toThrow();
    });

    test("should throw error for transaction with no outputs", () => {
      expect(
        () => new TransactionAnalyzer({ ...baseOptions, txHex: noOutputTxHex }),
      ).toThrow();
    });

    test("should handle extremely high fee rate", () => {
      const analyzer = new TransactionAnalyzer({
        ...baseOptions,
        txHex: highFeeRateTxHex,
        absoluteFee: "100000",
      });
      expect(parseFloat(analyzer.feeRate)).toBeGreaterThan(100);
      expect(analyzer.recommendedStrategy).toBe(FeeBumpStrategy.NONE);
    });

    test("should handle transaction with minimum allowed inputs and outputs", () => {
      const analyzer = new TransactionAnalyzer({
        ...baseOptions,
        txHex: minTxHex,
      });
      expect(analyzer.inputs.length).toBe(1);
      expect(analyzer.outputs.length).toBe(1);
      expect(analyzer.canRBF).toBe(true);
      expect(analyzer.canCPFP).toBe(true);
    });
  });

  describe("Comprehensive analysis", () => {
    let analyzer: TransactionAnalyzer;

    beforeEach(() => {
      analyzer = new TransactionAnalyzer({ ...baseOptions, txHex: rbfTxHex });
    });

    test("should perform full analysis", () => {
      const analysis = analyzer.analyze();

      expect(analysis).toHaveProperty("txid");
      expect(analysis).toHaveProperty("vsize");
      expect(analysis).toHaveProperty("weight");
      expect(analysis).toHaveProperty("fee");
      expect(analysis).toHaveProperty("feeRate");
      expect(analysis).toHaveProperty("inputs");
      expect(analysis).toHaveProperty("outputs");
      expect(analysis).toHaveProperty("isRBFSignaled");
      expect(analysis).toHaveProperty("canRBF");
      expect(analysis).toHaveProperty("canCPFP");
      expect(analysis).toHaveProperty("recommendedStrategy");
      expect(analysis).toHaveProperty("estimatedRBFFee");
      expect(analysis).toHaveProperty("estimatedCPFPFee");

      expect(typeof analysis.txid).toBe("string");
      expect(typeof analysis.vsize).toBe("number");
      expect(typeof analysis.weight).toBe("number");
      expect(typeof analysis.fee).toBe("string");
      expect(typeof analysis.feeRate).toBe("string");
      expect(Array.isArray(analysis.inputs)).toBe(true);
      expect(Array.isArray(analysis.outputs)).toBe(true);
      expect(typeof analysis.isRBFSignaled).toBe("boolean");
      expect(typeof analysis.canRBF).toBe("boolean");
      expect(typeof analysis.canCPFP).toBe("boolean");
      expect(typeof analysis.recommendedStrategy).toBe("string");
      expect(typeof analysis.estimatedRBFFee).toBe("number");
      expect(typeof analysis.estimatedCPFPFee).toBe("number");

      expect(analysis.vsize).toBe(113);
      expect(analysis.weight).toBe(452);
      expect(analysis.inputs.length).toBe(1);
      expect(analysis.outputs.length).toBe(2);
    });
  });
});
