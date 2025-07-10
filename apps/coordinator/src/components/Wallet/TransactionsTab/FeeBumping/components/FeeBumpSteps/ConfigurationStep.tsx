import React, { useEffect } from "react";
import { Alert, AlertTitle, Box, CircularProgress } from "@mui/material";
import { FeeBumpStrategy } from "@caravan/fees";
import { RBFForm } from "../RBF/RBFForm";
import { useFeeBumpContext } from "../../context";

/**
 * Step 2: Configuration
 *
 * This component handles the configuration step of the fee bumping process.
 * It shows the appropriate form based on the selected strategy (RBF or CPFP).
 * Currently only RBF is implemented.
 */
export const ConfigurationStep: React.FC = () => {
  const contextData = useFeeBumpContext();

  // Early return for loading state
  if (!contextData) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  const {
    state: { selectedStrategy },
  } = contextData;

  // Show CPFP placeholder (not implemented yet)
  if (selectedStrategy === FeeBumpStrategy.CPFP) {
    return (
      <Alert severity="warning">
        <AlertTitle>CPFP Support Coming Soon</AlertTitle>
        Child-Pays-for-Parent (CPFP) support is coming in a future update.
        Please use Replace-by-Fee (RBF) for now.
      </Alert>
    );
  }

  // Fallback for unknown strategies
  if (selectedStrategy === FeeBumpStrategy.NONE) {
    return (
      <Alert severity="error">
        <AlertTitle>Unknown Strategy</AlertTitle>
        Please select a valid fee bumping strategy.
      </Alert>
    );
  }

  return <RBFForm />;
};
