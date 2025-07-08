import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useCallback,
  useMemo,
  useState,
} from "react";
import { useSelector } from "react-redux";

import {
  FeeBumpStrategy,
  SCRIPT_TYPES,
  createAcceleratedRbfTransaction,
  createCancelRbfTransaction,
  AcceleratedRbfOptions,
  CancelRbfOptions,
} from "@caravan/fees";

import { useFeeEstimates } from "clients/fees";
import { usePendingUtxos, useWalletUtxos } from "hooks/utxos";
import { getWalletConfig } from "../../../../../selectors/wallet";
import { Network } from "@caravan/bitcoin";

import {
  feeBumpingReducer,
  initialState,
  FeeBumpingState,
} from "./feeBumpReducer";
import {
  setFeeBumpTransaction,
  setFeeBumpStatus,
  setFeeBumpError,
  setFeeBumpRecommendation,
  setFeeBumpStrategy,
  setFeeBumpRate,
  setFeeBumpPriority,
  setFeeBumpResult,
  setRbfType,
  setCancelAddress,
  setChangeAddress,
  setPsbtVersion,
  resetFeeBumpState,
  FeeBumpActionTypes,
} from "./feeBumpActions";

import {
  FeeBumpStatus,
  FeeBumpRecommendation,
  FeePriority,
  FeeBumpResult,
} from "../types";
import {
  analyzeTransaction,
  extractUtxosForFeeBumping,
  extractGlobalXpubsFromWallet,
  selectTargetFeeRate,
} from "../utils";
import { getChangeOutputIndex } from "utils/transactionCalculations";

interface FeeBumpContextType {
  state: FeeBumpingState;
  dispatch: React.Dispatch<FeeBumpActionTypes>;
  // Core fee bumping operations
  analyzeTx: (
    tx: any,
    initialTxHex?: string,
    priority?: FeePriority,
  ) => Promise<void>;
  setTransactionForBumping: (
    tx: any,
    priority?: FeePriority,
    initialTxHex?: string,
  ) => Promise<void>;
  updateFeeRate: (feeRate: number) => void;
  updateFeePriority: (priority: FeePriority) => Promise<void>;
  updateStrategy: (strategy: FeeBumpStrategy) => void;
  reset: () => void;

  // RBF operations
  createAcceleratedRBF: (options?: {
    changeAddress?: string;
    feeRate?: number;
  }) => Promise<FeeBumpResult>;
  createCancelRBF: (options?: {
    cancelAddress?: string;
    feeRate?: number;
  }) => Promise<FeeBumpResult>;

  createFeeBumpedTransaction: (customOptions: {
    isCancel?: boolean;
    cancelAddress?: string;
    changeAddress?: string;
  }) => Promise<FeeBumpResult>;

  // RBF form actions
  setRbfType: (type: "accelerate" | "cancel") => void;
  setCancelAddress: (address: string) => void;
  setChangeAddress: (address: string) => void;
  setPsbtVersion: (version: "v2" | "v0") => void;

  // Computed values
  isFeeBumpReady: boolean;
  originalFeeRate: number;
  minimumFeeRate: number;
  estimatedNewFee: number;
  feeDifference: number;
  isRbfFormValid: boolean;

  // Loading states
  isCreatingRBF: boolean;
}

const FeeBumpContext = createContext<FeeBumpContextType | undefined>(undefined);

interface FeeBumpProviderProps {
  children: ReactNode;
}

