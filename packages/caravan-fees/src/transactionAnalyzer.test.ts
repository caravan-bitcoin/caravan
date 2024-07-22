import { Transaction } from "bitcoinjs-lib-v5";
import { analyzeTransaction } from "./transactionAnalyzer";
import BigNumber from "bignumber.js";
import { UTXO, FeeRate } from "./types";
import * as utils from "./utils";

// Mock the utility functions
jest.mock("./utils", () => ({
  isRBFSignaled: jest.fn(),
  calculateEffectiveFeeRate: jest.fn(),
}));

describe("analyzeTransaction", () => {
  let mockTransaction: Transaction;
  let mockUTXOs: UTXO[];
  let mockCurrentNetworkFeeRate: FeeRate;

  beforeEach(() => {
    mockTransaction = {
      outs: [{ value: 1000 }, { value: 2000 }],
    } as unknown as Transaction;

    mockUTXOs = [
      { txid: "txid1", vout: 0, value: new BigNumber(3000) },
    ] as UTXO[];

    mockCurrentNetworkFeeRate = { satoshisPerByte: 5 };

    // Reset mock function calls
    (utils.isRBFSignaled as jest.Mock).mockReset();
    (utils.calculateEffectiveFeeRate as jest.Mock).mockReset();
  });

  it("should recommend RBF when both RBF and CPFP are possible and current fee is low", async () => {
    (utils.isRBFSignaled as jest.Mock).mockReturnValue(true);
    (utils.calculateEffectiveFeeRate as jest.Mock).mockReturnValue({
      satoshisPerByte: 3,
    });

    const result = await analyzeTransaction(
      mockTransaction,
      mockUTXOs,
      mockCurrentNetworkFeeRate
    );

    expect(result.canRBF).toBe(true);
    expect(result.canCPFP).toBe(true);
    expect(result.recommendedMethod).toBe("RBF");
    expect(result.currentFeeRate).toEqual({ satoshisPerByte: 3 });
  });

  it("should recommend CPFP when both RBF and CPFP are possible but current fee is close to network rate", async () => {
    (utils.isRBFSignaled as jest.Mock).mockReturnValue(true);
    (utils.calculateEffectiveFeeRate as jest.Mock).mockReturnValue({
      satoshisPerByte: 4.5,
    });

    const result = await analyzeTransaction(
      mockTransaction,
      mockUTXOs,
      mockCurrentNetworkFeeRate
    );

    expect(result.canRBF).toBe(true);
    expect(result.canCPFP).toBe(true);
    expect(result.recommendedMethod).toBe("CPFP");
    expect(result.currentFeeRate).toEqual({ satoshisPerByte: 4.5 });
  });

  it("should recommend RBF when only RBF is possible", async () => {
    (utils.isRBFSignaled as jest.Mock).mockReturnValue(true);
    (utils.calculateEffectiveFeeRate as jest.Mock).mockReturnValue({
      satoshisPerByte: 3,
    });
    mockTransaction.outs = [{ value: 500 }]; // Below dust limit, so CPFP not possible

    const result = await analyzeTransaction(
      mockTransaction,
      mockUTXOs,
      mockCurrentNetworkFeeRate
    );

    expect(result.canRBF).toBe(true);
    expect(result.canCPFP).toBe(false);
    expect(result.recommendedMethod).toBe("RBF");
  });

  it("should recommend CPFP when only CPFP is possible", async () => {
    (utils.isRBFSignaled as jest.Mock).mockReturnValue(false);
    (utils.calculateEffectiveFeeRate as jest.Mock).mockReturnValue({
      satoshisPerByte: 3,
    });

    const result = await analyzeTransaction(
      mockTransaction,
      mockUTXOs,
      mockCurrentNetworkFeeRate
    );

    expect(result.canRBF).toBe(false);
    expect(result.canCPFP).toBe(true);
    expect(result.recommendedMethod).toBe("CPFP");
  });

  it("should return null recommendedMethod when neither RBF nor CPFP is possible", async () => {
    (utils.isRBFSignaled as jest.Mock).mockReturnValue(false);
    (utils.calculateEffectiveFeeRate as jest.Mock).mockReturnValue({
      satoshisPerByte: 3,
    });
    mockTransaction.outs = [{ value: 500 }]; // Below dust limit, so CPFP not possible

    const result = await analyzeTransaction(
      mockTransaction,
      mockUTXOs,
      mockCurrentNetworkFeeRate
    );

    expect(result.canRBF).toBe(false);
    expect(result.canCPFP).toBe(false);
    expect(result.recommendedMethod).toBeNull();
    expect(result.reason).toBe(
      "This transaction cannot be fee bumped using RBF or CPFP."
    );
  });

  it("should handle edge case with very high current fee rate", async () => {
    (utils.isRBFSignaled as jest.Mock).mockReturnValue(true);
    (utils.calculateEffectiveFeeRate as jest.Mock).mockReturnValue({
      satoshisPerByte: 1000,
    });

    const result = await analyzeTransaction(
      mockTransaction,
      mockUTXOs,
      mockCurrentNetworkFeeRate
    );

    expect(result.canRBF).toBe(true);
    expect(result.canCPFP).toBe(true);
    expect(result.recommendedMethod).toBe("CPFP");
    expect(result.currentFeeRate).toEqual({ satoshisPerByte: 1000 });
  });

  it("should handle edge case with very low current fee rate", async () => {
    (utils.isRBFSignaled as jest.Mock).mockReturnValue(true);
    (utils.calculateEffectiveFeeRate as jest.Mock).mockReturnValue({
      satoshisPerByte: 0.1,
    });

    const result = await analyzeTransaction(
      mockTransaction,
      mockUTXOs,
      mockCurrentNetworkFeeRate
    );

    expect(result.canRBF).toBe(true);
    expect(result.canCPFP).toBe(true);
    expect(result.recommendedMethod).toBe("RBF");
    expect(result.currentFeeRate).toEqual({ satoshisPerByte: 0.1 });
  });
});
