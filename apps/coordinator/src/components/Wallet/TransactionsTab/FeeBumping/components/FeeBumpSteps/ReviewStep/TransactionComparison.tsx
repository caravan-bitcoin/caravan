import React from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Divider,
  Alert,
  AlertTitle,
  Tooltip,
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import CancelIcon from "@mui/icons-material/Cancel";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { formatFee } from "../../../utils";
import { useAccelerationModal } from "../../AccelerationModalContext";
import { RBF_TYPES } from "../../../types";

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
    state: { feeBumpPsbt, rbfType, selectedStrategy },
    transaction: originalTx,
  } = useAccelerationModal();

  if (!originalTx || !feeBumpPsbt) {
    return null;
  }

  // Calculate original fee rate
  const originalFeeRate =
    originalTx.fee / (originalTx.vsize || originalTx.size);

  // Calculate fee difference
  // const feeDifference =
  //   parseInt(result.newFee) - parseInt(originalTx.fee.toString());

  // Determine transaction type
  const txType = rbfType === RBF_TYPES.CANCEL ? "Cancel" : "Accelerate";

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

      {/* Transaction Comparison Boxes */}
      <Box sx={{ display: "flex", alignItems: "stretch", mb: 3 }}>
        <Box
          sx={{ flex: 1, p: 2, borderRadius: 1, border: "1px solid #e0e0e0" }}
        >
          <Typography variant="subtitle1" gutterBottom color="text.secondary">
            Original Transaction
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>TXID:</strong> {originalTx.txid.substring(0, 10)}...
            {originalTx.txid.substring(originalTx.txid.length - 4)}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Fee:</strong> {formatFee(originalTx.fee.toString())}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Fee Rate:</strong> {originalFeeRate.toFixed(1)} sat/vB
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Status:</strong>{" "}
            <Chip label="Pending" color="warning" size="small" />
          </Typography>
        </Box>

        <Box sx={{ mx: 2, display: "flex", alignItems: "center" }}>
          <ArrowForwardIcon />
        </Box>

        <Box
          sx={{
            flex: 1,
            p: 2,
            borderRadius: 1,
            border: "1px solid #1976d2",
            backgroundColor: "rgba(25, 118, 210, 0.04)",
          }}
        >
          <Typography variant="subtitle1" gutterBottom color="primary">
            New Transaction
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Type:</strong> {txType} ({selectedStrategy})
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Fee:</strong> {formatFee(result.newFee)}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Fee Rate:</strong> {result.newFeeRate.toFixed(1)} sat/vB
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Status:</strong>{" "}
            <Chip label="Created" color="success" size="small" />
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Fee Comparison Table */}
      <Typography variant="subtitle1" gutterBottom>
        Fee Comparison
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Metric</TableCell>
              <TableCell align="right">Original</TableCell>
              <TableCell align="right">New</TableCell>
              <TableCell align="right">Difference</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>
                <Box display="flex" alignItems="center">
                  Fee (sats)
                  <Tooltip title="The amount of bitcoin paid to miners to include your transaction in a block">
                    <HelpOutlineIcon
                      fontSize="small"
                      sx={{ ml: 0.5, color: "text.secondary" }}
                    />
                  </Tooltip>
                </Box>
              </TableCell>
              <TableCell align="right">
                {parseInt(originalTx.fee.toString()).toLocaleString()}
              </TableCell>
              <TableCell align="right">
                {parseInt(result.newFee).toLocaleString()}
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  color: feeDifference > 0 ? "error.main" : "success.main",
                  fontWeight: "bold",
                }}
              >
                {feeDifference > 0 ? "+" : ""}
                {feeDifference.toLocaleString()}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <Box display="flex" alignItems="center">
                  Fee Rate (sat/vB)
                  <Tooltip title="The amount of bitcoin paid per virtual byte of transaction data. Higher fee rates make your transaction more attractive to miners.">
                    <HelpOutlineIcon
                      fontSize="small"
                      sx={{ ml: 0.5, color: "text.secondary" }}
                    />
                  </Tooltip>
                </Box>
              </TableCell>
              <TableCell align="right">{originalFeeRate.toFixed(1)}</TableCell>
              <TableCell align="right">
                {result.newFeeRate.toFixed(1)}
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  color:
                    result.newFeeRate > originalFeeRate
                      ? "success.main"
                      : "error.main",
                  fontWeight: "bold",
                }}
              >
                {result.newFeeRate > originalFeeRate ? "+" : ""}
                {(result.newFeeRate - originalFeeRate).toFixed(1)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Next Steps Information */}
      <Box mt={3}>
        <Alert severity="info">
          <AlertTitle>Transaction Replacement Process</AlertTitle>
          <Typography variant="body2">
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
          <Typography variant="body2">
            Most nodes should accept this transaction immediately, but expect
            ~10 minutes for full network propagation.
          </Typography>
        </Alert>
      </Box>
    </Paper>
  );
};
