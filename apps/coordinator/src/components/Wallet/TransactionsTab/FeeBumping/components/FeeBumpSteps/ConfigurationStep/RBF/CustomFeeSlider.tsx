/* eslint-disable react/prop-types */
import React from "react";
import { Box, Slider, TextField } from "@mui/material";

interface CustomFeeSliderProps {
  feeBumpRate: number;
  onSliderChange: (event: Event, newValue: number | number[]) => void;
  onInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  minimumFeeRate: number;
  maxFeeRate: number;
  show: boolean;
}

export const CustomFeeSlider: React.FC<CustomFeeSliderProps> = React.memo(
  ({
    feeBumpRate,
    onSliderChange,
    onInputChange,
    minimumFeeRate,
    maxFeeRate,
    show,
  }) => {
    // Calculate marks for the slider
    const marks = React.useMemo(() => {
      const minRounded = Math.round(minimumFeeRate * 1000) / 1000;
      const midPoint = Math.floor((minimumFeeRate + maxFeeRate) / 2);

      return [
        {
          value: minRounded,
          label: `${minRounded}`,
        },
        {
          value: midPoint,
          label: `${midPoint}`,
        },
        {
          value: maxFeeRate,
          label: `${maxFeeRate}`,
        },
      ];
    }, [minimumFeeRate, maxFeeRate]);

    if (!show) return null;

    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Slider
          value={feeBumpRate}
          onChange={onSliderChange}
          aria-labelledby="fee-rate-slider"
          min={Math.round(minimumFeeRate * 1000) / 1000}
          max={maxFeeRate}
          step={1}
          marks={marks}
          valueLabelDisplay="on"
          sx={{ flexGrow: 1 }}
        />

        <TextField
          value={feeBumpRate}
          onChange={onInputChange}
          type="number"
          InputProps={{
            inputProps: {
              min: minimumFeeRate.toFixed(2),
              max: maxFeeRate.toFixed(2),
              step: 1,
            },
          }}
          sx={{ width: 100 }}
        />
      </Box>
    );
  },
);

CustomFeeSlider.displayName = "CustomFeeSlider";
