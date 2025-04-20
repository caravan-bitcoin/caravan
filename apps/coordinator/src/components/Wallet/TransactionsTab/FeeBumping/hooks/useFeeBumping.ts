import { useState, useCallback, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { FeeBumpStrategy } from "@caravan/fees";
import {
  FeeBumpOptions,
  FeeBumpResult,
  FeeBumpStatus,
  FeeBumpRecommendation,
  FeePriority,
} from "../types";
import {
  analyzeTransaction,
  extractUtxosForFeeBumping,
  getFeeEstimate,
  CONFIRMATION_TARGETS,
} from "../utils";
import { useRBF } from "./useRBF";
import { useWalletAddresses } from "../../hooks";
import { updateBlockchainClient } from "../../../../../actions/clientActions";
import { BlockchainClient } from "@caravan/clients";

/**
 * Hook for handling transaction fee bumping with comprehensive wallet integration
 *
 * This hook provides the core functionality for fee bumping in the Caravan wallet:
 * 1. Analyzes transactions to determine if RBF or CPFP is possible
 * 2. Gets real-time fee estimates from the blockchain using the `smart-fee` method
 * 3. Creates fee-bumped transactions (RBF or CPFP)
 * 4. Manages the fee bumping process state
 *
 * It fully integrates with the wallet state and blockchain client to provide
 * accurate UTXO information and fee estimates.
 */
export const useFeeBumpoing = () => {
  const dispatch = useDispatch();

  // Transaction state
  const [transaction, setTransaction] = useState<any | null>(null);
  const [txHex, setTxHex] = useState<string>("");

  // Fee bumping process state
  const [status, setStatus] = useState<FeeBumpStatus>(FeeBumpStatus.IDLE);
  const [error, setError] = useState<string | null>(null);

  // Analysis and recommendations
  const [recommendation, setRecommendation] =
    useState<FeeBumpRecommendation | null>(null);

  // User selections
  const [selectedStrategy, setSelectedStrategy] = useState<FeeBumpStrategy>(
    FeeBumpStrategy.NONE,
  );
  const [selectedFeeRate, setSelectedFeeRate] = useState<number>(0);
  const [selectedPriority, setSelectedPriority] = useState<FeePriority>(
    FeePriority.MEDIUM,
  );

  // Result of the fee bumping operation
  const [result, setResult] = useState<FeeBumpResult | null>(null);

  // Get wallet addresses for change output detection
  const walletAddresses = useWalletAddresses();

  // Get wallet configuration from Redux store
  const network = useSelector((state: any) => state.settings.network);
  const addressType = useSelector((state: any) => state.settings.addressType);
  const requiredSigners = useSelector(
    (state: any) => state.settings.requiredSigners,
  );
  const totalSigners = useSelector((state: any) => state.settings.totalSigners);

  // Get wallet state from Redux store
  const walletState = useSelector((state: any) => state);

  const {
    createAcceleratedRBF,
    createCancelRBF,
    isCreating: isCreatingRBF,
  } = useRBF();

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
    async (tx: any, priority: FeePriority = FeePriority.MEDIUM) => {
      if (!tx) return;
      try {
        setStatus(FeeBumpStatus.ANALYZING);
        setError(null);

        // Get blockchain client
        const blockchainClient = dispatch(
          updateBlockchainClient(),
        ) as unknown as BlockchainClient;
        if (!blockchainClient) {
          throw new Error("Blockchain client not available");
        }

        const rawTxHex: string = await blockchainClient.getTransactionHex(
          tx.txid,
        );

        // Extract UTXOs for fee bumping
        const availableUtxos = await extractUtxosForFeeBumping(
          tx,
          walletState,
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
          rawTxHex,
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

        setRecommendation(feeBumpRecommendation);

        // Set default strategy and fee rate based on analysis
        // Prefer RBF if available as it's typically more efficient
        if (feeBumpRecommendation.canRBF) {
          setSelectedStrategy(FeeBumpStrategy.RBF);
          setSelectedFeeRate(feeBumpRecommendation.suggestedRBFFeeRate!);
        } else if (feeBumpRecommendation.canCPFP) {
          setSelectedStrategy(FeeBumpStrategy.CPFP);
          setSelectedFeeRate(feeBumpRecommendation.suggestedCPFPFeeRate!);
        } else {
          setSelectedStrategy(FeeBumpStrategy.NONE);
          setSelectedFeeRate(feeBumpRecommendation.currentFeeRate!);
        }

        setStatus(FeeBumpStatus.READY);
      } catch (error) {
        console.error("Error analyzing transaction:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Unknown error analyzing transaction",
        );
        setStatus(FeeBumpStatus.ERROR);
      }
    },
    [
      dispatch,
      network,
      requiredSigners,
      totalSigners,
      addressType,
      walletState,
    ],
  );
};
