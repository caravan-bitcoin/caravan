import React from "react";
import { Chip } from "@mui/material";
import { Fingerprint, Security } from "@mui/icons-material";
import { useSelector } from "react-redux";
import { walletFingerprintAnalysis } from "../utils/privacyUtils";
import { getAddressType } from "../selectors/wallet";

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
  const walletScriptType = useSelector(getAddressType);
  // Use walletFingerprintAnalysis for privacy logic
  const analysis = walletFingerprintAnalysis(
    outputs,
    walletScriptType as string,
  );
  const hasOutputFingerprinting = analysis.hasWalletFingerprinting;
  const primaryScriptType = walletScriptType;

  return (
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
  );
};

export default OutputFingerprintChip;
