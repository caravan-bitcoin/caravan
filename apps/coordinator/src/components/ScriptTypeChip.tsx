import React from "react";
import { Chip, Tooltip } from "@mui/material";
import { getScriptTypeName } from "../utils/dustUtils";

/**
 * ScriptTypeChip displays a colored chip for a given Bitcoin script type.
 * The color and label help users quickly identify the type of address/script.
 */
interface ScriptTypeChipProps {
  scriptType: string;
}

// Map script types to their display colors and backgrounds.
// This makes it easy to visually distinguish between types in the UI.
const styleMap: { [key: string]: { backgroundColor: string; color: string } } =
  {
    P2PKH: { backgroundColor: "#e0f7fa", color: "#00796b" },
    P2SH: { backgroundColor: "#fffde7", color: "#fbc02d" },
    P2WPKH: { backgroundColor: "#e8f5e9", color: "#388e3c" },
    "P2SH-P2WPKH": { backgroundColor: "#e8f5e9", color: "#388e3c" },
    P2WSH: { backgroundColor: "#f3e5f5", color: "#7b1fa2" },
    "P2SH-P2WSH": { backgroundColor: "#f3e5f5", color: "#7b1fa2" },
    default: { backgroundColor: "#f5f5f5", color: "#616161" },
  };

const ScriptTypeChip: React.FC<ScriptTypeChipProps> = ({ scriptType }) => {
  const scriptName = getScriptTypeName(scriptType);
  const chipStyle = styleMap[scriptType] || styleMap.default;

  return (
    <Tooltip title={`Script Type: ${scriptName} (${scriptType})`} arrow>
      <Chip
        label={scriptName}
        size="small"
        variant="outlined"
        sx={{
          ...chipStyle,
          fontSize: "0.8rem",
          height: "26px",
          borderColor: chipStyle.color,
        }}
      />
    </Tooltip>
  );
};

export default ScriptTypeChip;
