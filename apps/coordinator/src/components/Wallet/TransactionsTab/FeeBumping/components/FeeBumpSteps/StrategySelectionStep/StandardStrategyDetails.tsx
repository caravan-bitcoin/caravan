import React from "react";
import { Box, Grid, Typography } from "@mui/material";
import { formatFee } from "../../../utils";

interface StandardStrategyDetailsProps {
  minimumFee: number;
  suggestedFeeRate: number;
}

export const StandardStrategyDetails: React.FC<
  StandardStrategyDetailsProps
> = ({ minimumFee, suggestedFeeRate }) => {
  return (
    <Box mt={2}>
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <Typography variant="body2" color="text.secondary">
            Minimum fee required:
          </Typography>
          <Typography variant="body2" fontWeight="medium">
            {formatFee(minimumFee.toString())}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="body2" color="text.secondary">
            Suggested fee rate:
          </Typography>
          <Typography variant="body2" fontWeight="medium">
            {suggestedFeeRate.toFixed(1)} sat/vB
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
};
