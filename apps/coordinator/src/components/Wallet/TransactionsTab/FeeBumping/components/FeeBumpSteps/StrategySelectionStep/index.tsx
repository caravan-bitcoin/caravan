import React from "react";
import {
  Box,
  LinearProgress,
  Typography,
  Alert,
  AlertTitle,
} from "@mui/material";
import { FeeStrategySelector } from "./FeeStrategySelector";
import { useAccelerationModal } from "../../AccelerationModalContext";
import { useAnalyzeTransaction } from "../../hooks";

/**
 * Step 1: Strategy Selection
 *
 * This component handles the strategy selection step of the fee bumping process.
 * It shows loading states while analyzing the transaction and displays the
 * FeeStrategySelector once analysis is complete.
 */
export const StrategySelectionStep: React.FC = () => {
  const { transaction, txHex } = useAccelerationModal();
  const { analysis, isLoading } = useAnalyzeTransaction(transaction, txHex);

  // If we have a recommendation, show the strategy selector
  if (analysis?.recommendedStrategy) {
    return <FeeStrategySelector />;
  }

  if (isLoading) {
    return (
      <Box sx={{ py: 2, textAlign: "center" }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Loading transaction analysis...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 2, textAlign: "center" }}>
      <Alert severity="error" sx={{ mt: 2, textAlign: "left" }}>
        <AlertTitle>Analysis Error</AlertTitle>
        There was an error analyzing the transaction. Please try again.
      </Alert>
    </Box>
  );
};
