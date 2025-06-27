import React from "react";
import PropTypes from "prop-types";
import { Box, Typography, Slider, Tooltip, IconButton } from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";

export const SWASlider = ({
  wasteAmount,
  longTermFeeEstimate,
  onFeeEstimateChange,
}) => {
  const getFeeLevelInfo = (feeRate) => {
    if (feeRate <= 100) {
      return { label: "Very Low Fees", className: "fee-level-very-low" };
    } else if (feeRate <= 200) {
      return { label: "Low Fees", className: "fee-level-low" };
    } else if (feeRate <= 300) {
      return { label: "Medium Fees", className: "fee-level-medium" };
    } else if (feeRate <= 400) {
      return { label: "High Fees", className: "fee-level-high" };
    } else {
      return { label: "Very High Fees", className: "fee-level-very-high" };
    }
  };

  const handleSliderChange = (event, value) => {
    const newValue = Array.isArray(value) ? value[0] : value;
    onFeeEstimateChange(newValue);
  };

  const formatNumber = (num) => {
    return num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const feeLevelInfo = getFeeLevelInfo(longTermFeeEstimate);

  return (
    <Box className="swa-slider-container">
      <Typography variant="h6" className="waste-analysis-title">
        Waste Analysis
      </Typography>

      <Typography variant="body2" className="waste-analysis-description">
        Analyzes if spending Bitcoin now is efficient or if waiting could be
        cheaper
      </Typography>

      <Box className="potential-fee-waste-container">
        <Typography variant="h6" className="potential-fee-waste-title">
          Potential Fee Waste
        </Typography>

        <Box className="waste-amount-container">
          <Typography variant="h4" className="waste-amount-text">
            {formatNumber(wasteAmount)} sats
          </Typography>
          <Tooltip title="This shows how much extra you may be paying by spending coins now.">
            <IconButton size="small" className="info-icon-button">
              <InfoIcon className="info-icon" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Color-coded slider */}
        <Box className="slider-container">
          {/* Background gradient track */}
          <Box className="gradient-track" />

          {/* Slider positioned over the gradient */}
          <Slider
            value={longTermFeeEstimate}
            min={1}
            max={500}
            step={1}
            onChange={handleSliderChange}
            aria-labelledby="long-term-fee-estimate-slider"
            className="custom-slider"
          />
        </Box>

        <Typography
          id="long-term-fee-estimate-slider"
          variant="body2"
          className="fee-estimate-text"
        >
          Long Term Fee Estimate (L): {longTermFeeEstimate.toLocaleString()}{" "}
          sats/vB
          <Tooltip title="L is a hypothetical future fee rate used to evaluate output viability (dust/waste).">
            <IconButton size="small" className="info-icon-button">
              <InfoIcon className="info-icon" />
            </IconButton>
          </Tooltip>
        </Typography>

        {/* Fee level indicator */}
        <Typography
          variant="body2"
          className={`fee-level-indicator ${feeLevelInfo.className}`}
        >
          {feeLevelInfo.label}
        </Typography>
      </Box>

      <Typography variant="body2" className="swa-description">
        SWA indicates whether it is economical to spend now or wait to
        consolidate later when fees could be low.
      </Typography>
    </Box>
  );
};

SWASlider.propTypes = {
  wasteAmount: PropTypes.number.isRequired,
  longTermFeeEstimate: PropTypes.number.isRequired,
  onFeeEstimateChange: PropTypes.func.isRequired,
};