export function FeeBumpProvider({ children }: FeeBumpProviderProps) {
  const [state, dispatch] = useReducer(feeBumpingReducer, initialState);
  const { data: feeEstimates } = useFeeEstimates();
  const currentTxid = state.transaction?.txid || ""; // as intially no tx is selec
  const { utxos: pendingUtxos } = usePendingUtxos(currentTxid);
  const walletUtxos = useWalletUtxos();

  // Local loading state for RBF operations
  const [isCreatingRBF, setIsCreatingRBF] = useState(false);

  // Get wallet configuration and nodes from Redux
  const walletConfig = useSelector(getWalletConfig);
  const { network, addressType, requiredSigners, totalSigners } = walletConfig;
  const depositNodes = useSelector((state: any) => state.wallet.deposits.nodes);
  const changeNodes = useSelector((state: any) => state.wallet.change.nodes);
  const defaultChangeAddress = useSelector(
    (state: any) => state.wallet?.change?.nextNode?.multisig?.address,
  );

  // Combine UTXOs for fee bumping
  const availableUtxos = useMemo(() => {
    if (!pendingUtxos?.length || !walletUtxos?.length) return [];
    return extractUtxosForFeeBumping(pendingUtxos, walletUtxos);
  }, [pendingUtxos, walletUtxos]);

  // =============================================================================
  // COMPUTED VALUES
  // =============================================================================

  const originalFeeRate = useMemo(() => {
    if (!state.transaction) return 0;
    const txSize = state.transaction.vsize || state.transaction.size;
    return txSize ? state.transaction.fee / txSize : 0;
  }, [state.transaction]);

  const minimumFeeRate = useMemo(
    () => Math.max(originalFeeRate + 1, 1),
    [originalFeeRate],
  );

  const estimatedNewFee = useMemo(() => {
    if (!state.transaction || !state.selectedFeeRate) return 0;
    const txVsize = state.transaction.vsize || state.transaction.size || 250;
    return Math.ceil(txVsize * state.selectedFeeRate);
  }, [state.transaction, state.selectedFeeRate]);

  const feeDifference = useMemo(() => {
    if (!state.transaction) return 0;
    return estimatedNewFee - state.transaction.fee;
  }, [state.transaction, estimatedNewFee]);

  const isFeeBumpReady = useMemo(
    () =>
      state.recommendation !== null &&
      state.selectedStrategy !== FeeBumpStrategy.NONE &&
      state.selectedFeeRate > 0,
    [state.recommendation, state.selectedStrategy, state.selectedFeeRate],
  );

  const isRbfFormValid = useMemo(() => {
    if (state.selectedFeeRate < minimumFeeRate) return false;
    if (state.rbfType === "cancel" && !state.cancelAddress.trim()) return false;
    return true;
  }, [
    state.selectedFeeRate,
    minimumFeeRate,
    state.rbfType,
    state.cancelAddress,
  ]);

  // =============================================================================
  // HELPER FUNCTIONS
  // =============================================================================

  const getGlobalXpubs = useCallback(() => {
    return extractGlobalXpubsFromWallet(depositNodes, changeNodes);
  }, [depositNodes, changeNodes]);

  const getScriptType = useCallback(() => {
    switch (addressType) {
      case "P2SH-P2WSH":
        return SCRIPT_TYPES.P2SH_P2WSH;
      case "P2WSH":
        return SCRIPT_TYPES.P2WSH;
      case "P2SH":
        return SCRIPT_TYPES.P2SH;
      default:
        throw new Error(`Unsupported address type: ${addressType}`);
    }
  }, [addressType]);

  // =============================================================================
  // CORE FEE BUMPING OPERATIONS
  // =============================================================================

  const analyzeTx = useCallback(
    async (
      tx: any,
      initialTxHex: string = "",
      priority: FeePriority = FeePriority.MEDIUM,
    ) => {
      if (!tx) return;

      try {
        dispatch(setFeeBumpStatus(FeeBumpStatus.ANALYZING));
        dispatch(setFeeBumpError(null));

        const { HIGH, MEDIUM, LOW } = feeEstimates;
        const targetFeeRate = selectTargetFeeRate(state.selectedPriority, {
          high: HIGH!,
          medium: MEDIUM!,
          low: LOW!,
        });

        if (!availableUtxos.length) {
          throw new Error("No UTXOs available for fee bumping");
        }

        // Analyze transaction for fee bumping options
        const analysis = analyzeTransaction(
          initialTxHex,
          tx.fee,
          network as Network,
          availableUtxos,
          targetFeeRate,
          { requiredSigners, totalSigners, addressType },
          priority,
        );

        // Create user-friendly recommendation
        const feeBumpRecommendation: FeeBumpRecommendation = {
          ...analysis,
          currentFeeRate: analysis.feeRate,
          canRBF: analysis.canRBF,
          canCPFP: analysis.canCPFP,
          suggestedRBFFeeRate: Math.max(
            analysis.userSelectedFeeRate,
            Number(analysis.estimatedRBFFee) / analysis.vsize,
          ),
          suggestedCPFPFeeRate: Math.max(
            analysis.userSelectedFeeRate,
            Number(analysis.estimatedCPFPFee) / analysis.vsize,
          ),
        };

        dispatch(setFeeBumpRecommendation(feeBumpRecommendation));
        dispatch(setFeeBumpStatus(FeeBumpStatus.READY));
      } catch (error) {
        console.error("Error analyzing transaction:", error);
        dispatch(
          setFeeBumpError(
            error instanceof Error
              ? error.message
              : "Unknown error analyzing transaction",
          ),
        );
      }
    },
    [
      depositNodes,
      changeNodes,
      network,
      requiredSigners,
      totalSigners,
      addressType,
      availableUtxos,
    ],
  );

  const setTransactionForBumping = useCallback(
    async (
      tx: any,
      priority: FeePriority = FeePriority.MEDIUM,
      initialTxHex: string = "",
    ) => {
      dispatch(setFeeBumpTransaction(tx, initialTxHex));
      dispatch(setFeeBumpPriority(priority));
      await analyzeTx(tx, initialTxHex, priority);
    },
    [analyzeTx],
  );

  const updateFeeRate = useCallback((feeRate: number) => {
    dispatch(setFeeBumpRate(feeRate));
  }, []);

  const updateFeePriority = useCallback(
    async (priority: FeePriority) => {
      if (!state.transaction || !state.txHex) {
        console.warn("Cannot update fee priority: No transaction selected");
        return;
      }
      dispatch(setFeeBumpPriority(priority));
    },
    [state.transaction, state.txHex],
  );

  const updateStrategy = useCallback((strategy: FeeBumpStrategy) => {
    if (strategy === FeeBumpStrategy.NONE) {
      console.warn("Cannot select NONE as a strategy");
      return;
    }
    dispatch(setFeeBumpStrategy(strategy));
  }, []);

  const reset = useCallback(() => {
    dispatch(resetFeeBumpState());
  }, []);

  // =============================================================================
  // RBF OPERATIONS
  // =============================================================================

  /**
   * Creates an accelerated RBF transaction that keeps the same outputs but with a higher fee
   *
   * This function performs the following steps:
   * 1. Extracts UTXOs from wallet state
   * 2. Identifies the change output in the original transaction
   * 3. Creates an accelerated RBF transaction with the same outputs but higher fee
   * 4. Returns the base64-encoded PSBT
   *
   * @param options Transaction and fee rate details
   * @returns Promise resolving to the base64-encoded PSBT
   */
  const createAcceleratedRBF = useCallback(
    async (options?: { changeAddress?: string }): Promise<FeeBumpResult> => {
      if (!state.transaction || !state.txHex) {
        throw new Error("No transaction selected for RBF");
      }

      setIsCreatingRBF(true);
      dispatch(setFeeBumpStatus(FeeBumpStatus.CREATING));
      dispatch(setFeeBumpError(null));

      try {
        if (!availableUtxos.length) {
          throw new Error(
            "No UTXOs available for RBF.Transaction inputs may not be in your wallet.",
          );
        }

        const changeOutputIndex = getChangeOutputIndex(
          state.transaction,
          depositNodes,
          changeNodes,
        );

        // We need either a change index or a change address
        if (changeOutputIndex === undefined && !state.changeAddress) {
          throw new Error(
            "Could not determine change output. Please provide a change address.",
          );
        }

        // We determine change address with a clear priority:
        // 1. User-provided change address from the RBF form
        // 2. Change index from transaction analysis
        // 3. Default wallet change address
        const userProvidedChangeAddress = options?.changeAddress;
        const defaultStateChangeAddress = state.changeAddress;

        let changeOptions: Partial<
          Pick<AcceleratedRbfOptions, "changeAddress" | "changeIndex">
        > = {};

        if (userProvidedChangeAddress) {
          changeOptions = { changeAddress: userProvidedChangeAddress };
        } else if (changeOutputIndex !== undefined) {
          changeOptions = { changeIndex: changeOutputIndex };
        } else if (defaultStateChangeAddress) {
          changeOptions = { changeAddress: defaultStateChangeAddress };
        } else if (defaultChangeAddress) {
          changeOptions = { changeAddress: defaultChangeAddress };
        } else {
          throw new Error(
            "Could not determine change output. Please provide a change address or ensure a change output exists in the original transaction.",
          );
        }

        // **Get global xpubs for PSBT**
        const globalXpubs = getGlobalXpubs();
        const scriptType = getScriptType();

        const rbfOptions: AcceleratedRbfOptions = {
          originalTx: state.txHex,
          network: network as Network,
          targetFeeRate: state.selectedFeeRate,
          absoluteFee: state.transaction.fee.toString(),
          availableInputs: availableUtxos,
          requiredSigners,
          totalSigners,
          scriptType,
          dustThreshold: "546", // Default dust threshold
          ...changeOptions,
          strict: false, // Less strict validation for better user experience
          fullRBF: false, // Only use signals RBF by default
          reuseAllInputs: true, // Safer option to prevent replacement cycle attacks
          globalXpubs, // **ADD GLOBAL XPUBS**
        };

        const psbtBase64 = createAcceleratedRbfTransaction(rbfOptions);

        // Calculate estimated new fee
        const txVsize = state.transaction.vsize || state.transaction.size;
        const estimatedNewFee = Math.ceil(
          txVsize * state.selectedFeeRate,
        ).toString();

        const result: FeeBumpResult = {
          psbtBase64: psbtBase64,
          newFee: estimatedNewFee,
          newFeeRate: state.selectedFeeRate,
          strategy: state.selectedStrategy,
          isCancel: false,
          priority: state.selectedPriority,
          createdAt: new Date().toISOString(),
        };

        dispatch(setFeeBumpResult(result));
        dispatch(setFeeBumpStatus(FeeBumpStatus.SUCCESS));

        return result;
      } catch (error) {
        console.error("Error creating accelerated RBF:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error creating RBF";
        dispatch(setFeeBumpError(errorMessage));
        dispatch(setFeeBumpStatus(FeeBumpStatus.ERROR));
        throw error;
      } finally {
        setIsCreatingRBF(false);
      }
    },
    [
      state.transaction,
      state.txHex,
      state.selectedFeeRate,
      state.changeAddress,
      depositNodes,
      changeNodes,
      getGlobalXpubs,
      getScriptType,
      network,
      requiredSigners,
      totalSigners,
      defaultChangeAddress,
      availableUtxos,
    ],
  );
  /**
   * Creates a cancel RBF transaction that redirects all funds to a new address
   *
   * This function performs the following steps:
   * 1. Extracts UTXOs from wallet state
   * 2. Creates a cancel RBF transaction that sends all funds to the specified address
   * 3. Returns the base64-encoded PSBT
   *
   * Cancel transactions are useful when you want to completely replace a
   * transaction, for example to stop a payment that hasn't confirmed yet.
   *
   * @param options Transaction and cancel address details
   * @returns Promise resolving to the base64-encoded PSBT
   *
   * @see https://bitcoinops.org/en/topics/replace-by-fee/
   */
  const createCancelRBF = useCallback(
    async (options?: { cancelAddress?: string }): Promise<FeeBumpResult> => {
      if (!state.transaction || !state.txHex) {
        throw new Error("No transaction selected for RBF");
      }

      const cancelAddress = options?.cancelAddress || state.cancelAddress;
      if (!cancelAddress) {
        throw new Error("Cancel address is required for cancel RBF");
      }

      setIsCreatingRBF(true);
      dispatch(setFeeBumpStatus(FeeBumpStatus.CREATING));
      dispatch(setFeeBumpError(null));

      try {
        if (!availableUtxos.length) {
          throw new Error("No UTXOs available for RBF");
        }

        const globalXpubs = getGlobalXpubs();
        const scriptType = getScriptType();

        const cancelRbfOptions: CancelRbfOptions = {
          originalTx: state.txHex,
          network: network as Network,
          targetFeeRate: state.selectedFeeRate,
          absoluteFee: state.transaction.fee.toString(),
          availableInputs: availableUtxos,

          requiredSigners,
          totalSigners,
          scriptType,
          dustThreshold: "546", // Default dust threshold
          cancelAddress,
          strict: false,
          fullRBF: false,
          reuseAllInputs: true,
          globalXpubs, // **ADD GLOBAL XPUBS**
        };

        const psbtBase64 = createCancelRbfTransaction(cancelRbfOptions);
        // Calculate estimated new fee
        const txVsize = state.transaction.vsize || state.transaction.size;
        const estimatedNewFee = Math.ceil(
          txVsize * state.selectedFeeRate,
        ).toString();

        // Create result
        const result: FeeBumpResult = {
          psbtBase64,
          newFee: estimatedNewFee,
          newFeeRate: state.selectedFeeRate,
          strategy: state.selectedStrategy,
          isCancel: true,
          priority: state.selectedPriority,
          createdAt: new Date().toISOString(),
        };

        dispatch(setFeeBumpResult(result));
        dispatch(setFeeBumpStatus(FeeBumpStatus.SUCCESS));

        return result;
      } catch (error) {
        console.error("Error creating cancel RBF:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Unknown error creating cancel RBF";
        dispatch(setFeeBumpError(errorMessage));
        dispatch(setFeeBumpStatus(FeeBumpStatus.ERROR));
        throw error;
      } finally {
        setIsCreatingRBF(false);
      }
    },
    [
      state.transaction,
      state.txHex,
      state.selectedFeeRate,
      state.cancelAddress,
      availableUtxos,
      depositNodes,
      changeNodes,
      getGlobalXpubs,
      getScriptType,
      network,
      requiredSigners,
      totalSigners,
    ],
  );

  /**
   * Creates a fee-bumped transaction based on RBF type
   */
  const createFeeBumpedTransaction = useCallback(
    async (
      customOptions: {
        isCancel?: boolean;
        cancelAddress?: string;
        changeAddress?: string;
      } = {},
    ): Promise<FeeBumpResult> => {
      const isCancel = customOptions.isCancel ?? state.rbfType === "cancel";

      if (isCancel) {
        return await createCancelRBF({
          cancelAddress: customOptions.cancelAddress,
        });
      } else {
        return await createAcceleratedRBF({
          changeAddress: customOptions.changeAddress,
        });
      }
    },
    [state.rbfType, createCancelRBF, createAcceleratedRBF],
  );

  // =============================================================================
  // RBF FORM ACTIONS
  // =============================================================================

  const handleSetRbfType = useCallback((type: "accelerate" | "cancel") => {
    dispatch(setRbfType(type));
  }, []);

  const handleSetCancelAddress = useCallback((address: string) => {
    dispatch(setCancelAddress(address));
  }, []);

  const handleSetChangeAddress = useCallback((address: string) => {
    dispatch(setChangeAddress(address));
  }, []);

  const handleSetPsbtVersion = useCallback((version: "v2" | "v0") => {
    dispatch(setPsbtVersion(version));
  }, []);

  // =============================================================================
  // CONTEXT VALUE
  // =============================================================================

  const contextValue: FeeBumpContextType = {
    // State
    state,
    //dispatch
    dispatch,
    // Core fee bumping operations
    analyzeTx,
    setTransactionForBumping,
    updateFeeRate,
    updateFeePriority,
    updateStrategy,
    reset,

    // RBF operations
    createAcceleratedRBF,
    createCancelRBF,
    createFeeBumpedTransaction,
    // RBF form actions
    setRbfType: handleSetRbfType,
    setCancelAddress: handleSetCancelAddress,
    setChangeAddress: handleSetChangeAddress,
    setPsbtVersion: handleSetPsbtVersion,

    // Computed values
    isFeeBumpReady,
    originalFeeRate,
    minimumFeeRate,
    estimatedNewFee,
    feeDifference,
    isRbfFormValid,

    // Loading states
    isCreatingRBF,
  };

  return (
    <FeeBumpContext.Provider value={contextValue}>
      {children}
    </FeeBumpContext.Provider>
  );
}

export function useFeeBumpContext() {
  const context = useContext(FeeBumpContext);
  if (context === undefined) {
    throw new Error("useFeeBumpContext must be used within a FeeBumpProvider");
  }
  return context;
}
