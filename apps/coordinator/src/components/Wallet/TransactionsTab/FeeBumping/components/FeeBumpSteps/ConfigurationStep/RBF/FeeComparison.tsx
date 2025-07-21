/* eslint-disable react/prop-types */
import React from "react";
import { Box, Grid, Typography, Alert, AlertTitle } from "@mui/material";
import { formatFee } from "../../../../utils";

interface FeeComparisonProps {
  originalFee: number;
  estimatedNewFee: number;
  feeDifference: number;
}

// Individual fee item component
const FeeItem: React.FC<{
  label: string;
  value: string;
  color?: string;
}> = React.memo(({ label, value, color }) => (
  <Grid item xs={4}>
    <Typography variant="body2" color="text.secondary">
      {label}:
    </Typography>
    <Typography variant="body1" color={color || "inherit"}>
      {value}
    </Typography>
  </Grid>
));

FeeItem.displayName = "FeeItem";

export const FeeComparison: React.FC<FeeComparisonProps> = React.memo(
  ({ originalFee, estimatedNewFee, feeDifference }) => {
    const differenceColor = feeDifference > 0 ? "error.main" : "success.main";

    return (
      <Box mb={3}>
        <Typography variant="subtitle1" gutterBottom fontWeight="medium">
          Fee Comparison
        </Typography>

        <Grid container spacing={2}>
          <FeeItem
            label="Original fee"
            value={formatFee(originalFee.toString())}
          />
          <FeeItem
            label="Estimated new fee"
            value={formatFee(estimatedNewFee.toString())}
          />
          <FeeItem
            label="Additional fee"
            value={formatFee(feeDifference.toString())}
            color={differenceColor}
          />
        </Grid>

        <Alert severity="info" sx={{ mt: 2 }}>
          <AlertTitle>How are fees calculated?</AlertTitle>
          <Typography variant="body2">
            Transaction fees are calculated as{" "}
            <strong>fee rate × transaction size</strong>. Higher fee rates make
            your transaction more attractive to miners, resulting in faster
            confirmation times.
          </Typography>
        </Alert>
      </Box>
    );
  },
);

FeeComparison.displayName = "FeeComparison";
