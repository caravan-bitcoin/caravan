import React from "react";
import {
  Box,
  Paper,
  Typography,
  Divider,
  Alert,
  AlertTitle,
} from "@mui/material";

import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import CancelIcon from "@mui/icons-material/Cancel";
import ChildCareIcon from "@mui/icons-material/ChildCare";

import { FeeBumpStrategy } from "@caravan/fees";

import { useAccelerationModal } from "../../AccelerationModalContext";
import { RBF_TYPES } from "../../../types";

import { TransactionComparisonTable } from "./TransactionComparisonTable ";

/**
 * Component for comparing original and fee-bumped transactions
 *
 * This component provides a detailed comparison between the original
 * transaction and the newly created fee-bumped transaction, including:
 * - Fee amounts and rates
 * - Confirmation time estimates
 * - Transaction types and characteristics
 *
 * It helps users understand exactly what changes the fee bump will make.
 */
export const TransactionComparison: React.FC = () => {
  // Get state from Context if not provided as props (for backward compatibility)
  const {
    state: { feeBumpResult, rbfType, selectedStrategy },
    transaction: originalTx,
  } = useAccelerationModal();

  if (!originalTx || !feeBumpResult) {
    return null;
  }

  // Calculate original fee rate
  const originalFeeRate =
    originalTx.fee / (originalTx.vsize || originalTx.size);

  // Calculate fee difference
  const feeDifference =
    parseInt(feeBumpResult.newFee) - parseInt(originalTx.fee.toString());

  // Determine transaction type and configure UI elements
  const isCPFP = selectedStrategy === FeeBumpStrategy.CPFP;
  const isCancel = !isCPFP && rbfType === RBF_TYPES.CANCEL;

  // So we set a configuration object for different transaction types
  const transactionConfig = (() => {
    if (isCPFP) {
      return {
        severity: "success" as const,
        icon: <ChildCareIcon />,
        title: "Child-Pays-for-Parent Transaction",
        description:
          "A new child transaction will be created that spends from your original transaction. The child pays a high fee to incentivize miners to confirm both transactions together as a package.",
        nextStepsTitle: "CPFP Transaction Process",
        nextStepsBody: (
          <>
            Once signed and broadcast, this child transaction will:
            <ul style={{ margin: "8px 0" }}>
              <li>Spend an output from your original (parent) transaction</li>
              <li>
                Pay a high enough fee to make the entire package attractive to
                miners
              </li>
              <li>Cause both parent and child to be mined together</li>
              <li>
                Your original transaction will NOT be replaced - both will
                confirm
              </li>
            </ul>
            Miners are incentivized to include both transactions because the
            combined fee rate is profitable.
          </>
        ),
      };
    }

    if (isCancel) {
      return {
        severity: "warning" as const,
        icon: <CancelIcon />,
        title: "Cancel Transaction",
        description:
          "This transaction will cancel the original transaction and redirect all funds to a new address.",
        nextStepsTitle: "Transaction Replacement Process",
        nextStepsBody: (
          <>
            Once signed and broadcast, this transaction will attempt to replace
            the original transaction. The network will accept the replacement
            if:
            <ul style={{ margin: "8px 0" }}>
              <li>The original transaction signals RBF (Replace-by-Fee)</li>
              <li>The new transaction pays a higher fee rate</li>
              <li>
                The new transaction spends at least the same inputs as the
                original
              </li>
            </ul>
            Most nodes should accept this transaction immediately, but expect
            ~10 minutes for full network propagation.
          </>
        ),
      };
    }

    // Default to accelerated RBF transaction
    return {
      severity: "info" as const,
      icon: <CompareArrowsIcon />,
      title: "Accelerated Transaction",
      description:
        "This transaction will replace the original transaction with the same outputs but a higher fee.",
      nextStepsTitle: "Transaction Replacement Process",
      nextStepsBody: (
        <>
          Once signed and broadcast, this transaction will attempt to replace
          the original transaction. The network will accept the replacement if:
          <ul style={{ margin: "8px 0" }}>
            <li>The original transaction signals RBF (Replace-by-Fee)</li>
            <li>The new transaction pays a higher fee rate</li>
            <li>
              The new transaction spends at least the same inputs as the
              original
            </li>
          </ul>
          Most nodes should accept this transaction immediately, but expect ~10
          minutes for full network propagation.
        </>
      ),
    };
  })();

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        {isCPFP ? "CPFP Transaction Details" : "Transaction Comparison"}
      </Typography>

      {/* Transaction Type Header */}
      <Box mb={3}>
        <Alert
          severity={transactionConfig.severity}
          icon={transactionConfig.icon}
        >
          <AlertTitle>{transactionConfig.title}</AlertTitle>
          <Typography variant="body2">
            {transactionConfig.description}
          </Typography>
        </Alert>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Transaction Comparison Table */}
      <TransactionComparisonTable
        originalTx={originalTx}
        feeBumpResult={feeBumpResult}
        originalFeeRate={originalFeeRate}
        feeDifference={feeDifference}
        rbfType={rbfType!}
        isCPFP={isCPFP}
      />

      {/* Next Steps Information */}
      <Box
        mt={3}
        sx={{
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Alert severity="info">
          <AlertTitle>{transactionConfig.nextStepsTitle}</AlertTitle>
          <Typography variant="body2" component="div" sx={{ lineHeight: 1.8 }}>
            {transactionConfig.nextStepsBody}
          </Typography>
        </Alert>
      </Box>
    </Paper>
  );
};
