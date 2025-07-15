/* eslint-disable react/prop-types */
import React from "react";
import {
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Box,
  Typography,
  Chip,
} from "@mui/material";
import { FeeLevelType, FEE_LEVELS, FEE_LEVEL_COLORS } from "../../../../types";
import { FeePriority } from "clients/fees";

// Props for individual fee label
interface FeeLabelProps {
  title: string;
  feeRate?: number;
  color: string;
  showChip?: boolean;
}

// Memoized FeeLabel component
const FeeLabel: React.FC<FeeLabelProps> = React.memo(
  ({ title, feeRate, color, showChip = true }) => (
    <Box sx={{ display: "flex", alignItems: "center" }}>
      <Typography variant="body2" component="span">
        {title}
      </Typography>
      {showChip && feeRate !== undefined && !isNaN(feeRate) && (
        <Chip
          label={`${Math.ceil(feeRate)} sat/vB`}
          size="small"
          sx={{ ml: 1, backgroundColor: color, color: "white" }}
        />
      )}
    </Box>
  ),
);
FeeLabel.displayName = "FeeLabel";

// Props for the main selector
interface FeeLevelSelectorProps {
  currentFeeLevel: FeeLevelType;
  onFeeLevelChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  feeEstimates: Record<FeePriority, number>;
  feeBumpRate?: number;
  disabled?: boolean;
}

// Main memoized selector component
export const FeeLevelSelector: React.FC<FeeLevelSelectorProps> = React.memo(
  ({
    currentFeeLevel,
    onFeeLevelChange,
    feeEstimates,
    feeBumpRate,
    disabled = false,
  }) => {
    // Derive options with useMemo for performance
    const options = React.useMemo(
      () => [
        {
          value: FEE_LEVELS.LOW,
          title: "Economy",
          feeRate: feeEstimates[FEE_LEVELS.LOW],
          color: FEE_LEVEL_COLORS[FEE_LEVELS.LOW],
          showChip: true,
        },
        {
          value: FEE_LEVELS.MEDIUM,
          title: "Standard",
          feeRate: feeEstimates[FEE_LEVELS.MEDIUM],
          color: FEE_LEVEL_COLORS[FEE_LEVELS.MEDIUM],
          showChip: true,
        },
        {
          value: FEE_LEVELS.HIGH,
          title: "Priority",
          feeRate: feeEstimates[FEE_LEVELS.HIGH],
          color: FEE_LEVEL_COLORS[FEE_LEVELS.HIGH],
          showChip: true,
        },
        {
          value: FEE_LEVELS.CUSTOM,
          title: "Custom",
          feeRate:
            currentFeeLevel === FEE_LEVELS.CUSTOM ? feeBumpRate : undefined,
          color: FEE_LEVEL_COLORS[FEE_LEVELS.CUSTOM],
          showChip: currentFeeLevel === FEE_LEVELS.CUSTOM,
        },
      ],
      [feeEstimates, currentFeeLevel, feeBumpRate],
    );

    return (
      <FormControl component="fieldset" sx={{ mb: 2 }} disabled={disabled}>
        <RadioGroup
          row
          aria-label="fee-level"
          name="fee-level"
          value={currentFeeLevel}
          onChange={onFeeLevelChange}
        >
          {options.map(({ value, title, feeRate, color, showChip }) => (
            <FormControlLabel
              key={value}
              value={value}
              control={<Radio />}
              label={
                <FeeLabel
                  title={title}
                  feeRate={feeRate}
                  color={color}
                  showChip={showChip}
                />
              }
            />
          ))}
        </RadioGroup>
      </FormControl>
    );
  },
);

FeeLevelSelector.displayName = "FeeLevelSelector";
