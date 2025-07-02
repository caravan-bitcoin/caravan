import React from "react";
import { Alert, AlertTitle } from "@mui/material";
import { FeeBumpStrategy } from "@caravan/fees";
import { RBFForm } from "../RBF/RBFForm";
import { useFeeBumpState } from "../../context";
import { Transaction } from "../../../types";

interface ConfigurationStepProps {
  transaction: Transaction;
  onSubmit: (options: {
    isCancel: boolean;
    cancelAddress?: string;
    changeAddress?: string;
  }) => void;
  isCreating: boolean;
}

/**
 * Step 2: Configuration
 *
 * This component handles the configuration step of the fee bumping process.
 * It shows the appropriate form based on the selected strategy (RBF or CPFP).
 * Currently only RBF is implemented.
 */
export const ConfigurationStep: React.FC<ConfigurationStepProps> = ({
  transaction,
  onSubmit,
  isCreating,
}) => {
  const { selectedStrategy } = useFeeBumpState();

  // Calculate original fee rate helper function
  const calculateOriginalFeeRate = (): number => {
    if (!transaction) return 0;
    const txSize = transaction.vsize || transaction.size;
    return txSize ? transaction.fee / txSize : 0;
  };

  // Show RBF form if RBF strategy is selected
  if (selectedStrategy === FeeBumpStrategy.RBF) {
    return (
      <RBFForm
        originalFeeRate={calculateOriginalFeeRate()}
        originalFee={transaction.fee.toString()}
        onSubmit={onSubmit}
        isCreating={isCreating}
      />
    );
  }

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
  return (
    <Alert severity="error">
      <AlertTitle>Unknown Strategy</AlertTitle>
      Please select a valid fee bumping strategy.
    </Alert>
  );
};
