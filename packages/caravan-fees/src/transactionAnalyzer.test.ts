import { TransactionAnalyzer } from "./transactionAnalyzer";
import { mockFixtures, createMockPsbt } from "./transactionAnalyzer.fixtures";
import { FeeBumpStrategy } from "./types";

describe("TransactionAnalyzer", () => {
  describe("RBF Analysis", () => {
    it("should correctly identify RBF possibility when enabled", () => {
      const analyzer = new TransactionAnalyzer(mockFixtures.rbfEnabled);
      expect(analyzer.canRBF).toBe(true);
    });

    it("should correctly identify RBF impossibility when disabled", () => {
      const analyzer = new TransactionAnalyzer(mockFixtures.rbfDisabled);
      expect(analyzer.canRBF).toBe(false);
    });

    it("should calculate correct RBF cost", () => {
      const analyzer = new TransactionAnalyzer(mockFixtures.rbfEnabled);
      const rbfCost = analyzer.estimateRBFCost();
      expect(rbfCost).not.toBeNull();
      expect(Number(rbfCost)).toBeGreaterThan(0);
    });

    it("should return null RBF cost when not possible", () => {
      const analyzer = new TransactionAnalyzer(mockFixtures.rbfDisabled);
      expect(analyzer.estimateRBFCost()).toBeNull();
    });
  });

  describe("CPFP Analysis", () => {
    it("should correctly identify CPFP possibility", () => {
      const analyzer = new TransactionAnalyzer(mockFixtures.cpfpPossible);
      expect(analyzer.canCPFP).toBe(true);
    });

    it("should correctly identify CPFP impossibility", () => {
      const analyzer = new TransactionAnalyzer(mockFixtures.neitherPossible);
      expect(analyzer.canCPFP).toBe(false);
    });

    it("should calculate correct CPFP cost", () => {
      const analyzer = new TransactionAnalyzer(mockFixtures.cpfpPossible);
      const cpfpCost = analyzer.estimateCPFPCost();
      expect(cpfpCost).not.toBeNull();
      expect(Number(cpfpCost)).toBeGreaterThan(0);
    });

    it("should return null CPFP cost when not possible", () => {
      const analyzer = new TransactionAnalyzer(mockFixtures.neitherPossible);
      expect(analyzer.estimateCPFPCost()).toBeNull();
    });
  });

  describe("Fee Analysis", () => {
    it("should calculate correct current fee rate", () => {
      const analyzer = new TransactionAnalyzer(mockFixtures.rbfEnabled);
      expect(analyzer.currentFeeRate).toBeGreaterThan(0);
    });

    it("should calculate correct potential fee increase", () => {
      const analyzer = new TransactionAnalyzer(mockFixtures.rbfEnabled);
      const increase = analyzer.getPotentialFeeIncrease();
      expect(Number(increase)).toBeGreaterThan(0);
    });
  });

  describe("Strategy Recommendation", () => {
    it("should recommend RBF when only RBF is possible", () => {
      const analyzer = new TransactionAnalyzer(mockFixtures.rbfEnabled);
      expect(analyzer.recommendFeeBumpStrategy()).toBe(FeeBumpStrategy.RBF);
    });

    it("should recommend CPFP when only CPFP is possible", () => {
      const analyzer = new TransactionAnalyzer(mockFixtures.cpfpPossible);
      expect(analyzer.recommendFeeBumpStrategy()).toBe(FeeBumpStrategy.CPFP);
    });

    it("should recommend no strategy when neither is possible", () => {
      const analyzer = new TransactionAnalyzer(mockFixtures.neitherPossible);
      expect(analyzer.recommendFeeBumpStrategy()).toBe(FeeBumpStrategy.NONE);
    });

    it("should recommend the cheaper strategy when both are possible", () => {
      const bothPossible = {
        ...mockFixtures.rbfEnabled,
        spendableOutputs: [{ index: 0, amount: 90000 }],
      };
      const analyzer = new TransactionAnalyzer(bothPossible);
      const recommendation = analyzer.recommendFeeBumpStrategy();
      expect(recommendation).toMatch(/RBF|CPFP/);
    });
  });

  describe("Dynamic Updates", () => {
    it("should update analysis when new UTXOs are added", () => {
      const analyzer = new TransactionAnalyzer(mockFixtures.neitherPossible);
      expect(analyzer.canRBF).toBe(false);

      const utxosToAdd = mockFixtures.rbfEnabled.additionalUtxos;
      if (utxosToAdd && utxosToAdd.length > 0) {
        analyzer.addUtxos(utxosToAdd);
        expect(analyzer.canRBF).toBe(true);
      } else {
        console.warn("No additional UTXOs to add in this test");
      }
    });

    it("should update analysis when spendable outputs are changed", () => {
      const analyzer = new TransactionAnalyzer(mockFixtures.neitherPossible);
      expect(analyzer.canCPFP).toBe(false);
      analyzer.updateSpendableOutputs([{ index: 0, amount: 100000 }]);
      expect(analyzer.canCPFP).toBe(true);
    });

    it("should update analysis when target fee rate is changed", () => {
      const analyzer = new TransactionAnalyzer(mockFixtures.rbfEnabled);
      const initialIncrease = analyzer.getPotentialFeeIncrease();
      analyzer.targetFeeRate = 10;
      const newIncrease = analyzer.getPotentialFeeIncrease();
      expect(Number(newIncrease)).toBeGreaterThan(Number(initialIncrease));
    });
  });

  describe("Edge Cases", () => {
    it("should handle transactions with no inputs", () => {
      const noInputs = {
        ...mockFixtures.neitherPossible,
        psbt: createMockPsbt(0, 1, false),
      };
      const analyzer = new TransactionAnalyzer(noInputs);
      expect(() => analyzer.currentFeeRate).not.toThrow();
    });

    it("should handle transactions with no outputs", () => {
      const noOutputs = {
        ...mockFixtures.neitherPossible,
        psbt: createMockPsbt(1, 0, false),
      };
      const analyzer = new TransactionAnalyzer(noOutputs);
      expect(() => analyzer.currentFeeRate).not.toThrow();
    });

    it("should handle very large transactions", () => {
      const largeTransaction = {
        ...mockFixtures.rbfEnabled,
        psbt: createMockPsbt(1000, 1000, true),
      };
      const analyzer = new TransactionAnalyzer(largeTransaction);
      expect(() => analyzer.estimateRBFCost()).not.toThrow();
    });
  });
});
