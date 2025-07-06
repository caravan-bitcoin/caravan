import { useSelector } from "react-redux";
import { useMemo } from "react";
import { analyzeTransaction } from "../utils/transactionAnalysisUtils";
import type { WalletState } from "../selectors/wallet";
import type { MultisigAddressType } from "@caravan/bitcoin";

export function useTransactionAnalysis() {
  const {
    inputs = [],
    outputs = [],
    feeRate = 1,
  } = useSelector((state: any) => state.spend?.transaction || {});
  const { requiredSigners, totalSigners } = useSelector(
    (state: WalletState) => state.settings || {},
  );
  const addressType = useSelector(
    (state: WalletState) => state.settings?.addressType,
  ) as MultisigAddressType;

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
    [inputs, outputs, feeRate, requiredSigners, totalSigners, addressType],
  );
}
