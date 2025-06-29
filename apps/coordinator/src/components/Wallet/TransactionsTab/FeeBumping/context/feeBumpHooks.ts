import { useMemo } from "react";
import { useFeeBumpContext } from "./FeeBumpContext";
import { FeeBumpStrategy } from "@caravan/fees";

// Transaction data hooks
export function useFeeBumpTransaction() {
  const { state } = useFeeBumpContext();
  return state.transaction;
}

export function useFeeBumpTxHex() {
  const { state } = useFeeBumpContext();
  return state.txHex;
}

// Process state hooks
export function useFeeBumpStatus() {
  const { state } = useFeeBumpContext();
  return state.status;
}

export function useFeeBumpError() {
  const { state } = useFeeBumpContext();
  return state.error;
}

// Analysis hooks
export function useFeeBumpRecommendation() {
  const { state } = useFeeBumpContext();
  return state.recommendation;
}

// User selection hooks
export function useSelectedFeeBumpStrategy() {
  const { state } = useFeeBumpContext();
  return state.selectedStrategy;
}

export function useSelectedFeeRate() {
  const { state } = useFeeBumpContext();
  return state.selectedFeeRate;
}

export function useSelectedFeePriority() {
  const { state } = useFeeBumpContext();
  return state.selectedPriority;
}

// RBF form hooks
export function useRbfType() {
  const { state } = useFeeBumpContext();
  return state.rbfType;
}

export function useCancelAddress() {
  const { state } = useFeeBumpContext();
  return state.cancelAddress;
}

export function useChangeAddress() {
  const { state } = useFeeBumpContext();
  return state.changeAddress;
}

export function usePsbtVersion() {
  const { state } = useFeeBumpContext();
  return state.psbtVersion;
}

// Result hooks
export function useFeeBumpResult() {
  const { state } = useFeeBumpContext();
  return state.result;
}

// Computed hooks
export function useIsFeeBumpReady() {
  const { state } = useFeeBumpContext();
  return useMemo(
    () =>
      state.recommendation !== null &&
      state.selectedStrategy !== FeeBumpStrategy.NONE &&
      state.selectedFeeRate > 0,
    [state.recommendation, state.selectedStrategy, state.selectedFeeRate],
  );
}

export function useOriginalFeeRate() {
  const { state } = useFeeBumpContext();
  return useMemo(() => {
    if (!state.transaction) return 0;
    const txSize = state.transaction.vsize || state.transaction.size;
    return txSize ? state.transaction.fee / txSize : 0;
  }, [state.transaction]);
}

export function useMinimumFeeRate() {
  const originalFeeRate = useOriginalFeeRate();
  return useMemo(() => Math.max(originalFeeRate + 1, 1), [originalFeeRate]);
}

export function useEstimatedNewFee() {
  const { state } = useFeeBumpContext();
  return useMemo(() => {
    if (!state.transaction || !state.selectedFeeRate) return 0;
    const txVsize = state.transaction.vsize || state.transaction.size || 250;
    return Math.ceil(txVsize * state.selectedFeeRate);
  }, [state.transaction, state.selectedFeeRate]);
}

export function useFeeDifference() {
  const { state } = useFeeBumpContext();
  const estimatedNewFee = useEstimatedNewFee();
  return useMemo(() => {
    if (!state.transaction) return 0;
    return estimatedNewFee - state.transaction.fee;
  }, [state.transaction, estimatedNewFee]);
}

// Form validation hooks
export function useIsRbfFormValid() {
  const { state } = useFeeBumpContext();
  const minimumFeeRate = useMinimumFeeRate();

  return useMemo(() => {
    if (state.selectedFeeRate < minimumFeeRate) return false;
    if (state.rbfType === "cancel" && !state.cancelAddress.trim()) return false;
    return true;
  }, [
    state.selectedFeeRate,
    minimumFeeRate,
    state.rbfType,
    state.cancelAddress,
  ]);
}

// Combined hook for all state
export function useFeeBumpState() {
  const { state } = useFeeBumpContext();
  return state;
}

// Hook for dispatch
export function useFeeBumpDispatch() {
  const { dispatch } = useFeeBumpContext();
  return dispatch;
}
