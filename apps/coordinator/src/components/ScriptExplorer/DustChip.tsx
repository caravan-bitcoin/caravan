import React from "react";
import { useSelector } from "react-redux";
import { Tooltip, Chip } from "@mui/material";
import { WasteMetrics } from "@caravan/health";
import { getWalletConfig } from "../../selectors/wallet";

interface DustChipProps {
  amountSats: number;
  feeRate: number;
  tooltipText?: string;
}
/**
 * DustChip component displays the dust status of a UTXO based on its amount and fee rate.
 * It uses the WasteMetrics class to determine if the UTXO is economical, in warning range, or dust.
 * It also provides a tooltip with additional information.
 * @param {DustChipProps} props - Component properties
 * @returns {JSX.Element} Rendered DustChip component
 */

const DustChip: React.FC<DustChipProps> = ({
  amountSats,
  feeRate,
  tooltipText,
}) => {
  // Pull wallet settings from Redux
  const walletConfig = useSelector(getWalletConfig);
  const { addressType: scriptType, quorum } = walletConfig;

  // Instantiate metrics and compute dust limits
  const wasteMetrics = new WasteMetrics();
  const config = {
    requiredSignerCount: quorum.requiredSigners,
    totalSignerCount: quorum.totalSigners,
  };
  const { lowerLimit, upperLimit } = wasteMetrics.calculateDustLimits(
    feeRate,
    scriptType,
    config,
  );

  // Determine chip appearance
  let color: "error" | "warning" | "success" = "success";
  let label = "Economical";

  if (amountSats <= lowerLimit) {
    color = "error";
    label = "Dust";
  } else if (amountSats > lowerLimit && amountSats <= upperLimit) {
    color = "warning";
    label = "Warning";
  }

  // Fallback tooltip text based on range
  const defaultTooltip = `This UTXO is ${
    amountSats <= lowerLimit
      ? "too small (dust) and costs more to spend than its value."
      : amountSats <= upperLimit
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
