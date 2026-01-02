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
  isCPFP?: boolean;
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
      isCPFP = false,
    }) => {
      const comparisonData = React.useMemo(() => {
        const isCancel = rbfType === "cancel";

        if (isCPFP) {
          // CPFP-specific data
          return {
            txid: {
              original: `${originalTx.txid.substring(0, 12)}...${originalTx.txid.substring(originalTx.txid.length - 8)}`,
              new: "Child TXID will be generated after signing",
            },
            status: {
              original: (
                <Chip label="Parent (Pending)" color="warning" size="small" />
              ),
              new: (
                <Chip label="Child (Created)" color="success" size="small" />
              ),
            },
            rbfAction: {
              original: "Original transaction (will remain)",
              new: "Child transaction spending parent output",
            },
            fee: {
              original: parseInt(originalTx.fee.toString()).toLocaleString(),
              new: `${feeDifference.toLocaleString()} (child only)`,
              difference: (
                <Typography
                  component="span"
                  sx={{
                    color: "info.main",
                    fontWeight: "bold",
                  }}
                >
                  Total: {parseInt(feeBumpResult.newFee).toLocaleString()}
                </Typography>
              ),
            },
            feeRate: {
              original: originalFeeRate.toFixed(2),
              new: `${feeBumpResult.newFeeRate.toFixed(2)} (child Tx FeeRate)`,
              difference: (
                <Typography
                  component="span"
                  sx={{
                    color: "success.main",
                    fontWeight: "bold",
                  }}
                >
                  +{(feeBumpResult.newFeeRate - originalFeeRate).toFixed(2)}
                </Typography>
              ),
            },
          };
        } else {
          // RBF-specific data
          return {
            txid: {
              original: `${originalTx.txid.substring(0, 12)}...${originalTx.txid.substring(originalTx.txid.length - 8)}`,
              new: "Will be generated after signing",
            },
            status: {
              original: <Chip label="Pending" color="warning" size="small" />,
              new: (
                <Chip label="Created (Unsigned)" color="info" size="small" />
              ),
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
              original: originalFeeRate.toFixed(2),
              new: feeBumpResult.newFeeRate.toFixed(2),
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
        }
      }, [originalTx, feeBumpResult, originalFeeRate, feeDifference, rbfType]);

      const tableRows = React.useMemo(
        () => [
          {
            id: "txid", // Add unique id for key
            label: "Transaction ID",
            tooltip: isCPFP
              ? "Parent transaction ID (existing) vs Child transaction ID (will be generated)"
              : "Unique identifier for the Bitcoin transaction",
            originalValue: comparisonData.txid.original,
            newValue: comparisonData.txid.new,
            showDifference: false,
          },
          {
            id: "status", // Add unique id for key
            label: "Status",
            tooltip: isCPFP
              ? "Parent transaction remains pending, child transaction will be created"
              : "Current state of the transaction in the network",
            originalValue: comparisonData.status.original,
            newValue: comparisonData.status.new,
            showDifference: false,
          },
          {
            id: "action", // Add unique id for key
            label: isCPFP ? "Transaction Role" : "RBF Action",
            tooltip: isCPFP
              ? "The parent transaction provides an output for the child to spend"
              : "What will happen when this Replace-by-Fee transaction is broadcast",
            originalValue: comparisonData.rbfAction.original,
            newValue: comparisonData.rbfAction.new,
            showDifference: false,
          },
          {
            id: "fee", // Add unique id for key
            label: "Fee (sats)",
            tooltip: isCPFP
              ? "Parent fee (already paid) vs Child fee (additional) vs Total package fee"
              : "The amount of bitcoin paid to miners to include your transaction in a block",
            originalValue: comparisonData.fee.original,
            newValue: comparisonData.fee.new,
            difference: comparisonData.fee.difference,
          },
          {
            id: "feeRate", // Add unique id for key
            label: "Fee Rate (sats/vB)",
            tooltip: isCPFP
              ? "Parent fee rate vs Combined package fee rate (what miners see)"
              : "The amount of bitcoin paid per virtual byte of transaction data. Higher fee rates make your transaction more attractive to miners.",
            originalValue: comparisonData.feeRate.original,
            newValue: comparisonData.feeRate.new,
            difference: comparisonData.feeRate.difference,
          },
        ],
        [comparisonData, isCPFP],
      );

      return (
        <>
          <Typography variant="subtitle1" gutterBottom>
            {isCPFP ? "Parent vs Child Transaction" : "Transaction Comparison"}
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <strong>Property</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>
                      {isCPFP ? "Parent Transaction" : "Original Transaction"}
                    </strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>
                      {isCPFP ? "Child Transaction" : "New Transaction"}
                    </strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>{isCPFP ? "Package Total" : "Difference"}</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tableRows.map((row) => (
                  <ComparisonRow
                    key={row.id}
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
