import { useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { FeeBumpStrategy } from "@caravan/fees";
import { FeeBumpStatus, FeeBumpRecommendation, FeePriority } from "../types";
import { analyzeTransaction, extractUtxosForFeeBumping } from "../utils";
import { updateBlockchainClient } from "../../../../../actions/clientActions";
import { BlockchainClient } from "@caravan/clients";
import {
  useFeeBumpTransaction,
  useFeeBumpTxHex,
  useFeeBumpRecommendation,
  useSelectedFeeBumpStrategy,
  useSelectedFeeRate,
  useSelectedFeePriority,
  useFeeBumpResult,
  useFeeBumpStatus,
  useFeeBumpError,
  useFeeBumpDispatch,
  setFeeBumpTransaction,
  setFeeBumpStatus,
  setFeeBumpError,
  setFeeBumpRecommendation,
  setFeeBumpStrategy,
  setFeeBumpRate,
  setFeeBumpPriority,
  resetFeeBumpState,
} from "../context";

/**
 * Hook for handling transaction fee bumping with FeeBumping Redux State...
 *
 * This hook provides the core functionality for fee bumping in the Caravan wallet:
 * 1. Analyzes transactions to determine if RBF or CPFP is possible
 * 2. Gets real-time fee estimates from the blockchain using the `smart-fee` method
 * 3. Creates fee-bumped transactions (RBF or CPFP)
 *
 * It only provides functions to perform operations that update the Redux state.
 */
export const useFeeBumping = () => {
  const dispatch = useDispatch();
  const feeBumpDispatch = useFeeBumpDispatch(); // dispatch for fee bump actions

  // Get all state from Context
  const transaction = useFeeBumpTransaction();
  const txHex = useFeeBumpTxHex();
  const status = useFeeBumpStatus();
  const error = useFeeBumpError();
  const recommendation = useFeeBumpRecommendation();
  const selectedStrategy = useSelectedFeeBumpStrategy();
  const selectedFeeRate = useSelectedFeeRate();
  const selectedPriority = useSelectedFeePriority();
  const result = useFeeBumpResult();

  // Get wallet configuration from Redux store
  const network = useSelector((state: any) => state.settings.network);
  const addressType = useSelector((state: any) => state.settings.addressType);
  const requiredSigners = useSelector(
    (state: any) => state.settings.requiredSigners,
  );
  const totalSigners = useSelector((state: any) => state.settings.totalSigners);

  // Get wallet nodes
  const depositNodes = useSelector((state: any) => state.wallet.deposits.nodes);
  const changeNodes = useSelector((state: any) => state.wallet.change.nodes);

  /**
   * Analyzes a transaction to determine fee bumping options
   *
   * This function:
   * 1. Gets real-time fee estimates from the blockchain client
   * 2. Extracts UTXOs from the wallet state
   * 3. Analyzes the transaction to determine if RBF or CPFP is possible
   * 4. Sets recommended fee rates based on current network conditions
   *
   * @param tx - The transaction object to analyze
   * @param rawTxHex - The raw transaction hex string
   */
  const analyzeTx = useCallback(
    async (
      tx: any,
      initialTxHex: string = "",
      priority: FeePriority = FeePriority.MEDIUM,
    ) => {
      if (!tx) return;
      try {
        feeBumpDispatch(setFeeBumpStatus(FeeBumpStatus.ANALYZING));
        feeBumpDispatch(setFeeBumpError(null));

        // Get blockchain client
        const blockchainClient = dispatch(
          updateBlockchainClient(),
        ) as unknown as BlockchainClient;
        if (!blockchainClient) {
          throw new Error("Blockchain client not available");
        }

        // Extract UTXOs for fee bumping
        const availableUtxos = await extractUtxosForFeeBumping(
          tx,
          depositNodes,
          changeNodes,
          blockchainClient,
        );

        if (!availableUtxos.length) {
          throw new Error("No UTXOs available for fee bumping");
        }
        const walletConfig = {
          requiredSigners,
          totalSigners,
          addressType,
        };

        // Analyze transaction for fee bumping options
        const analysis = await analyzeTransaction(
          initialTxHex,
          tx.fee, // Fee in satoshis
          network,
          availableUtxos,
          blockchainClient,
          walletConfig,
          priority,
        );
        // We add some additional UI-friendly details which we'll use to show the user
        const feeBumpRecommendation: FeeBumpRecommendation = {
          ...analysis,
          // Add more user-friendly fields
          currentFeeRate: analysis.feeRate,
          canRBF: analysis.canRBF,
          canCPFP: analysis.canCPFP,
          suggestedRBFFeeRate: Math.max(
            analysis.userSelectedFeeRate,
            Number(analysis.estimatedRBFFee) / analysis.vsize, // Is this correct ??
            // Noting that the new tx would have a size greater than original so at worst it gives a higher feeRate which is good
          ),
          suggestedCPFPFeeRate: Math.max(
            analysis.userSelectedFeeRate,
            Number(analysis.estimatedCPFPFee) / analysis.vsize, //  Is this correct ??
          ),
        };

        feeBumpDispatch(setFeeBumpRecommendation(feeBumpRecommendation));
        feeBumpDispatch(setFeeBumpStatus(FeeBumpStatus.READY));
      } catch (error) {
        console.error("Error analyzing transaction:", error);
        feeBumpDispatch(
          setFeeBumpError(
            error instanceof Error
              ? error.message
              : "Unknown error analyzing transaction",
          ),
        );
      }
    },
    [
      dispatch,
      feeBumpDispatch,
      network,
      requiredSigners,
      totalSigners,
      depositNodes,
      changeNodes,
      addressType,
    ],
  );

  /**
   * Sets a transaction for fee bumping and analyzes it
   *
   * This function is called when a user selects a transaction to fee bump.
   * It sets the transaction data and initiates the analysis process.
   *
   * @param tx - The transaction object to fee bump
   * @param rawTxHex - The raw transaction hex string
   * @param priority - Optional fee priority level (defaults to MEDIUM)
   * @returns Promise that resolves when analysis is complete
   */
  const setTransactionForBumping = useCallback(
    async (
      tx: any,
      priority: FeePriority = FeePriority.MEDIUM,
      initialTxHex: string = "",
    ) => {
      feeBumpDispatch(setFeeBumpTransaction(tx, initialTxHex));
      feeBumpDispatch(setFeeBumpPriority(priority));
      await analyzeTx(tx, initialTxHex, priority);
    },
    [analyzeTx, feeBumpDispatch],
  );

  /**
   * Updates the selected fee rate
   *
   * @param feeRate - New fee rate in sat/vB
   */
  const updateFeeRate = useCallback(
    (feeRate: number) => {
      dispatch(setFeeBumpRate(feeRate));
    },
    [feeBumpDispatch],
  );

  /**
   * Updates the fee priority and recalculates the recommended fee rate
   *
   * @param priority - New fee priority level
   */
  const updateFeePriority = useCallback(
    async (priority: FeePriority) => {
      if (!transaction || !txHex) {
        console.warn("Cannot update fee priority: No transaction selected");
        return;
      }
      feeBumpDispatch(setFeeBumpPriority(priority));
    },
    [transaction, analyzeTx, txHex, feeBumpDispatch],
  );

  /**
   * Updates the selected strategy and associated fee rate
   *
   * @param strategy - Selected fee bumping strategy
   */
  const updateStrategy = useCallback(
    (strategy: FeeBumpStrategy) => {
      if (strategy === FeeBumpStrategy.NONE) {
        console.warn("Cannot select NONE as a strategy");
        return;
      }
      feeBumpDispatch(setFeeBumpStrategy(strategy));
    },
    [feeBumpDispatch],
  );

  /**
   * Resets the fee bumping state
   *
   * This function clears all state related to the current fee bump operation
   * and returns the hook to its initial state.
   */
  const reset = useCallback(() => {
    dispatch(resetFeeBumpState());
  }, [dispatch]);

  // Return the hook's API
  return {
    // State (from Redux)
    transaction,
    txHex,
    status,
    error,
    recommendation,
    selectedStrategy,
    selectedFeeRate,
    selectedPriority,
    result,

    // Operations (dispatch Redux actions)
    setTransactionForBumping,
    updateFeeRate,
    updateFeePriority,
    updateStrategy,
    reset,
  };
};
