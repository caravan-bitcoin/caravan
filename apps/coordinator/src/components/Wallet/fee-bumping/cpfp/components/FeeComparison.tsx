import React from "react";
import { Typography, Grid, Box } from "@mui/material";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import { FeeBox, StyledPaper } from "../styles";

interface FeeComparisonProps {
  parentFee: string;
  childFee: string;
  parentSize: number;
  childSize: number;
  combinedFeeRate: string;
}

const FeeComparison: React.FC<FeeComparisonProps> = ({
  parentFee,
  childFee,
  parentSize,
  childSize,
  combinedFeeRate,
}) => {
  const totalFee = (parseFloat(parentFee) + parseFloat(childFee)).toFixed(8);

  return (
    <StyledPaper elevation={3}>
      <Typography variant="h6" gutterBottom>
        Fee Comparison
      </Typography>
      <Grid container spacing={3} alignItems="center">
        <Grid item xs={12} md={4}>
          <FeeBox>
            <Typography variant="subtitle1">Parent Transaction</Typography>
            <Typography variant="h6">{parentFee} BTC</Typography>
            <Typography variant="body2">
              ({((parseFloat(parentFee) / parentSize) * 100000000).toFixed(2)}{" "}
              sat/vB)
            </Typography>
          </FeeBox>
        </Grid>
        <Grid item xs={12} md={1}>
          <Box display="flex" justifyContent="center">
            <ArrowDownwardIcon color="action" fontSize="large" />
          </Box>
        </Grid>
        <Grid item xs={12} md={4}>
          <FeeBox>
            <Typography variant="subtitle1">Child Transaction</Typography>
            <Typography variant="h6" color="primary">
              {childFee} BTC
            </Typography>
            <Typography variant="body2" color="primary">
              ({((parseFloat(childFee) / childSize) * 100000000).toFixed(2)}{" "}
              sat/vB)
            </Typography>
          </FeeBox>
        </Grid>
        <Grid item xs={12} md={3}>
          <FeeBox>
            <Typography variant="subtitle1">Combined</Typography>
            <Typography variant="h6" color="secondary">
              {totalFee} BTC
            </Typography>
            <Typography variant="body2" color="secondary">
              ({combinedFeeRate} sat/vB)
            </Typography>
          </FeeBox>
        </Grid>
      </Grid>
    </StyledPaper>
  );
};

export default FeeComparison;
