import { TransactionDetails } from "@caravan/clients";
import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useCallback,
} from "react";
import { FeeBumpStrategy, TxAnalysis, UTXO } from "@caravan/fees";
import { useAnalyzeTransaction } from "./hooks";
import { RbfType, FeeBumpResult } from "../types";

// =============================================================================
// STATE TYPES
// =============================================================================

interface AccelerationModalState {
  // Wizard navigation
  activeStep: number;
  downloadClicked: boolean;
  showPSBTVersionDialog: boolean;
  showErrorDetails: boolean;

  // PSBT version selection
  selectedPsbtVersion: "v2" | "v0";

  // Transaction details
  transaction: TransactionDetails | null;
  txHex: string;
  analysis: TxAnalysis | null;
  analysisIsLoading: boolean;
  analysisIsError: string | null;
  availableUtxos: UTXO[];
  changeOutputIndex: number | undefined;

  // Strategy selection
  selectedStrategy: FeeBumpStrategy | null;

  // RBF configuration
  rbfType: RbfType;

  // CPFP configuration
  cpfp: {
    feeRate: string;
    childSize: number;
    combinedEstimatedSize: number;
  } | null;

  // Fee bump PSBT
  feeBumpResult: FeeBumpResult | null;
}

// =============================================================================
// ACTION TYPES
// =============================================================================

type AccelerationModalAction =
  | { type: "SET_ACTIVE_STEP"; payload: number }
  | { type: "NEXT_STEP" }
  | { type: "PREVIOUS_STEP" }
  | { type: "SET_ERROR_DETAILS"; payload: boolean }
  | { type: "RESET_WIZARD" }
  | { type: "SET_STRATEGY"; payload: FeeBumpStrategy }
  | { type: "SET_RBF_TYPE"; payload: RbfType }
  | { type: "SET_FEE_BUMP_RESULT"; payload: FeeBumpResult | null }
  | { type: "SET_DOWNLOAD_CLICKED"; payload: boolean };

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: AccelerationModalState = {
  activeStep: 0,
  downloadClicked: false,
  showPSBTVersionDialog: false,
  showErrorDetails: false,
  selectedPsbtVersion: "v2",
  transaction: null,
  txHex: "",
  analysis: null,
  cpfp: null,
  changeOutputIndex: undefined,
  availableUtxos: [],
  analysisIsLoading: false,
  analysisIsError: null,
  selectedStrategy: null,
  rbfType: "accelerate" as RbfType,
  feeBumpResult: null,
};

// =============================================================================
// REDUCER
// =============================================================================

function accelerationModalReducer(
  state: AccelerationModalState,
  action: AccelerationModalAction,
): AccelerationModalState {
  switch (action.type) {
    case "SET_ACTIVE_STEP":
      return {
        ...state,
        activeStep: action.payload,
      };

    case "NEXT_STEP":
      return {
        ...state,
        activeStep: state.activeStep + 1,
      };

    case "PREVIOUS_STEP":
      return {
        ...state,
        activeStep: Math.max(0, state.activeStep - 1),
      };

    case "SET_ERROR_DETAILS":
      return {
        ...state,
        showErrorDetails: action.payload,
      };

    case "RESET_WIZARD":
      return {
        ...initialState,
        selectedPsbtVersion: state.selectedPsbtVersion, // Preserve PSBT version preference
      };

    case "SET_STRATEGY":
      return {
        ...state,
        selectedStrategy: action.payload,
      };

    case "SET_RBF_TYPE":
      return {
        ...state,
        rbfType: action.payload,
      };

    case "SET_FEE_BUMP_RESULT":
      return {
        ...state,
        feeBumpResult: action.payload,
      };

    case "SET_DOWNLOAD_CLICKED":
      return {
        ...state,
        downloadClicked: action.payload,
      };

    default:
      return state;
  }
}

// =============================================================================
// CONTEXT TYPE
// =============================================================================

interface AccelerationModalContextType {
  transaction: TransactionDetails;
  txHex: string;
  cpfp: {
    feeRate: string | undefined;
    childSize: number | undefined;
    combinedEstimatedSize: number | undefined;
  } | null;
  changeOutputIndex: number | undefined;
  analysis: TxAnalysis | null;
  analysisIsLoading: boolean;
  analysisError: string | null;
  availableUtxos: UTXO[];
  // State
  state: AccelerationModalState;

  // Actions
  setActiveStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  setErrorDetails: (show: boolean) => void;
  resetWizard: () => void;
  setStrategy: (strategy: FeeBumpStrategy) => void;
  setRbfType: (type: RbfType) => void;
  setFeeBumpResult: (result: FeeBumpResult | null) => void;
  setDownloadClicked: (downloaded: boolean) => void;
}

// =============================================================================
// CONTEXT CREATION
// =============================================================================

const AccelerationModalContext = createContext<
  AccelerationModalContextType | undefined
>(undefined);

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

interface AccelerationModalProviderProps {
  children: ReactNode;
  transaction: TransactionDetails;
  txHex: string;
}

export function AccelerationModalProvider({
  children,
  transaction,
  txHex,
}: AccelerationModalProviderProps) {
  const [state, dispatch] = useReducer(accelerationModalReducer, initialState);
  const {
    analysis,
    isLoading,
    error,
    availableUtxos,
    cpfp,
    changeOutputIndex,
  } = useAnalyzeTransaction(transaction, txHex);

  // Action creators
  const setActiveStep = useCallback((step: number) => {
    dispatch({ type: "SET_ACTIVE_STEP", payload: step });
  }, []);

  const nextStep = useCallback(() => dispatch({ type: "NEXT_STEP" }), []);

  const previousStep = useCallback(() => {
    dispatch({ type: "PREVIOUS_STEP" });
  }, []);

  const setErrorDetails = useCallback((show: boolean) => {
    dispatch({ type: "SET_ERROR_DETAILS", payload: show });
  }, []);

  const resetWizard = useCallback(() => {
    dispatch({ type: "RESET_WIZARD" });
  }, []);

  const setStrategy = useCallback((strategy: FeeBumpStrategy) => {
    dispatch({ type: "SET_STRATEGY", payload: strategy });
  }, []);

  const setRbfType = useCallback((type: RbfType) => {
    dispatch({ type: "SET_RBF_TYPE", payload: type });
  }, []);

  const setFeeBumpResult = useCallback((result: FeeBumpResult | null) => {
    dispatch({ type: "SET_FEE_BUMP_RESULT", payload: result });
  }, []);

  const setDownloadClicked = useCallback((downloaded: boolean) => {
    dispatch({ type: "SET_DOWNLOAD_CLICKED", payload: downloaded });
  }, []);

  const contextValue: AccelerationModalContextType = {
    transaction,
    txHex,
    state,
    setActiveStep,
    nextStep,
    previousStep,
    setErrorDetails,
    resetWizard,
    setStrategy,
    setRbfType,
    setFeeBumpResult,
    setDownloadClicked,
    analysis,
    cpfp,
    changeOutputIndex,
    availableUtxos,
    analysisIsLoading: isLoading,
    analysisError: error,
  };

  return (
    <AccelerationModalContext.Provider value={contextValue}>
      {children}
    </AccelerationModalContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

export function useAccelerationModal() {
  const context = useContext(AccelerationModalContext);
  if (context === undefined) {
    throw new Error(
      "useAccelerationModal must be used within an AccelerationModalProvider",
    );
  }
  return context;
}
