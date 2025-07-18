/* eslint-disable react/prop-types */
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
  Tooltip,
  Chip,
} from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

interface TransactionComparisonTableProps {
  originalTx: any;
  feeBumpResult: any;
  originalFeeRate: number;
  feeDifference: number;
  rbfType: string;
}

// Table Row Component
interface ComparisonRowProps {
  label: string;
  tooltip: string;
  originalValue: React.ReactNode;
  newValue: React.ReactNode;
  difference?: React.ReactNode;
  showDifference?: boolean;
}

const ComparisonRow: React.FC<ComparisonRowProps> = React.memo(
  ({
    label,
    tooltip,
    originalValue,
    newValue,
    difference,
    showDifference = true,
  }) => (
    <TableRow>
      <TableCell>
        <Box display="flex" alignItems="center">
          {label}
          <Tooltip title={tooltip}>
            <HelpOutlineIcon
              fontSize="small"
              sx={{ ml: 0.5, color: "text.secondary" }}
            />
          </Tooltip>
        </Box>
      </TableCell>
      <TableCell align="right">{originalValue}</TableCell>
      <TableCell align="right">{newValue}</TableCell>
      {showDifference && (
        <TableCell align="right">{difference || "—"}</TableCell>
      )}
    </TableRow>
  ),
);

ComparisonRow.displayName = "ComparisonRow";

export const TransactionComparisonTable: React.FC<TransactionComparisonTableProps> =
  React.memo(
    ({
      originalTx,
      feeBumpResult,
      originalFeeRate,
      feeDifference,
      rbfType,
    }) => {
      // Prepare comparison data
      const comparisonData = React.useMemo(() => {
        const isCancel = rbfType === "cancel";

        return {
          txid: {
            original: `${originalTx.txid.substring(0, 12)}...${originalTx.txid.substring(originalTx.txid.length - 8)}`,
            new: "Will be generated after signing",
          },
          status: {
            original: <Chip label="Pending" color="warning" size="small" />,
            new: <Chip label="Created (Unsigned)" color="info" size="small" />,
          },
          rbfAction: {
            original: "Current transaction",
            new: isCancel
              ? "Will cancel and redirect funds"
              : "Will replace with higher fee",
          },
          fee: {
            original: parseInt(originalTx.fee.toString()).toLocaleString(),
            new: parseInt(feeBumpResult.newFee).toLocaleString(),
            difference: (
              <Typography
                component="span"
                sx={{
                  color: feeDifference > 0 ? "error.main" : "success.main",
                  fontWeight: "bold",
                }}
              >
                {feeDifference > 0 ? "+" : ""}
                {feeDifference.toLocaleString()}
              </Typography>
            ),
          },
          feeRate: {
            original: originalFeeRate.toFixed(1),
            new: feeBumpResult.newFeeRate.toFixed(1),
            difference: (
              <Typography
                component="span"
                sx={{
                  color:
                    feeBumpResult.newFeeRate > originalFeeRate
                      ? "success.main"
                      : "error.main",
                  fontWeight: "bold",
                }}
              >
                {feeBumpResult.newFeeRate > originalFeeRate ? "+" : ""}
                {(feeBumpResult.newFeeRate - originalFeeRate).toFixed(1)}
              </Typography>
            ),
          },
        };
      }, [originalTx, feeBumpResult, originalFeeRate, feeDifference, rbfType]);

      const tableRows = React.useMemo(
        () => [
          {
            label: "Transaction ID",
            tooltip: "Unique identifier for the Bitcoin transaction",
            originalValue: comparisonData.txid.original,
            newValue: comparisonData.txid.new,
            showDifference: false,
          },
          {
            label: "Status",
            tooltip: "Current state of the transaction in the network",
            originalValue: comparisonData.status.original,
            newValue: comparisonData.status.new,
            showDifference: false,
          },
          {
            label: "RBF Action",
            tooltip:
              "What will happen when this Replace-by-Fee transaction is broadcast",
            originalValue: comparisonData.rbfAction.original,
            newValue: comparisonData.rbfAction.new,
            showDifference: false,
          },
          {
            label: "Fee (sats)",
            tooltip:
              "The amount of bitcoin paid to miners to include your transaction in a block",
            originalValue: comparisonData.fee.original,
            newValue: comparisonData.fee.new,
            difference: comparisonData.fee.difference,
          },
          {
            label: "Fee Rate (sats/vB)",
            tooltip:
              "The amount of bitcoin paid per virtual byte of transaction data. Higher fee rates make your transaction more attractive to miners.",
            originalValue: comparisonData.feeRate.original,
            newValue: comparisonData.feeRate.new,
            difference: comparisonData.feeRate.difference,
          },
        ],
        [comparisonData],
      );

      return (
        <>
          <Typography variant="subtitle1" gutterBottom>
            Transaction Comparison
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <strong>Property</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Original Transaction</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>New Transaction</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Difference</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tableRows.map((row) => (
                  <ComparisonRow
                    key={row.label}
                    label={row.label}
                    tooltip={row.tooltip}
                    originalValue={row.originalValue}
                    newValue={row.newValue}
                    difference={row.difference}
                    showDifference={row.showDifference}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      );
    },
  );

TransactionComparisonTable.displayName = "TransactionComparisonTable";
