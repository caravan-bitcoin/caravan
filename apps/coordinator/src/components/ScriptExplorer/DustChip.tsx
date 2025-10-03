import React from "react";
import { useSelector } from "react-redux";
import { Tooltip, Chip } from "@mui/material";
import { WasteMetrics } from "@caravan/health";
import { getWalletConfig } from "../../selectors/wallet";

interface DustChipProps {
  amountSats: number;
  tooltipText?: string;
  scriptType?: string;
}
/**
 * DustChip component displays the dust status of a UTXO based on its amount and fee rate.
 * It uses the WasteMetrics class to determine if the UTXO is economical, in warning range, or dust.
 * It also provides a tooltip with additional information.
 * @param DustChipProps props - Component properties
 * @returns JSX.Element Rendered DustChip component
 */

const DustChip: React.FC<DustChipProps> = ({
  amountSats,
  tooltipText,
  scriptType,
}) => {
  // Pull wallet settings from Redux
  const walletConfig = useSelector(getWalletConfig);
  const feeRate = useSelector(
    (state: any) => state.spend?.transaction?.feeRate || 1,
  );
  const { addressType: defaultScriptType, quorum } = walletConfig;
  // Determine chip appearance
  let color: "error" | "warning" | "success" = "success";
  let label = "Economical";
  let hasError = false;
  let dustLimits:
    | {
        lowerLimit: number;
        upperLimit: number;
      }
    | undefined;

  try {
    // Instantiate metrics and compute dust limits
    const wasteMetrics = new WasteMetrics();
    const config = {
      requiredSignerCount: quorum.requiredSigners,
      totalSignerCount: quorum.totalSigners,
    };
    dustLimits = wasteMetrics.calculateDustLimits(
      feeRate,
      scriptType || defaultScriptType,
      config,
    );

    if (dustLimits && dustLimits.lowerLimit && dustLimits.upperLimit) {
      const { lowerLimit, upperLimit } = dustLimits;

      if (amountSats <= lowerLimit) {
        color = "error";
        label = "Dust";
      } else if (amountSats > lowerLimit && amountSats <= upperLimit) {
        color = "warning";
        label = "Warning";
      }
    } else {
      // Fallback for fresh UTXOs where calculation fails
      hasError = true;
      color = "default" as any; // Use default color for unknown status
      label = "Unknown";
    }
  } catch (error) {
    console.warn("Dust calculation failed:", error);
    hasError = true;
    color = "default" as any;
    label = "Unknown";
  }
  // Fallback tooltip text based on range
  const defaultTooltip = hasError
    ? "Unable to determine dust status for this UTXO. This may be a fresh address that hasn't been analyzed yet."
    : `This UTXO is ${
        amountSats <= (dustLimits?.lowerLimit ?? 0)
          ? "too small (dust) and costs more to spend than its value."
          : amountSats <= (dustLimits?.upperLimit ?? Infinity)
            ? "in the warning range; consider batching or consolidating."
            : "economical to spend."
      }`;

  return (
    <Tooltip title={tooltipText ?? defaultTooltip} arrow>
      <Chip color={color} label={label} />
    </Tooltip>
  );
};

export default DustChip;
