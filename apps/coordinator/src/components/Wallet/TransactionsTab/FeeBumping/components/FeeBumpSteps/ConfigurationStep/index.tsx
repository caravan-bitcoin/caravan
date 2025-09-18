import React from "react";
import { Alert, AlertTitle } from "@mui/material";
import { FeeBumpStrategy } from "@caravan/fees";
import { RBFForm } from "./RBF/RBFForm";
import { CPFPForm } from "./CPFP/CPFPForm";
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
  console.log("selectedStrategy", selectedStrategy);
  // Show CPFP placeholder (not implemented yet in next PR)
  if (selectedStrategy === FeeBumpStrategy.CPFP) {
    return <CPFPForm />;
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
