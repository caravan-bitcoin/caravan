import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useCallback,
  useMemo,
  useState,
  useEffect,
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

import { FeePriority, useFeeEstimates } from "clients/fees";
import { usePendingUtxos, useWalletUtxos } from "hooks/utxos";
import {
  selectWalletConfig,
  getExtendedPublicKeyImporters,
  WalletState,
  getWalletAddresses,
  getChangeAddresses,
} from "../../../../../selectors/wallet";
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
} from "./feeBumpActions";

import { FeeBumpStatus, FeeBumpRecommendation, FeeBumpResult } from "../types";
import { analyzeTransaction, extractUtxosForFeeBumping } from "../utils";
import { getChangeOutputIndex } from "utils/transactionCalculations";

// =============================================================================
// CONTEXT TYPE DEFINITION
// =============================================================================

interface FeeBumpContextType {
  state: FeeBumpingState;

  // User-driven input updates (components can call these directly)
  setTransactionForBumping: (
    tx: any,
    priority?: FeePriority,
    initialTxHex?: string,
  ) => void;
  updateFeeRate: (feeRate: number) => void;
  updateFeePriority: (priority: FeePriority) => Promise<void>;
  updateStrategy: (strategy: FeeBumpStrategy) => void;
  reset: () => void;

  // RBF form actions (baed on user inputs)
  setRbfType: (type: "accelerate" | "cancel") => void;
  setCancelAddress: (address: string) => void;
  setChangeAddress: (address: string) => void;
  setPsbtVersion: (version: "v2" | "v0") => void;

  // Core fee bumping operations (handled internally by context)
  analyzeTx: (
    tx: any,
    initialTxHex?: string,
    priority?: FeePriority,
  ) => Promise<void>;
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

  // Computed values (read-only)
  isFeeBumpReady: boolean;
  originalFeeRate: number;
  minimumFeeRate: number;
  estimatedNewFee: number;
  feeDifference: number;
  isRbfFormValid: boolean;
  isCreatingRBF: boolean;
}

// =============================================================================
// COMPUTED VALUES HOOK
// =============================================================================

function useFeeBumpComputedValues(
  state: FeeBumpingState,
  isCreatingRBF: boolean,
) {
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

  return {
    originalFeeRate,
    minimumFeeRate,
    estimatedNewFee,
    feeDifference,
    isFeeBumpReady,
    isRbfFormValid,
    isCreatingRBF,
  };
}

// =============================================================================
// WALLET HELPERS HOOK
// =============================================================================

function useWalletHelpers() {
  const { network, addressType, requiredSigners, totalSigners } =
    useSelector(selectWalletConfig);
  const depositNodes = useSelector(
    (state: WalletState) => state.wallet.deposits.nodes,
  );
  const changeNodes = useSelector(
    (state: WalletState) => state.wallet.change.nodes,
  );
  const defaultChangeAddress = useSelector(
    (state: any) => state.wallet?.change?.nextNode?.multisig?.address,
  );
  const walletAddresses = useSelector(getWalletAddresses);
  const changeAddresses = useSelector(getChangeAddresses);
  // same for the whole wallet
  const getGlobalXpubs = useSelector(getExtendedPublicKeyImporters);

  const globalXpubs = Object.values(getGlobalXpubs).map((item: any) => ({
    masterFingerprint: item.rootXfp,
    path: item.bip32Path,
    xpub: item.extendedPublicKey,
  }));

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

  return {
    network,
    addressType,
    requiredSigners,
    totalSigners,
    depositNodes,
    changeNodes,
    defaultChangeAddress,
    globalXpubs,
    getScriptType,
    walletAddresses,
    changeAddresses,
  };
}

// =============================================================================
// USER INPUT HANDLERS HOOK
// =============================================================================

function useUserInputHandlers(
  state: FeeBumpingState,
  dispatch: React.Dispatch<any>,
) {
  const setTransactionForBumping = useCallback(
    (
      tx: any,
      priority: FeePriority = FeePriority.MEDIUM,
      initialTxHex: string = "",
    ) => {
      dispatch(setFeeBumpTransaction(tx, initialTxHex));
      dispatch(setFeeBumpPriority(priority));
    },
    [dispatch],
  );

  const updateFeeRate = useCallback(
    (feeRate: number) => {
      dispatch(setFeeBumpRate(feeRate));
    },
    [dispatch],
  );

  const updateFeePriority = useCallback(
    async (priority: FeePriority) => {
      if (!state.transaction || !state.txHex) {
        console.warn("Cannot update fee priority: No transaction selected");
        return;
      }
      dispatch(setFeeBumpPriority(priority));
    },
    [state.transaction, state.txHex, dispatch],
  );

  const updateStrategy = useCallback(
    (strategy: FeeBumpStrategy) => {
      if (strategy === FeeBumpStrategy.NONE) {
        console.warn("Cannot select NONE as a strategy");
        return;
      }
      dispatch(setFeeBumpStrategy(strategy));
    },
    [dispatch],
  );

  const reset = useCallback(() => {
    dispatch(resetFeeBumpState());
  }, [dispatch]);

  // RBF form input handlers
  const handleSetRbfType = useCallback(
    (type: "accelerate" | "cancel") => {
      dispatch(setRbfType(type));
    },
    [dispatch],
  );

  const handleSetCancelAddress = useCallback(
    (address: string) => {
      dispatch(setCancelAddress(address));
    },
    [dispatch],
  );

  const handleSetChangeAddress = useCallback(
    (address: string) => {
      dispatch(setChangeAddress(address));
    },
    [dispatch],
  );

  const handleSetPsbtVersion = useCallback(
    (version: "v2" | "v0") => {
      dispatch(setPsbtVersion(version));
    },
    [dispatch],
  );

  return {
    setTransactionForBumping,
    updateFeeRate,
    updateFeePriority,
    updateStrategy,
    reset,
    setRbfType: handleSetRbfType,
    setCancelAddress: handleSetCancelAddress,
    setChangeAddress: handleSetChangeAddress,
    setPsbtVersion: handleSetPsbtVersion,
  };
}

