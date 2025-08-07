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
    state: { feeBumpResult, rbfType },
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

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        Transaction Comparison
      </Typography>

      {/* Transaction Type Header */}
      <Box mb={3}>
        <Alert
          severity={rbfType === RBF_TYPES.CANCEL ? "warning" : "info"}
          icon={
            rbfType === RBF_TYPES.CANCEL ? (
              <CancelIcon />
            ) : (
              <CompareArrowsIcon />
            )
          }
        >
          <AlertTitle>
            {rbfType === RBF_TYPES.CANCEL
              ? "Cancel Transaction"
              : "Accelerated Transaction"}
          </AlertTitle>
          <Typography variant="body2">
            {rbfType === RBF_TYPES.CANCEL
              ? "This transaction will cancel the original transaction and redirect all funds to a new address."
              : "This transaction will replace the original transaction with the same outputs but a higher fee."}
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
          <AlertTitle>Transaction Replacement Process</AlertTitle>
          <Typography variant="body2" component="div" sx={{ lineHeight: 1.8 }}>
            Once signed and broadcast, this transaction will attempt to replace
            the original transaction. The network will accept the replacement
            if:
          </Typography>
          <ul style={{ margin: "8px 0" }}>
            <li>The original transaction signals RBF (Replace-by-Fee)</li>
            <li>The new transaction pays a higher fee rate</li>
            <li>
              The new transaction spends at least the same inputs as the
              original
            </li>
          </ul>
          <Typography variant="body2" component="div" sx={{ lineHeight: 1.8 }}>
            Most nodes should accept this transaction immediately, but expect
            ~10 minutes for full network propagation.
          </Typography>
        </Alert>
      </Box>
    </Paper>
  );
};
