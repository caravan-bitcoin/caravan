import { useSelector } from "react-redux";
import { useMemo } from "react";
import { WalletState } from "selectors/wallet";
import { dustAnalysis, privacyAnalysis } from "utils/transactionAnalysisUtils";
import type { MultisigAddressType } from "@caravan/bitcoin";

// ============= TRANSACTION ANALYSIS =============

/**
 * Hook for analyzing transaction dust and privacy metrics
 * Provides real-time analysis of the current transaction being constructed
 *
 * @returns {Object} Analysis results containing dust and privacy metrics
 * @returns {Object} returns.dust - Dust analysis results for the transaction
 * @returns {Object} returns.privacy - Privacy analysis results for the transaction
 */
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
