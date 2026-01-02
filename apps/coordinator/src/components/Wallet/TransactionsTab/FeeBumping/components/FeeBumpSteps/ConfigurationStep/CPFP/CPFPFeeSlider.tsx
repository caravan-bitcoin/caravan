import React from "react";
import {
  Box,
  Typography,
  Slider,
  Tooltip,
  IconButton,
  TextField,
} from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import { FeePriority } from "clients/fees";

interface CPFPFeeSliderProps {
  feeBumpRate: number;
  onSliderChange: (event: Event, value: number | number[]) => void;
  onInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  minimumFeeRate: number;
  maxFeeRate: number;
  feeEstimates: Record<FeePriority, number>;
}

export const CPFPFeeSlider: React.FC<CPFPFeeSliderProps> = ({
  feeBumpRate,
  onSliderChange,
  onInputChange,
  minimumFeeRate,
  maxFeeRate,
  feeEstimates,
}) => {
  // Create fee level markers for the slider
  const feeMarkers = React.useMemo(() => {
    const markers = [];

    if (feeEstimates.low >= minimumFeeRate && feeEstimates.low <= maxFeeRate) {
      markers.push({
        value: feeEstimates.low,
        label: "Economy",
        className: "fee-level-low",
      });
    }

    if (
      feeEstimates.medium >= minimumFeeRate &&
      feeEstimates.medium <= maxFeeRate
    ) {
      markers.push({
        value: feeEstimates.medium,
        label: "Standard",
        className: "fee-level-medium",
      });
    }

    if (
      feeEstimates.high >= minimumFeeRate &&
      feeEstimates.high <= maxFeeRate
    ) {
      markers.push({
        value: feeEstimates.high,
        label: "Priority",
        className: "fee-level-high",
      });
    }

    return markers;
  }, [feeEstimates, minimumFeeRate, maxFeeRate]);

  const valuetext = (value: number) => `${value} sats/vB`;

  const getFeeLevel = (rate: number) => {
    if (rate >= feeEstimates.high) return "Very High";
    if (rate >= feeEstimates.medium) return "High";
    if (rate >= feeEstimates.low) return "Medium";
    return "Low";
  };

  return (
    <Box className="swa-slider-container">
      <Typography variant="subtitle1" className="potential-fee-waste-title">
        Child Transaction Fee Rate
        <Tooltip
          title="The fee rate for the new child transaction being created. This will be higher than the target combined rate to pull up the parent transaction."
          arrow
        >
          <IconButton size="small" className="info-icon-button">
            <InfoOutlined className="info-icon" />
          </IconButton>
        </Tooltip>
      </Typography>

      <Box className="potential-fee-waste-container">
        {/* Current rate display */}
        <Box className="waste-amount-container">
          <Typography variant="h4" className="waste-amount-text">
            {feeBumpRate.toFixed(2)}
          </Typography>
          <Typography variant="body2" className="waste-amount-units">
            sats/vB
          </Typography>
          <Typography
            variant="caption"
            className={`fee-level-indicator fee-level-${getFeeLevel(feeBumpRate).toLowerCase().replace(" ", "-")}`}
          >
            {getFeeLevel(feeBumpRate)}
          </Typography>
        </Box>

        {/* Slider */}
        <Box className="slider-container">
          <Box className="gradient-track" />
          <Slider
            value={feeBumpRate}
            min={minimumFeeRate}
            max={maxFeeRate}
            step={0.1}
            onChange={onSliderChange}
            aria-labelledby="cpfp-fee-rate-slider"
            className="custom-slider"
            valueLabelDisplay="auto"
            getAriaValueText={valuetext}
            valueLabelFormat={valuetext}
          />
        </Box>

        {/* Fee level markers */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mb: 2,
            px: 1,
          }}
        >
          {feeMarkers.map((marker) => (
            <Tooltip
              key={marker.label}
              title={`${marker.label}: ${marker.value.toFixed(2)} sats/vB`}
              arrow
            >
              <Typography
                variant="caption"
                className={`fee-level-indicator ${marker.className}`}
                sx={{ cursor: "pointer" }}
                onClick={() => onSliderChange(new Event("click"), marker.value)}
              >
                {marker.label}
              </Typography>
            </Tooltip>
          ))}
        </Box>

        {/* Manual input */}
        <TextField
          label="Custom Fee Rate (sats/vB)"
          type="number"
          value={feeBumpRate.toFixed(2)}
          onChange={onInputChange}
          size="small"
          inputProps={{
            min: minimumFeeRate,
            max: maxFeeRate,
            step: 0.1,
          }}
          sx={{ width: "200px" }}
        />

        <Typography variant="body2" className="fee-estimate-text">
          Minimum required: {minimumFeeRate.toFixed(2)} sats/vB
          <Tooltip title="This is the minimum combined fee rate needed to incentivize miners to confirm both parent and child transactions together">
            <IconButton size="small" className="info-icon-button">
              <InfoOutlined className="info-icon" />
            </IconButton>
          </Tooltip>
        </Typography>
      </Box>
    </Box>
  );
};
