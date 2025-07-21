import React from "react";
import { Alert, AlertTitle } from "@mui/material";
import { FeeBumpStrategy } from "@caravan/fees";
import { RBFForm } from "./RBF/RBFForm";
import { useAccelerationModal } from "../../AccelerationModalContext";

/**
 * Step 2: Configuration
 *
 * This component handles the configuration step of the fee bumping process.
 * It shows the appropriate form based on the selected strategy (RBF or CPFP).
 * Currently only RBF is implemented.
 */
export const ConfigurationStep: React.FC = () => {
  const {
    state: { selectedStrategy },
  } = useAccelerationModal();

  // Show CPFP placeholder (not implemented yet in next PR)
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
  if (selectedStrategy === FeeBumpStrategy.RBF) {
    return <RBFForm />;
  }
  return (
    <Alert severity="error">
      <AlertTitle>Unknown Strategy</AlertTitle>
      Please select a valid fee bumping strategy.
    </Alert>
  );
};
