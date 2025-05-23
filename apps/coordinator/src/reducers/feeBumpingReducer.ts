import { FeeBumpStrategy } from "@caravan/fees";
import {
  FeeBumpStatus,
  FeePriority,
  FeeBumpRecommendation,
  FeeBumpResult,
} from "../components/Wallet/TransactionsTab/FeeBumping/types";
import {
  FeeBumpActionTypes,
  SET_FEE_BUMP_TRANSACTION,
  SET_FEE_BUMP_STATUS,
  SET_FEE_BUMP_ERROR,
  SET_FEE_BUMP_RECOMMENDATION,
  SET_FEE_BUMP_STRATEGY,
  SET_FEE_BUMP_RATE,
  SET_FEE_BUMP_PRIORITY,
  SET_FEE_BUMP_RESULT,
  SET_RBF_TYPE,
  SET_CANCEL_ADDRESS,
  SET_CHANGE_ADDRESS,
  RESET_FEE_BUMP_STATE,
} from "../actions/feeBumpingActions";

export interface FeeBumpingState {
  // Transaction data
  transaction: any | null;
  txHex: string;

  // Process state
  status: FeeBumpStatus;
  error: string | null;

  // Analysis results
  recommendation: FeeBumpRecommendation | null;

  // User selections
  selectedStrategy: FeeBumpStrategy;
  selectedFeeRate: number;
  selectedPriority: FeePriority;

  // RBF form data ... Will add for CPFP later
  rbfType: "accelerate" | "cancel";
  cancelAddress: string;
  changeAddress: string;

  // Results
  result: FeeBumpResult | null;
}

const initialState: FeeBumpingState = {
  // Transaction data
  transaction: null,
  txHex: "",

  // Process state
  status: FeeBumpStatus.IDLE,
  error: null,

  // Analysis results
  recommendation: null,

  // User selections
  selectedStrategy: FeeBumpStrategy.NONE,
  selectedFeeRate: 0,
  selectedPriority: FeePriority.MEDIUM,

  // RBF form data
  rbfType: "accelerate",
  cancelAddress: "",
  changeAddress: "",

  // Results
  result: null,
};

export default function feeBumpingReducer(
  state = initialState,
  action: FeeBumpActionTypes,
): FeeBumpingState {
  switch (action.type) {
    case SET_FEE_BUMP_TRANSACTION:
      return {
        ...state,
        transaction: action.payload.transaction,
        txHex: action.payload.txHex || "",
        // We reset related state when setting new transaction
        status: FeeBumpStatus.IDLE,
        error: null,
        recommendation: null,
        result: null,
        selectedStrategy: FeeBumpStrategy.NONE,
        selectedFeeRate: 0,
      };

    case SET_FEE_BUMP_STATUS:
      return {
        ...state,
        status: action.payload,
      };

    case SET_FEE_BUMP_ERROR:
      return {
        ...state,
        error: action.payload,
        status: action.payload ? FeeBumpStatus.ERROR : state.status,
      };

    case SET_FEE_BUMP_RECOMMENDATION:
      return {
        ...state,
        recommendation: action.payload,
        // Auto-select strategy and fee rate based on recommendation
        ...(action.payload && {
          selectedStrategy: action.payload.canRBF
            ? FeeBumpStrategy.RBF
            : action.payload.canCPFP
              ? FeeBumpStrategy.CPFP
              : FeeBumpStrategy.NONE,
          selectedFeeRate: action.payload.canRBF
            ? action.payload.suggestedRBFFeeRate || 0
            : action.payload.canCPFP
              ? action.payload.suggestedCPFPFeeRate || 0
              : 0,
        }),
      };

    case SET_FEE_BUMP_STRATEGY:
      return {
        ...state,
        selectedStrategy: action.payload,
        // Update fee rate based on strategy
        selectedFeeRate: state.recommendation
          ? action.payload === FeeBumpStrategy.RBF
            ? state.recommendation.suggestedRBFFeeRate || state.selectedFeeRate
            : action.payload === FeeBumpStrategy.CPFP
              ? state.recommendation.suggestedCPFPFeeRate ||
                state.selectedFeeRate
              : state.selectedFeeRate
          : state.selectedFeeRate,
      };

    case SET_FEE_BUMP_RATE:
      return {
        ...state,
        selectedFeeRate: Math.max(1, action.payload), // Ensure minimum 1 sat/vB
      };

    case SET_FEE_BUMP_PRIORITY:
      return {
        ...state,
        selectedPriority: action.payload,
      };

    case SET_FEE_BUMP_RESULT:
      return {
        ...state,
        result: action.payload,
        status: action.payload ? FeeBumpStatus.SUCCESS : state.status,
      };

    case SET_RBF_TYPE:
      return {
        ...state,
        rbfType: action.payload,
        // Clear addresses when switching types
        cancelAddress: action.payload === "cancel" ? state.cancelAddress : "",
        changeAddress:
          action.payload === "accelerate" ? state.changeAddress : "",
      };

    case SET_CANCEL_ADDRESS:
      return {
        ...state,
        cancelAddress: action.payload,
      };

    case SET_CHANGE_ADDRESS:
      return {
        ...state,
        changeAddress: action.payload,
      };

    case RESET_FEE_BUMP_STATE:
      return initialState;

    default:
      return state;
  }
}