// =============================================================================
// MAIN CONTEXT PROVIDER
// =============================================================================

const FeeBumpContext = createContext<FeeBumpContextType | undefined>(undefined);

interface FeeBumpProviderProps {
  children: ReactNode;
}

export function FeeBumpProvider({ children }: FeeBumpProviderProps) {
  // Core state management - never shared with child components
  const [state, dispatch] = useReducer(feeBumpingReducer, initialState);
  const [isCreatingRBF, setIsCreatingRBF] = useState(false); // Local loading state for RBF operations

  // External dependencies
  const { data: feeEstimates } = useFeeEstimates();
  const currentTxid = state.transaction?.txid || ""; // as intially no tx is selected
  const { utxos: pendingUtxos } = usePendingUtxos(currentTxid);
  const walletUtxos = useWalletUtxos();

  // Custom hooks for modularality
  const {
    network,
    addressType,
    defaultChangeAddress,
    requiredSigners,
    totalSigners,
    depositNodes,
    changeNodes,
    getScriptType,
    globalXpubs,
    walletAddresses,
    changeAddresses,
  } = useWalletHelpers();

  const userInputHandlers = useUserInputHandlers(state, dispatch);

  // Computed values
  const computedValues = useFeeBumpComputedValues(state, isCreatingRBF);

  // Combine UTXOs for fee bumping
  const availableUtxos = useMemo(() => {
    if (!pendingUtxos?.length || !walletUtxos?.length) return [];
    return extractUtxosForFeeBumping(pendingUtxos, walletUtxos);
  }, [pendingUtxos, walletUtxos]);

  // so basically as soon as we have the available utxos and the selected priority, we Auto-analyze transaction
  useEffect(() => {
    if (
      state.transaction &&
      availableUtxos.length > 0 &&
      !(state.status === FeeBumpStatus.READY)
    ) {
      console.log(
        "analyze tx ",
        availableUtxos,
        state.transaction,
        network,
        addressType,
        requiredSigners,
        totalSigners,
      );
      analyzeTx(
        state.transaction,
        state.txHex,
        state.selectedPriority,
        availableUtxos,
      );
    }
  }, [state.transaction?.txid, availableUtxos]);

  // =============================================================================
  // CORE FEE BUMPING OPERATIONS
  // =============================================================================

  const analyzeTx = useCallback(
    async (
      tx: any,
      initialTxHex: string = "",
      priority: FeePriority = FeePriority.MEDIUM,
      utxosForBumping: any[] = [],
    ) => {
      if (!tx) return;

      try {
        dispatch(setFeeBumpStatus(FeeBumpStatus.ANALYZING));
        dispatch(setFeeBumpError(null));

        const targetFeeRate =
          feeEstimates[priority] ?? feeEstimates[FeePriority.MEDIUM];

        if (!utxosForBumping.length) {
          throw new Error("No UTXOs available for fee bumping");
        }

        const analysis = analyzeTransaction(
          initialTxHex,
          tx.fee,
          network as Network,
          utxosForBumping, // Use passed UTXOs
          targetFeeRate!,
          { requiredSigners, totalSigners, addressType },
          priority,
        );

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
          networkFeeEstimates: {
            highPriority: feeEstimates[FeePriority.HIGH]!,
            mediumPriority: feeEstimates[FeePriority.MEDIUM]!,
            lowPriority: feeEstimates[FeePriority.LOW]!,
          },
        };
        console.log("analysisdone", feeBumpRecommendation);
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
    [network, requiredSigners, totalSigners, addressType, feeEstimates],
  );

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
          walletAddresses,
          changeAddresses,
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
        console.log("accelOp", rbfOptions);
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
        console.log("result", result);
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
      globalXpubs,
      getScriptType,
      network,
      requiredSigners,
      totalSigners,
      defaultChangeAddress,
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
      globalXpubs,
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
  // CONTEXT VALUE
  // =============================================================================

  const contextValue: FeeBumpContextType = {
    // Core state (read-only for components)
    state,

    // User input handlers (components can call these)
    ...userInputHandlers,

    // Core operations (handled internally by context)
    analyzeTx,
    createAcceleratedRBF,
    createCancelRBF,
    createFeeBumpedTransaction,

    // Computed values (read-only)
    ...computedValues,
  };

  return (
    <FeeBumpContext.Provider value={contextValue}>
      {children}
    </FeeBumpContext.Provider>
  );
}

// =============================================================================
// CONTEXT HOOK
// =============================================================================

export function useFeeBumpContext() {
  const context = useContext(FeeBumpContext);
  if (context === undefined) {
    throw new Error("useFeeBumpContext must be used within a FeeBumpProvider");
  }
  return context;
}
