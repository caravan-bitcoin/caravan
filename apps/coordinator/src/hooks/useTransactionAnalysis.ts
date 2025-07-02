import { useSelector } from "react-redux";
import { useMemo } from "react";
import { analyzeTransaction } from "../components/analysis";

export function useTransactionAnalysis() {
  const inputs = useSelector(
    (state: any) => state.spend?.transaction?.inputs || [],
  );
  const outputs = useSelector(
    (state: any) => state.spend?.transaction?.outputs || [],
  );
  const feeRate = useSelector(
    (state: any) => state.spend?.transaction?.feeRate || 1,
  );
  const addressType = useSelector((state: any) => state.settings?.addressType);
  const requiredSigners = useSelector(
    (state: any) => state.settings?.requiredSigners,
  );
  const totalSigners = useSelector(
    (state: any) => state.settings?.totalSigners,
  );

  return useMemo(
    () =>
      analyzeTransaction({
        inputs,
        outputs,
        feeRate,
        addressType,
        requiredSigners,
        totalSigners,
      }),
    [inputs, outputs, feeRate, addressType, requiredSigners, totalSigners],
  );
}
