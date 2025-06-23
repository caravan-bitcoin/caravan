import React from "react";
import { Chip, Tooltip } from "@mui/material";
import { Fingerprint, Security } from "@mui/icons-material";

interface OutputFingerprintChipProps {
  outputs: Array<{
    scriptType: string;
    amount: number;
    address?: string;
  }>;
}

const OutputFingerprintChip: React.FC<OutputFingerprintChipProps> = ({
  outputs,
}) => {
  // Check if outputs have mixed script types
  const scriptTypes = outputs.map((output) => output.scriptType);
  const uniqueScriptTypes = [...new Set(scriptTypes)];
  const hasOutputFingerprinting = uniqueScriptTypes.length > 1;

  // Determine primary script type
  const primaryScriptType = scriptTypes.length > 0 ? scriptTypes[0] : "Unknown";

  const tooltipText = hasOutputFingerprinting
    ? `Output fingerprinting detected! Mixed script types: ${uniqueScriptTypes.join(", ")}. This may compromise privacy.`
    : `All outputs use ${primaryScriptType}. No output fingerprinting detected.`;

  if (hasOutputFingerprinting) {
    return (
      <Tooltip title={tooltipText} arrow>
        <Chip
          icon={<Fingerprint />}
          label="Output Fingerprinting"
          color="warning"
          variant="filled"
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
  }

  return (
    <Tooltip title={tooltipText} arrow>
      <Chip
        icon={<Security />}
        label={primaryScriptType}
        color="primary"
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

export default OutputFingerprintChip;
