import { TransactionDetails } from "@caravan/clients";
import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { FeeBumpStrategy, TxAnalysis, UTXO } from "@caravan/fees";
import { useAnalyzeTransaction } from "./hooks";
import { RbfType } from "../types";

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

  // Strategy selection
  selectedStrategy: FeeBumpStrategy | null;

  // RBF configuration
  rbfType: RbfType;

  // Fee bump PSBT
  feeBumpPsbt: string | null;
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
  | { type: "SET_FEE_BUMP_PSBT"; payload: string | null }
  | { type: "SET_STEP_CALLBACK"; payload: (() => boolean) | null }
  | { type: "SET_NEXT_ENABLED"; payload: boolean }
  | { type: "SET_BACK_ENABLED"; payload: boolean }
  | { type: "SET_NEXT_BUTTON_TEXT"; payload: string };

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
  availableUtxos: [],
  analysisIsLoading: false,
  analysisIsError: null,
  selectedStrategy: null,
  rbfType: null,
  feeBumpPsbt: null,
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

    case "SET_FEE_BUMP_PSBT":
      return {
        ...state,
        feeBumpPsbt: action.payload,
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
  setFeeBumpPsbt: (psbt: string | null) => void;

  // Computed values
  isFirstStep: boolean;
  isLastStep: boolean;
  canGoNext: boolean;
  canGoBack: boolean;
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
  totalSteps: number;
  canProceed?: boolean; // External condition for whether next is allowed
  transaction: TransactionDetails;
  txHex: string;
}

export function AccelerationModalProvider({
  children,
  totalSteps,
  canProceed = true,
  transaction,
  txHex,
}: AccelerationModalProviderProps) {
  const [state, dispatch] = useReducer(accelerationModalReducer, initialState);
  const { analysis, isLoading, error, availableUtxos } = useAnalyzeTransaction(
    transaction,
    txHex,
  );

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

  const setFeeBumpPsbt = useCallback((psbt: string | null) => {
    dispatch({ type: "SET_FEE_BUMP_PSBT", payload: psbt });
  }, []);

  // Computed values
  const isFirstStep = state.activeStep === 0;
  const isLastStep = state.activeStep === totalSteps - 1;
  const canGoNext = !isLastStep && canProceed;
  const canGoBack = !isFirstStep;

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
    setFeeBumpPsbt,
    isFirstStep,
    isLastStep,
    canGoNext,
    canGoBack,
    analysis,
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
