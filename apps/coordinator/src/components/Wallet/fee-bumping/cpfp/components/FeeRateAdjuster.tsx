import React from "react";
import { Typography, Slider } from "@mui/material";
import { StyledPaper } from "../styles";

interface FeeRateAdjusterProps {
  newFeeRate: number;
  setNewFeeRate: (rate: number) => void;
  minFeeRate: number;
  currentNetworkFeeRate: number;
}

const FeeRateAdjuster: React.FC<FeeRateAdjusterProps> = ({
  newFeeRate,
  setNewFeeRate,
  minFeeRate,
  currentNetworkFeeRate,
}) => {
  return (
    <StyledPaper elevation={3}>
      <Typography variant="h6" gutterBottom>
        Adjust Fee Rate
      </Typography>
      <Slider
        value={newFeeRate}
        onChange={(_, value) => setNewFeeRate(value as number)}
        min={minFeeRate}
        max={Math.max(100, currentNetworkFeeRate * 2)}
        step={0.1}
        marks={[
          { value: minFeeRate, label: "Min" },
          { value: currentNetworkFeeRate, label: "Current" },
          { value: Math.max(100, currentNetworkFeeRate * 2), label: "Max" },
        ]}
        valueLabelDisplay="auto"
      />
      <Typography variant="body2" color="textSecondary" align="center">
        Move the slider to adjust the fee rate for the child transaction
      </Typography>
    </StyledPaper>
  );
};

export default FeeRateAdjuster;
