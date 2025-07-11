import { useSelector } from "react-redux";
import { useMemo } from "react";
import { dustAnalysis, privacyAnalysis } from "utils/transactionAnalysisUtils";
import type { WalletState } from "selectors/wallet";
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

  return useMemo(() => {
    const dust = dustAnalysis({
      inputs,
      outputs,
      feeRate,
      addressType,
      requiredSigners,
      totalSigners,
    });
    const privacy = privacyAnalysis({
      inputs,
      outputs,
      feeRate,
      addressType,
      requiredSigners,
      totalSigners,
    });
    return { dust, privacy };
  }, [inputs, outputs, feeRate, requiredSigners, totalSigners, addressType]);
}
