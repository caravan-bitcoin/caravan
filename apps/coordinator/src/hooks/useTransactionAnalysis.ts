import { useSelector } from "react-redux";
import { useMemo } from "react";
import { analyzeTransaction } from "../utils/transactionAnalysisUtils";

export function useTransactionAnalysis() {
  const {
    inputs = [],
    outputs = [],
    feeRate = 1,
  } = useSelector((state: any) => state.spend?.transaction || {});
  const { requiredSigners, totalSigners } = useSelector(
    (state: any) => state.settings || {},
  );

  return useMemo(
    () =>
      analyzeTransaction({
        inputs,
        outputs,
        feeRate,
        addressType: useSelector((state: any) => state.settings?.addressType),
        requiredSigners,
        totalSigners,
      }),
    [inputs, outputs, feeRate, requiredSigners, totalSigners],
  );
}
