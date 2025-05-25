import React from "react";
import { useSelector } from "react-redux";
import {
  Box,
  LinearProgress,
  Typography,
  Alert,
  AlertTitle,
} from "@mui/material";
import { FeeStrategySelector } from "../FeeStrategySelector";
import { FeeBumpStatus } from "../../types";
import {
  getFeeBumpRecommendation,
  getFeeBumpStatus,
  getFeeBumpError,
} from "../../../../../../selectors/feeBumping";

/**
 * Step 1: Strategy Selection
 *
 * This component handles the strategy selection step of the fee bumping process.
 * It shows loading states while analyzing the transaction and displays the
 * FeeStrategySelector once analysis is complete.
 */
export const StrategySelectionStep: React.FC = () => {
  const recommendation = useSelector(getFeeBumpRecommendation);
  const status = useSelector(getFeeBumpStatus);
  const error = useSelector(getFeeBumpError);

  // If we have a recommendation, show the strategy selector
  if (recommendation) {
    return <FeeStrategySelector />;
  }

  // Otherwise show loading or error states
  return (
    <Box sx={{ py: 2, textAlign: "center" }}>
      <LinearProgress />
      <Typography sx={{ mt: 2 }}>
        {status === FeeBumpStatus.ANALYZING
          ? "Analyzing transaction and current network conditions..."
          : "Loading transaction details..."}
      </Typography>

      {/* Show helpful tips while waiting */}
      {status === FeeBumpStatus.ANALYZING && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          We&apos;re checking if your transaction can be fee-bumped and getting
          current network fee rates...
        </Typography>
      )}

      {/* Display any errors that occurred during analysis */}
      {error && (
        <Alert severity="error" sx={{ mt: 2, textAlign: "left" }}>
          <AlertTitle>Analysis Error</AlertTitle>
          {error}
        </Alert>
      )}
    </Box>
  );
};
