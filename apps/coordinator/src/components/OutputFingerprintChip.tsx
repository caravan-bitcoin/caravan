import React from "react";
import { Chip, Tooltip } from "@mui/material";
import { Fingerprint, Security } from "@mui/icons-material";
import { useSelector } from "react-redux";
import { walletFingerprintAnalysis } from "../utils/dustUtils";

interface OutputFingerprintChipProps {
  outputs: Array<{
    scriptType: string;
    amount: number;
    address?: string;
  }>;
  label?: string;
  sx?: object;
}

const OutputFingerprintChip: React.FC<OutputFingerprintChipProps> = ({
  outputs,
  label,
  sx = {},
}) => {
  // Pull wallet script type from settings
  const walletScriptType = useSelector(
    (state: any) => state.settings?.addressType || "Unknown",
  );
  // Use walletFingerprintAnalysis for privacy logic
  const analysis = walletFingerprintAnalysis(outputs, walletScriptType);
  const hasOutputFingerprinting = analysis.hasWalletFingerprinting;
  const uniqueScriptTypes = analysis.scriptTypes;
  const primaryScriptType = walletScriptType;
  const tooltipText = hasOutputFingerprinting
    ? `Output fingerprinting detected! Mixed script types: ${uniqueScriptTypes.join(", ")}. This may compromise privacy.`
    : `All outputs use ${primaryScriptType}. No output fingerprinting detected.`;

  return (
    <Tooltip title={tooltipText}>
      <Chip
        icon={hasOutputFingerprinting ? <Fingerprint /> : <Security />}
        label={
          label ||
          (hasOutputFingerprinting
            ? "Output Fingerprinting"
            : primaryScriptType || "Output")
        }
        color={hasOutputFingerprinting ? "warning" : "info"}
        variant={hasOutputFingerprinting ? "filled" : "outlined"}
        size="small"
        sx={{
          fontSize: "0.8rem",
          height: "26px",
          ...sx,
        }}
      />
    </Tooltip>
  );
};

export default OutputFingerprintChip;
