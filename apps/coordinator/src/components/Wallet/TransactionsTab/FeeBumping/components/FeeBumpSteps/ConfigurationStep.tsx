import React from "react";
import { Alert, AlertTitle } from "@mui/material";
import { FeeBumpStrategy } from "@caravan/fees";
import { RBFForm } from "../RBF/RBFForm";
import { CPFPForm } from "../CPFP/CPFPForm";
import {
  useSelectedFeeBumpStrategy,
  useFeeBumpTransaction,
} from "../../context";
import { Transaction } from "../../../types";

interface ConfigurationStepProps {
  transaction: Transaction;
  onSubmit: (options: any) => void;
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
  const selectedStrategy = useSelectedFeeBumpStrategy();

  // Calculate original fee rate helper function
  const calculateOriginalFeeRate = (): number => {
    if (!transaction) return 0;
    const txSize = transaction.vsize || transaction.size;
    return txSize ? transaction.fee / txSize : 0;
  };

  // Helper to identify spendable outputs for CPFP
  const getSpendableOutputs = () => {
    if (!transaction?.vout) return [];

    return transaction.vout
      .map((output: any, index: number) => ({
        index,
        address:
          output.scriptPubkeyAddress ||
          output.scriptpubkey_address ||
          "Unknown",
        value: output.value?.toString() || "0",
        belongsToWallet: output.belongsToWallet || false,
      }))
      .filter(
        (output: any) =>
          // Only include outputs that belong to the wallet or have value > dust threshold
          output.belongsToWallet || parseInt(output.value) > 546,
      );
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

  // Show CPFP form if CPFP strategy is selected
  if (selectedStrategy === FeeBumpStrategy.CPFP) {
    const spendableOutputs = getSpendableOutputs();

    if (spendableOutputs.length === 0) {
      return (
        <Alert severity="error">
          <AlertTitle>No Spendable Outputs Found</AlertTitle>
          This transaction has no outputs that can be spent for CPFP. You need
          to control at least one output from this transaction to use CPFP.
        </Alert>
      );
    }

    return (
      <CPFPForm
        originalTx={transaction}
        originalFeeRate={calculateOriginalFeeRate()}
        originalFee={transaction.fee.toString()}
        spendableOutputs={spendableOutputs}
        onSubmit={onSubmit}
        isCreating={isCreating}
      />
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
