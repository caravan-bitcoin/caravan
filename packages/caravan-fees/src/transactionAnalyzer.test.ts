import { TransactionAnalyzer } from "./transactionAnalyzer";
import { fixtures } from "./transactionAnalyzer.fixtures";
import { FeeBumpStrategy } from "./types";

describe("TransactionAnalyzer", () => {
  describe("RBF Analysis", () => {
    it("should correctly identify RBF-signaled transactions", () => {
      const analyzer = new TransactionAnalyzer(fixtures.fixture1);
      expect(analyzer.canRBF).toBe(true);
    });

    it("should correctly identify non-RBF transactions", () => {
      const analyzer = new TransactionAnalyzer(fixtures.fixture2);
      expect(analyzer.canRBF).toBe(false);
    });

    it("should estimate RBF cost correctly", () => {
      const analyzer = new TransactionAnalyzer(fixtures.fixture1);
      const rbfCost = analyzer.estimateRBFCost();
      expect(rbfCost).not.toBeNull();
      expect(rbfCost!.isGreaterThan(0)).toBe(true);
    });
  });

  describe("CPFP Analysis", () => {
    it("should correctly identify CPFP possibility", () => {
      const analyzer = new TransactionAnalyzer(fixtures.fixture3);
      expect(analyzer.canCPFP).toBe(true);
    });

    it("should estimate CPFP cost correctly", () => {
      const analyzer = new TransactionAnalyzer(fixtures.fixture3);
      const cpfpCost = analyzer.estimateCPFPCost();
      expect(cpfpCost).not.toBeNull();
      expect(cpfpCost!.isGreaterThan(0)).toBe(true);
    });
  });

  describe("Fee Rate Calculations", () => {
    it("should calculate current fee rate correctly", () => {
      const analyzer = new TransactionAnalyzer(fixtures.fixture1);
      expect(analyzer.currentFeeRate).toBeGreaterThan(0);
    });

    it("should calculate potential fee increase correctly", () => {
      const analyzer = new TransactionAnalyzer(fixtures.fixture1);
      const increase = analyzer.getPotentialFeeIncrease();
      expect(increase.isGreaterThan(0)).toBe(true);
    });
  });

  describe("Strategy Recommendation", () => {
    it("should recommend RBF when only RBF is possible", () => {
      const analyzer = new TransactionAnalyzer(fixtures.fixture1);
      expect(analyzer.recommendFeeBumpStrategy()).toBe(FeeBumpStrategy.RBF);
    });

    it("should recommend CPFP when only CPFP is possible", () => {
      const cpfpOnlyFixture = {
        ...fixtures.fixture3,
        changeOutputs: [], // Remove change outputs to make RBF impossible
      };
      const analyzer = new TransactionAnalyzer(cpfpOnlyFixture);
      expect(analyzer.recommendFeeBumpStrategy()).toBe(FeeBumpStrategy.CPFP);
    });

    it("should recommend the cheaper strategy when both are possible", () => {
      const analyzer = new TransactionAnalyzer(fixtures.fixture3);
      const recommendation = analyzer.recommendFeeBumpStrategy();
      expect(recommendation).toMatch(/RBF|CPFP/);
    });
  });

  describe("UTXO Management", () => {
    it("should update analysis when new UTXOs are added", () => {
      const analyzer = new TransactionAnalyzer(fixtures.fixture1);
      const initialRbfCost = analyzer.estimateRBFCost();
      analyzer.addUtxos([
        {
          txid: "test",
          vout: 0,
          value: 10000,
          script: Buffer.from("test"),
        },
      ]);
      const newRbfCost = analyzer.estimateRBFCost();
      expect(newRbfCost!.isLessThan(initialRbfCost!)).toBe(true);
    });
  });

  describe("Output Management", () => {
    it("should update analysis when spendable outputs are changed", () => {
      const analyzer = new TransactionAnalyzer(fixtures.fixture3);
      const initialCpfpPossibility = analyzer.canCPFP;
      analyzer.updateSpendableOutputs([]);
      expect(analyzer.canCPFP).not.toBe(initialCpfpPossibility);
    });

    it("should update analysis when change outputs are changed", () => {
      const analyzer = new TransactionAnalyzer(fixtures.fixture1);
      const initialRbfPossibility = analyzer.canRBF;
      analyzer.updateChangeOutputs([]);
      expect(analyzer.canRBF).not.toBe(initialRbfPossibility);
    });
  });
});
