import { TransactionAnalyzer } from "./transactionAnalyzer";
import { Network } from "@caravan/bitcoin";
import { FeeBumpStrategy } from "./types";

describe("TransactionAnalyzer", () => {
  const baseOptions = {
    network: Network.TESTNET,
    targetFeeRate: 10,
    currentFeeRate: 5,
    availableUTXOs: [],
    dustThreshold: 546,
    changeOutputIndex: undefined,
    requiredSigners: 2,
    totalSigners: 3,
  };

  describe("RBF-enabled transaction", () => {
    const rbfTxHex =
      "0100000001d648902eeb66bd0f178911b0a498732d5e3fc66759f38ba0fb7c3f2943eed3c00100000000fdffffff02c4a4000000000000160014d7993090f0a05b0b3d4874f43f87ea71749e6b02db87050000000000160014bf3037c4235c769005600fe3301fc0723f9fb53d00000000";
    let analyzer: TransactionAnalyzer;

    beforeEach(() => {
      analyzer = new TransactionAnalyzer(rbfTxHex, baseOptions);
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

    // test("should correctly identify output types", () => {
    //   expect(
    //     analyzer.outputs.every((output) => output.address.startsWith("tb1q")),
    //   ).toBe(true); // P2WPKH addresses start with 'tb1q' on testnet
    // });

    test("should recommend RBF as fee bump strategy", () => {
      expect(analyzer.recommendedStrategy).toBe(FeeBumpStrategy.RBF);
    });
  });

  describe("Non-RBF transaction", () => {
    const nonRbfTxHex =
      "01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff08049d8e2f1b025e0fffffffff0100f2052a01000000434104bc760547261549265224df558f65bca88d4322429d88373ffff457c513b5cc912a1a7ee1f4d51d401713a64548e0095cdd94238764a9fe140534a83ee40e8e66ac00000000";
    let analyzer: TransactionAnalyzer;

    beforeEach(() => {
      analyzer = new TransactionAnalyzer(nonRbfTxHex, baseOptions);
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

    // test("should correctly identify output type", () => {
    //   expect(
    //     analyzer.outputs[0].address.startsWith("m") ||
    //       analyzer.outputs[0].address.startsWith("n"),
    //   ).toBe(true); // P2PK addresses start with 'm' or 'n' on testnet
    // });

    test("should not recommend RBF as fee bump strategy", () => {
      expect(analyzer.recommendedStrategy).not.toBe(FeeBumpStrategy.RBF);
    });
  });

  describe("CPFP-candidate transaction", () => {
    const cpfpTxHex =
      "01000000030000000000000000000000000000000000000000000000000000000000000000ffffffff020132ffffffffaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa0000000000ffffffffaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa0000000000ffffffff0200f2052a010000004341044bba96f11c40ad31294391ac69d6bb29fbcf145db8f14aa6aea43e3ed0c748dd475b9fff383e6bfdd8ee3749b1d1e240298655d1aa3119f03d36736d41a98145ac00f2052a010000000000000000";
    let analyzer: TransactionAnalyzer;

    beforeEach(() => {
      analyzer = new TransactionAnalyzer(cpfpTxHex, baseOptions);
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
    const rbfTxHex =
      "0100000001d648902eeb66bd0f178911b0a498732d5e3fc66759f38ba0fb7c3f2943eed3c00100000000fdffffff02c4a4000000000000160014d7993090f0a05b0b3d4874f43f87ea71749e6b02db87050000000000160014bf3037c4235c769005600fe3301fc0723f9fb53d00000000";
    let analyzer: TransactionAnalyzer;

    beforeEach(() => {
      analyzer = new TransactionAnalyzer(rbfTxHex, {
        ...baseOptions,
        targetFeeRate: 20,
        currentFeeRate: 10,
      });
    });

    test("should calculate correct fee rate", () => {
      expect(parseFloat(analyzer.feeRate)).toBeCloseTo(10, 1);
    });

    test("should estimate RBF fee correctly", () => {
      const estimatedRbfFee = analyzer.estimateRBFFee();
      expect(parseFloat(estimatedRbfFee)).toBeGreaterThan(0);
    });

    test("should estimate CPFP fee correctly", () => {
      const estimatedCpfpFee = analyzer.estimateCPFPFee();
      expect(parseFloat(estimatedCpfpFee)).toBeGreaterThan(0);
    });
  });

  describe("Edge cases", () => {
    test("should throw error for invalid transaction", () => {
      const invalidTxHex =
        "010000000001000100e1f505000000001600143d908a60dab5aaf7a47d425c5c12d2e15c72c3670000000000";
      expect(() => new TransactionAnalyzer(invalidTxHex, baseOptions)).toThrow(
        /Invalid transaction:/,
      );
    });

    test("should throw error for transaction with no inputs", () => {
      const noInputTxHex =
        "0100000000010100e1f505000000001600143d908a60dab5aaf7a47d425c5c12d2e15c72c3670000000000";
      expect(
        () => new TransactionAnalyzer(noInputTxHex, baseOptions),
      ).toThrow();
    });

    test("should throw error for transaction with no outputs", () => {
      const noOutputTxHex =
        "01000000019b42a5b77ab117ebe260dd9cc8d9839fb3d0df51fce987f7f0de7de82d0f1780000000006a4730440220128578ff3a3e186c3ec24b50984c45f6aba3da8e37a37b29686161efcd79e6270220464e2d9da4fafd5ac88dd36ecf9507a0af1de6c443ded547003a29a5b7654a76012103c11b722f0a8d12ee3ea9fc5d9ca91ffecab345ecceef1d5c78bc9761fb0638ffffffffff00000000";
      expect(
        () => new TransactionAnalyzer(noOutputTxHex, baseOptions),
      ).toThrow();
    });

    test("should handle extremely high fee rate", () => {
      const highFeeRateTxHex =
        "0100000001d648902eeb66bd0f178911b0a498732d5e3fc66759f38ba0fb7c3f2943eed3c00100000000fdffffff01c4a4000000000000160014d7993090f0a05b0b3d4874f43f87ea71749e6b0200000000";
      const analyzer = new TransactionAnalyzer(highFeeRateTxHex, {
        ...baseOptions,
        currentFeeRate: 1000,
      });
      expect(parseFloat(analyzer.feeRate)).toBeGreaterThan(100);
      expect(analyzer.recommendedStrategy).toBe(FeeBumpStrategy.NONE);
    });

    test("should handle transaction with minimum allowed inputs and outputs", () => {
      const minTxHex =
        "0100000001d648902eeb66bd0f178911b0a498732d5e3fc66759f38ba0fb7c3f2943eed3c00100000000fdffffff01c4a4000000000000160014d7993090f0a05b0b3d4874f43f87ea71749e6b0200000000";
      const analyzer = new TransactionAnalyzer(minTxHex, baseOptions);
      expect(analyzer.inputs.length).toBe(1);
      expect(analyzer.outputs.length).toBe(1);
      expect(analyzer.canRBF).toBe(true);
      expect(analyzer.canCPFP).toBe(true);
    });
  });

  describe("Comprehensive analysis", () => {
    const txHex =
      "0100000001d648902eeb66bd0f178911b0a498732d5e3fc66759f38ba0fb7c3f2943eed3c00100000000fdffffff02c4a4000000000000160014d7993090f0a05b0b3d4874f43f87ea71749e6b02db87050000000000160014bf3037c4235c769005600fe3301fc0723f9fb53d00000000";
    let analyzer: TransactionAnalyzer;

    beforeEach(() => {
      analyzer = new TransactionAnalyzer(txHex, baseOptions);
    });

    test("should perform full analysis", () => {
      const analysis = analyzer.analyze();
      // Check if all expected properties exist
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

      // Check types of properties
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
      expect(typeof analysis.estimatedRBFFee).toBe("string");
      expect(typeof analysis.estimatedCPFPFee).toBe("string");

      // Check some specific values
      expect(analysis.vsize).toBe(113);
      expect(analysis.weight).toBe(452);
      expect(analysis.inputs.length).toBe(1);
      expect(analysis.outputs.length).toBe(2);
    });
  });
});
