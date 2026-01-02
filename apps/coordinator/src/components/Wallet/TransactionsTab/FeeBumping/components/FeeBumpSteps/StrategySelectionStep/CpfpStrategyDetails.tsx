import React from "react";
import { Box, Grid, Typography, Tooltip } from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import { formatFee } from "../../../utils";

interface CpfpStrategyDetailsProps {
  minimumFee: number;
  suggestedFeeRate: number;
  targetFeeRate: number;
}

export const CpfpStrategyDetails: React.FC<CpfpStrategyDetailsProps> = ({
  minimumFee,
  suggestedFeeRate,
  targetFeeRate,
}) => {
  return (
    <Box mt={2}>
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Typography variant="body2" color="text.secondary">
              Child transaction fee:
            </Typography>
            <Tooltip title="The fee the new child transaction must pay to accelerate confirmation of the stuck parent transaction">
              <InfoIcon fontSize="small" color="action" />
            </Tooltip>
          </Box>
          <Typography variant="body2" fontWeight="medium">
            {formatFee(minimumFee.toString())}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Typography variant="body2" color="text.secondary">
              Child transaction fee rate:
            </Typography>
            <Tooltip
              title={
                <Box>
                  <Typography variant="caption" display="block" gutterBottom>
                    <strong>CPFP Formula:</strong>
                  </Typography>
                  <Typography
                    variant="caption"
                    display="block"
                    gutterBottom
                    fontFamily="monospace"
                  >
                    (TargetRate × TotalSize - ParentFee) / ChildSize
                  </Typography>
                  <Typography variant="caption" display="block" gutterBottom>
                    Target: {targetFeeRate.toFixed(2)} sat/vB (current network
                    medium rate)
                  </Typography>
                  <Typography variant="caption" display="block">
                    The child pays a higher fee rate so that when miners
                    evaluate parent + child together, the combined effective fee
                    rate reaches the target.
                  </Typography>
                </Box>
              }
            >
              <InfoIcon fontSize="small" color="action" />
            </Tooltip>
          </Box>
          <Typography variant="body2" fontWeight="medium">
            {suggestedFeeRate.toFixed(2)} sat/vB
          </Typography>
        </Grid>
      </Grid>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mt: 1 }}
      >
        Creates a new transaction spending the stuck transaction&apos;s output
        to achieve {targetFeeRate.toFixed(2)} sat/vB combined effective rate for
        both transactions
      </Typography>
    </Box>
  );
};
