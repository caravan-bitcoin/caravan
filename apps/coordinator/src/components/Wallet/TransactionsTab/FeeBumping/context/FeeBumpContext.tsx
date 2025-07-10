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
  FeeBumpActionTypes,
  setFeeBumpStatus,
  setFeeBumpError,
  setFeeBumpRecommendation,
  setFeeBumpResult,
} from "./feeBumpActions";

import { FeeBumpStatus, FeeBumpRecommendation, FeeBumpResult } from "../types";
import {
  analyzeTransaction,
  extractUtxosForFeeBumping,
  getChangeOutputIndex,
} from "../utils";

// =============================================================================
// CONTEXT TYPE DEFINITION
// =============================================================================

interface FeeBumpContextType {
  state: FeeBumpingState;
  dispatch: React.Dispatch<FeeBumpActionTypes>;

  // Core fee bumping operations (handled internally by context)
  createAcceleratedRBF: (options?: {
    changeAddress?: string;
    feeRate?: number;
  }) => Promise<FeeBumpResult>;
  createCancelRBF: (options?: {
    cancelAddress?: string;
    feeRate?: number;
  }) => Promise<FeeBumpResult>;

  // Loading states
  isCreatingRBF: boolean;
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

  // Getting all needed wallet state
  const { network, addressType, requiredSigners, totalSigners } =
    useSelector(selectWalletConfig);
  const defaultChangeAddress = useSelector(
    (state: any) => state.wallet?.change?.nextNode?.multisig?.address,
  );
  const walletAddresses = useSelector(getWalletAddresses);
  const changeAddresses = useSelector(getChangeAddresses);
  const getGlobalXpubs = useSelector(getExtendedPublicKeyImporters); // same for the whole wallet

  const globalXpubs = Object.values(getGlobalXpubs).map((item: any) => ({
    masterFingerprint: item.rootXfp,
    path: item.bip32Path,
    xpub: item.extendedPublicKey,
  }));

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
      state.status !== FeeBumpStatus.READY
    ) {
      const runAnalysis = () => {
        try {
          dispatch(setFeeBumpStatus(FeeBumpStatus.ANALYZING));
          dispatch(setFeeBumpError(null));

          const targetFeeRate =
            feeEstimates[state.selectedPriority] ??
            feeEstimates[FeePriority.MEDIUM];

          if (!targetFeeRate || !state.transaction) {
            throw new Error(
              "Target fee rate or Transaction could not be determined.",
            );
          }

          const analysis = analyzeTransaction(
            state.txHex,
            state.transaction.fee,
            network as Network,
            availableUtxos,
            targetFeeRate,
            { requiredSigners, totalSigners, addressType },
            state.selectedPriority,
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
      };

      runAnalysis();
    }
  }, [
    state.transaction?.txid, // trigger re-run on transaction change
    availableUtxos.length, // trigger re-run on utxo availability
    state.status,
    state.txHex,
    state.transaction?.fee,
    state.selectedPriority,
    feeEstimates,
    requiredSigners,
    totalSigners,
    addressType,
    network,
  ]);

  // =============================================================================
  // HELPER FUNCTIONS
  // =============================================================================
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

  // RBF OPERATIONS

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
      globalXpubs,
      getScriptType,
      network,
      requiredSigners,
      totalSigners,
    ],
  );

  // =============================================================================
  // CONTEXT VALUE
  // =============================================================================

  const contextValue: FeeBumpContextType = {
    // Core state (read-only for components)
    state,
    dispatch,

    // Core operations (handled internally by context)
    createAcceleratedRBF,
    createCancelRBF,

    // Loading states
    isCreatingRBF,
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
