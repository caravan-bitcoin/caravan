import React from "react";
import { Chip } from "@mui/material";

interface ScriptTypeChipProps {
  scriptType: string;
  color?:
    | "default"
    | "primary"
    | "secondary"
    | "error"
    | "info"
    | "success"
    | "warning";
  icon?: React.ReactElement;
  variant?: "filled" | "outlined";
  sx?: object;
}

const ScriptTypeChip: React.FC<ScriptTypeChipProps> = ({
  scriptType,
  color = "info",
  icon,
  variant = "outlined",
  sx = {},
}) => {
  return (
    <Chip
      label={scriptType}
      size="small"
      {...(icon ? { icon } : {})}
      color={color}
      variant={variant}
      sx={{
        fontSize: "0.8rem",
        height: "26px",
        ...sx,
      }}
    />
  );
};

export default ScriptTypeChip;
