import React from "react";
import { Grid, Slider, Button } from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import { AdjustFeeRateSliderProps } from "../types";

const AdjustFeeRateSlider: React.FC<AdjustFeeRateSliderProps> = ({
  newFeeRate,
  setNewFeeRate,
  currentFeeRate,
  currentNetworkFeeRate,
  handlePreviewTransaction,
}) => (
  <Grid container spacing={2} alignItems="center">
    <Grid item xs>
      <Slider
        value={newFeeRate}
        onChange={(_, value) => setNewFeeRate(value as number)}
        min={currentFeeRate}
        max={Math.max(100, currentNetworkFeeRate * 2)}
        step={0.1}
        marks={[
          { value: currentFeeRate, label: "Current" },

          { value: Math.max(100, currentNetworkFeeRate * 2), label: "Max" },
        ]}
        valueLabelDisplay="auto"
      />
    </Grid>
    <Grid item>
      <Button
        variant="outlined"
        onClick={handlePreviewTransaction}
        startIcon={<InfoIcon />}
      >
        Preview Transaction
      </Button>
    </Grid>
  </Grid>
);

export default AdjustFeeRateSlider;
