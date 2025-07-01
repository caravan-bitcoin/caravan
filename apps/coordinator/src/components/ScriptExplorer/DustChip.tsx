import React from "react";
import { useSelector } from "react-redux";
import { Tooltip, Chip } from "@mui/material";
import { Warning, CheckCircle } from "@mui/icons-material";
import { WasteMetrics } from "@caravan/health";
import { getWalletConfig } from "../../selectors/wallet";

interface DustChipProps {
  amountSats: number;
  feeRate: number;
  tooltipText?: string;
}

const DustChip: React.FC<DustChipProps> = ({
  amountSats,
  feeRate,
  tooltipText,
}) => {
  const walletConfig = useSelector(getWalletConfig);
  const { addressType: scriptType, quorum } = walletConfig;
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

  let color: "error" | "warning" | "success" = "success";
  let label = "Economical";
  let icon = <CheckCircle />;

  if (amountSats <= lowerLimit) {
    color = "error";
    label = "Dust";
    icon = <Warning />;
  } else if (amountSats > lowerLimit && amountSats <= upperLimit) {
    color = "warning";
    label = "Warning";
    icon = <Warning />;
  }

  const defaultTooltip = `This UTXO is ${
    amountSats <= lowerLimit
      ? "too small (dust) and costs more to spend than its value."
      : amountSats <= upperLimit
      ? "in the warning range; consider batching or consolidating."
      : "economical to spend."
  }`;

  return (
    <Tooltip title={tooltipText ?? defaultTooltip} arrow>
      <Chip
        icon={icon}
        label={label}
        color={color}
        variant="outlined"
        size="small"
        sx={{
          fontSize: "0.75rem",
          height: "24px",
          "& .MuiChip-icon": {
            width: "16px",
            height: "16px",
          },
        }}
      />
    </Tooltip>
  );
};

export default DustChip; 