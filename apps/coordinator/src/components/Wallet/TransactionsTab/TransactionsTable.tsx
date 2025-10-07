import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  Box,
  Typography,
  Button,
} from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { satoshisToBitcoins } from "@caravan/bitcoin";
import { formatDistanceToNow } from "date-fns";
import { OpenInNew } from "@mui/icons-material";
import {
  TransactionT,
  TransactionTableProps,
  FeeDisplayProps,
  ValueDisplayProps,
  SortBy,
  SortDirection,
} from "./types";

// Helper function to format the relative time
const formatRelativeTime = (timestamp?: number): string => {
  if (!timestamp) return "Pending";
  return formatDistanceToNow(new Date(timestamp * 1000), { addSuffix: true });
};

// Column definitions with sorting configuration - dynamic based on showAcceleration
const getColumns = (showAcceleration: boolean) => [
  { id: "txid", label: "Transaction ID", sortable: false },
  { id: "blockTime", label: "Time", sortable: false },
  { id: "size", label: "Size (vBytes)", sortable: false },
  { id: "fee", label: "Fee (sats)", sortable: false },
  { id: "valueToWallet", label: "Value", sortable: false },
  { id: "status", label: "Status", sortable: false },
  ...(showAcceleration
    ? [{ id: "accelerate", label: "Accelerate", sortable: false }]
    : []),
  { id: "actions", label: "", sortable: false },
];

/**
 * FeeDisplay component to show transaction fees with appropriate handling for:
 * - Normal fee display (both sats and BTC)
 * - Received transactions (no fee available)
 * - Missing fee data
 */
export const FeeDisplay: React.FC<FeeDisplayProps> = ({
  feeInSats,
  isReceived = false,
}) => {
  // For missing fee data
  if (feeInSats === null || feeInSats === undefined) {
    return (
      <Tooltip title="Fee information not available" placement="top">
        <Box display="flex" alignItems="center">
          <Typography variant="body2" color="textSecondary" sx={{ mr: 0.5 }}>
            --
          </Typography>
          <InfoOutlinedIcon fontSize="small" color="disabled" />
        </Box>
      </Tooltip>
    );
  }

  // For received transactions, show fee in green with a note , also fee comes in BTC format - convert to sats
  if (isReceived) {
    // feeInSats is actually in BTC format when isReceived is true
    const feeInBTC = satoshisToBitcoins(feeInSats!) || "0";
    const actualFeeInSats = Number(feeInSats);

    return (
      <Tooltip title="You did not spend this fee" placement="top">
        <Box display="flex" flexDirection="column">
          <Typography variant="body2" sx={{ color: "green", fontWeight: 500 }}>
            {actualFeeInSats?.toLocaleString() ?? "--"} sats
          </Typography>
          {feeInBTC && (
            <Typography
              variant="caption"
              sx={{ color: "green", fontWeight: 400 }}
            >
              {feeInBTC} BTC
            </Typography>
          )}
        </Box>
      </Tooltip>
    );
  }

  // Normal fee display
  const feeInBTC = satoshisToBitcoins(feeInSats.toString());

  return (
    <Tooltip
      title={
        <Box>
          <Typography variant="caption">
            {`${feeInSats.toLocaleString()} sats`}
          </Typography>
          <br />
          <Typography variant="caption">{`${feeInBTC} BTC`}</Typography>
        </Box>
      }
      placement="top"
    >
      <Box>
        <Typography variant="body2" color="textPrimary">
          {feeInSats.toLocaleString()} sats
        </Typography>
        <Typography variant="caption" color="textSecondary">
          {feeInBTC} BTC
        </Typography>
      </Box>
    </Tooltip>
  );
};

/**
 * ValueDisplay component to show transaction value with appropriate handling for:
 * - Incoming payments (positive value)
 * - Outgoing payments (negative value)
 * - Missing value data
 */
