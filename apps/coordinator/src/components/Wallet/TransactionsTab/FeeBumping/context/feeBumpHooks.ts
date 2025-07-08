import { useFeeBumpContext } from "./FeeBumpContext";

// Combined hook for all state
export function useFeeBumpState() {
  const { state } = useFeeBumpContext();
  return state;
}

// hook for accessing everything
export function useFeeBump() {
  return useFeeBumpContext();
}

// Hook for dispatch
export function useFeeBumpDispatch() {
  const { dispatch } = useFeeBumpContext();
  return dispatch;
}
