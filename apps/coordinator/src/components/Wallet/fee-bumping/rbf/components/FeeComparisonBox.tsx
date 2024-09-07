import React from "react";
import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import { FeeComparisonBoxProps } from "../types";

const StyledBox = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[1],
}));

const FeeComparisonBox: React.FC<FeeComparisonBoxProps> = ({
  currentFees,
  newFees,
  currentFeeRate,
  newFeeRate,
  additionalFees,
}) => (
  <StyledBox>
    <Box>
      <Typography variant="subtitle1">Current Fee</Typography>
      <Typography variant="h5">{currentFees} BTC</Typography>
      <Typography variant="body2">({currentFeeRate} sat/vB)</Typography>
    </Box>
    <CompareArrowsIcon fontSize="large" color="action" />
    <Box>
      <Typography variant="subtitle1">New Fee</Typography>
      <Typography variant="h5" color="primary">
        {newFees} BTC
      </Typography>
      <Typography variant="body2" color="primary">
        ({newFeeRate.toFixed(2)} sat/vB)
      </Typography>
    </Box>
  </StyledBox>
);

export default FeeComparisonBox;