export const ValueDisplay: React.FC<ValueDisplayProps> = ({ valueInSats }) => {
  // For missing value data
  if (valueInSats === null || valueInSats === undefined) {
    return (
      <Tooltip title="Value information not available" placement="top">
        <Box display="flex" alignItems="center">
          <Typography variant="body2" color="textSecondary" sx={{ mr: 0.5 }}>
            --
          </Typography>
          <InfoOutlinedIcon fontSize="small" color="disabled" />
        </Box>
      </Tooltip>
    );
  }

  const valueInBTC = satoshisToBitcoins(Math.abs(valueInSats).toString());
  const isPositive = valueInSats > 0;

  return (
    <Tooltip
      title={
        <Box>
          {/* Main value information */}
          <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
            Transaction Value
          </Typography>

          <Typography variant="caption" display="block" gutterBottom>
            {`${isPositive ? "+" : "-"}${Math.abs(valueInSats).toLocaleString()} sats / ${isPositive ? "+" : "-"}${valueInBTC} BTC`}
          </Typography>

          {/* Explanation of what the value means */}
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            This represents the net effect of this transaction on your wallet
            balance.
          </Typography>

          {isPositive ? (
            <Typography variant="caption" display="block">
              <strong>Positive value:</strong> You received funds in this
              transaction.
            </Typography>
          ) : (
            <Typography variant="caption" display="block">
              <strong>Negative value:</strong> You sent funds in this
              transaction (including fees).
            </Typography>
          )}
        </Box>
      }
      placement="top"
      arrow
      sx={{ maxWidth: 300 }}
    >
      <Box>
        <Typography
          variant="body2"
          color={isPositive ? "success.main" : "error.main"}
          fontWeight="medium"
        >
          {isPositive ? "+" : "-"}
          {Math.abs(valueInSats).toLocaleString()} sats
        </Typography>
        <Typography
          variant="caption"
          color={isPositive ? "success.main" : "error.main"}
        >
          {isPositive ? "+" : "-"}
          {valueInBTC} BTC
        </Typography>
      </Box>
    </Tooltip>
  );
};

// Table header with sort labels - Updated to use proper types
const TransactionTableHeader: React.FC<{
  columns: Array<{ id: string; label: string; sortable: boolean }>;
  sortBy: SortBy;
  sortDirection: SortDirection;
  onSort: (property: SortBy) => void;
}> = ({ columns, sortBy, sortDirection, onSort }) => (
  <TableHead>
    <TableRow>
      {columns.map((column) => (
        <TableCell key={column.id}>
          {column.sortable ? (
            <TableSortLabel
              active={sortBy === column.id}
              direction={sortBy === column.id ? sortDirection : "asc"}
              onClick={() => onSort(column.id as SortBy)}
            >
              {column.label}
            </TableSortLabel>
          ) : (
            column.label
          )}
        </TableCell>
      ))}
    </TableRow>
  </TableHead>
);

