import { FeeBumpStrategy } from "@caravan/fees";
import { FeeBumpStatus, FeeBumpRecommendation, FeeBumpResult } from "../types";
import { FeePriority } from "clients/fees";

export const SET_FEE_BUMP_TRANSACTION = "SET_FEE_BUMP_TRANSACTION";
export const SET_FEE_BUMP_STATUS = "SET_FEE_BUMP_STATUS";
export const SET_FEE_BUMP_ERROR = "SET_FEE_BUMP_ERROR";
export const SET_FEE_BUMP_RECOMMENDATION = "SET_FEE_BUMP_RECOMMENDATION";
export const SET_FEE_BUMP_STRATEGY = "SET_FEE_BUMP_STRATEGY";
export const SET_FEE_BUMP_RATE = "SET_FEE_BUMP_RATE";
export const SET_FEE_BUMP_PRIORITY = "SET_FEE_BUMP_PRIORITY";
export const SET_FEE_BUMP_RESULT = "SET_FEE_BUMP_RESULT";
export const SET_RBF_TYPE = "SET_RBF_TYPE";
export const SET_CANCEL_ADDRESS = "SET_CANCEL_ADDRESS";
export const SET_CHANGE_ADDRESS = "SET_CHANGE_ADDRESS";
export const RESET_FEE_BUMP_STATE = "RESET_FEE_BUMP_STATE";
export const SET_PSBT_VERSION = "SET_PSBT_VERSION";

export interface SetFeeBumpTransactionAction {
  type: typeof SET_FEE_BUMP_TRANSACTION;
  payload: {
    transaction: any;
    txHex?: string;
  };
}

export interface SetFeeBumpStatusAction {
  type: typeof SET_FEE_BUMP_STATUS;
  payload: FeeBumpStatus;
}

export interface SetFeeBumpErrorAction {
  type: typeof SET_FEE_BUMP_ERROR;
  payload: string | null;
}

export interface SetFeeBumpRecommendationAction {
  type: typeof SET_FEE_BUMP_RECOMMENDATION;
  payload: FeeBumpRecommendation | null;
}

export interface SetFeeBumpStrategyAction {
  type: typeof SET_FEE_BUMP_STRATEGY;
  payload: FeeBumpStrategy;
}

export interface SetFeeBumpRateAction {
  type: typeof SET_FEE_BUMP_RATE;
  payload: number;
}

export interface SetFeeBumpPriorityAction {
  type: typeof SET_FEE_BUMP_PRIORITY;
  payload: FeePriority;
}

export interface SetFeeBumpResultAction {
  type: typeof SET_FEE_BUMP_RESULT;
  payload: FeeBumpResult | null;
}

export interface SetRbfTypeAction {
  type: typeof SET_RBF_TYPE;
  payload: "accelerate" | "cancel";
}

export interface SetCancelAddressAction {
  type: typeof SET_CANCEL_ADDRESS;
  payload: string;
}

export interface SetChangeAddressAction {
  type: typeof SET_CHANGE_ADDRESS;
  payload: string;
}

export interface ResetFeeBumpStateAction {
  type: typeof RESET_FEE_BUMP_STATE;
}

export interface SetPsbtVersionAction {
  type: typeof SET_PSBT_VERSION;
  payload: "v2" | "v0";
}

export type FeeBumpActionTypes =
  | SetFeeBumpTransactionAction
  | SetFeeBumpStatusAction
  | SetFeeBumpErrorAction
  | SetFeeBumpRecommendationAction
  | SetFeeBumpStrategyAction
  | SetFeeBumpRateAction
  | SetFeeBumpPriorityAction
  | SetFeeBumpResultAction
  | SetRbfTypeAction
  | SetCancelAddressAction
  | SetChangeAddressAction
  | SetPsbtVersionAction
  | ResetFeeBumpStateAction;

export const setFeeBumpTransaction = (
  transaction: any,
  txHex?: string,
): SetFeeBumpTransactionAction => ({
  type: SET_FEE_BUMP_TRANSACTION,
  payload: { transaction, txHex },
});

export const setFeeBumpStatus = (
  status: FeeBumpStatus,
): SetFeeBumpStatusAction => ({
  type: SET_FEE_BUMP_STATUS,
  payload: status,
});

export const setFeeBumpError = (
  error: string | null,
): SetFeeBumpErrorAction => ({
  type: SET_FEE_BUMP_ERROR,
  payload: error,
});

export const setFeeBumpRecommendation = (
  recommendation: FeeBumpRecommendation | null,
): SetFeeBumpRecommendationAction => ({
  type: SET_FEE_BUMP_RECOMMENDATION,
  payload: recommendation,
});

export const setFeeBumpStrategy = (
  strategy: FeeBumpStrategy,
): SetFeeBumpStrategyAction => ({
  type: SET_FEE_BUMP_STRATEGY,
  payload: strategy,
});

export const setFeeBumpRate = (rate: number): SetFeeBumpRateAction => ({
  type: SET_FEE_BUMP_RATE,
  payload: rate,
});

export const setFeeBumpPriority = (
  priority: FeePriority,
): SetFeeBumpPriorityAction => ({
  type: SET_FEE_BUMP_PRIORITY,
  payload: priority,
});

export const setFeeBumpResult = (
  result: FeeBumpResult | null,
): SetFeeBumpResultAction => ({
  type: SET_FEE_BUMP_RESULT,
  payload: result,
});

export const setRbfType = (
  rbfType: "accelerate" | "cancel",
): SetRbfTypeAction => ({
  type: SET_RBF_TYPE,
  payload: rbfType,
});

export const setCancelAddress = (address: string): SetCancelAddressAction => ({
  type: SET_CANCEL_ADDRESS,
  payload: address,
});

export const setChangeAddress = (address: string): SetChangeAddressAction => ({
  type: SET_CHANGE_ADDRESS,
  payload: address,
});

export const resetFeeBumpState = (): ResetFeeBumpStateAction => ({
  type: RESET_FEE_BUMP_STATE,
});

export const setPsbtVersion = (version: "v2" | "v0"): SetPsbtVersionAction => ({
  type: SET_PSBT_VERSION,
  payload: version,
});
