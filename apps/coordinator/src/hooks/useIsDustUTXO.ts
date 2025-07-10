import { useSelector } from "react-redux";
import { WasteMetrics } from "@caravan/health";
import { getWalletConfig } from "../selectors/wallet";

/**
 * Hook to determine if a given amount is dust for the current wallet config and fee rate.
 * @param amountSats - Amount in satoshis to check
 * @param scriptType - Optional script type; defaults to wallet's addressType
 * @returns true if the amount is dust, false otherwise
 */
export function useIsDustUTXO(amountSats: number, scriptType?: string) {
  const walletConfig = useSelector(getWalletConfig);
  const feeRate = useSelector(
    (state: any) => state.spend?.transaction?.feeRate || 1,
  );
  const { addressType, quorum } = walletConfig;
  const wasteMetrics = new WasteMetrics();
  const config = {
    requiredSignerCount: quorum.requiredSigners,
    totalSignerCount: quorum.totalSigners,
  };
  const dustLimit = wasteMetrics.calculateDustLimits(
    feeRate,
    scriptType || addressType,
    config,
  ).lowerLimit;
  return amountSats <= dustLimit;
}