// A single transaction row - Updated to handle showAcceleration prop
const TransactionTableRow: React.FC<{
  tx: TransactionT;
  showAcceleration: boolean;
  network?: string;
  onClickTransaction?: (txid: string) => void;
  onAccelerateTransaction?: (tx: TransactionT) => void;
  onCopySuccess: () => void;
  renderActions?: (tx: TransactionT) => React.ReactNode;
}> = ({
  tx,
  showAcceleration,
  network,
  onClickTransaction,
  onAccelerateTransaction,
  onCopySuccess,
  renderActions,
}) => {
  // Check if transaction can be accelerated (pending/unconfirmed)
  const canAccelerate = !tx.status.confirmed;
  return (
    <TableRow>
      <TableCell>
        <Box display="flex" alignItems="center">
          <Tooltip title={tx.txid}>
            <Chip
              label={`${tx.txid.substring(0, 8)}...`}
              variant="outlined"
              size="small"
              onClick={(e) => {
                e.stopPropagation(); // Prevent row click from firing
                navigator.clipboard
                  .writeText(tx.txid)
                  .then(() => {
                    onCopySuccess();
                  })
                  .catch((err) => {
                    console.error("Could not copy text: ", err);
                  });
              }}
              style={{ cursor: "pointer" }}
            />
          </Tooltip>
          {tx.isSpent && (
            <Tooltip title="This transaction created UTXOs that have been spent">
              <Box display="flex" alignItems="center" ml={1}>
                <Chip
                  label="Spent"
                  size="small"
                  color="default"
                  sx={{ fontSize: "0.7rem" }}
                />
                <HelpOutlineIcon
                  fontSize="small"
                  sx={{ fontSize: "0.9rem", ml: 0.5, color: "text.secondary" }}
                />
              </Box>
            </Tooltip>
          )}
        </Box>
      </TableCell>
      <TableCell>{formatRelativeTime(tx.status.blockTime)}</TableCell>
      <TableCell>{tx.vsize || tx.size}</TableCell>
      <TableCell>
        <FeeDisplay feeInSats={tx.fee} isReceived={tx.isReceived} />
      </TableCell>
      <TableCell>
        <ValueDisplay valueInSats={tx.valueToWallet} />
      </TableCell>
      <TableCell>
        <Chip
          label={tx.status.confirmed ? "Confirmed" : "Pending"}
          color={tx.status.confirmed ? "success" : "warning"}
          size="small"
        />
      </TableCell>
      {/* Accelerate button for pending transactions */}
      {canAccelerate &&
        onAccelerateTransaction &&
        (!tx.fee ? (
          <Tooltip title="You cannot accelerate received transactions, only transactions you've sent.">
            <TableCell>
              <Box>
                <Button
                  variant="outlined"
                  size="small"
                  color="primary"
                  disabled={true}
                >
                  Accelerate
                </Button>
              </Box>
            </TableCell>
          </Tooltip>
        ) : (
          <TableCell>
            <Button
              variant="outlined"
              size="small"
              color="primary"
              onClick={(e) => {
                e.stopPropagation();
                onAccelerateTransaction(tx);
              }}
            >
              Accelerate
            </Button>
          </TableCell>
        ))}
      <TableCell>
        {network && (
          <Tooltip title="View in your preferred block explorer">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                // Let parent handle block explorer navigation
                onClickTransaction?.(tx.txid);
              }}
            >
              <OpenInNew fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {/* Render custom actions if provided */}
        {renderActions && renderActions(tx)}
      </TableCell>
    </TableRow>
  );
};

export const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  onSort,
  sortBy,
  sortDirection,
  network,
  onClickTransaction,
  onAccelerateTransaction,
  renderActions,
  showAcceleration = false, // Default to false for backward compatibility
}) => {
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // Get dynamic columns based on showAcceleration
  const columns = getColumns(showAcceleration);

  return (
    <>
      <TableContainer component={Paper}>
        <Table size="small">
          <TransactionTableHeader
            columns={columns}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSort={onSort}
          />
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center">
                  <Typography variant="body2" color="textSecondary" py={2}>
                    No transactions found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              transactions
                .map((tx) => ({
                  ...tx,
                  valueToWallet:
                    typeof tx.amount === "number" && tx.amount !== 0
                      ? Math.round(tx.amount * 1e8)
                      : tx.valueToWallet,
                }))
                .map((tx) => (
                  <TransactionTableRow
                    key={tx.txid}
                    tx={tx}
                    showAcceleration={showAcceleration}
                    network={network}
                    onClickTransaction={onClickTransaction}
                    onAccelerateTransaction={onAccelerateTransaction}
                    onCopySuccess={() => setSnackbarOpen(true)}
                    renderActions={renderActions}
                  />
                ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="success"
          sx={{ width: "100%" }}
        >
          Transaction ID copied to clipboard
        </Alert>
      </Snackbar>
    </>
  );
};
