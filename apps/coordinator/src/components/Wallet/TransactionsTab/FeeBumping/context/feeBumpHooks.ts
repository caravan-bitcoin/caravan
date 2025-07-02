import { useMemo } from "react";
import { useFeeBumpContext } from "./FeeBumpContext";
import { FeeBumpStrategy } from "@caravan/fees";

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
