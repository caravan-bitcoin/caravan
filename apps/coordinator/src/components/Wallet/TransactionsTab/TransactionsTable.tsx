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
} from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { satoshisToBitcoins } from "@caravan/bitcoin";
import { formatDistanceToNow } from "date-fns";
import { OpenInNew } from "@mui/icons-material";
import { TransactionT, TransactionTableProps, FeeDisplayProps } from "./types";

// Helper function to format the relative time
const formatRelativeTime = (timestamp?: number): string => {
  if (!timestamp) return "Pending";
  return formatDistanceToNow(new Date(timestamp * 1000), { addSuffix: true });
};

// Column definitions with sorting configuration
const columns = [
  { id: "txid", label: "Transaction ID", sortable: false },
  { id: "blockTime", label: "Time", sortable: true },
  { id: "size", label: "Size (vBytes)", sortable: true },
  { id: "fee", label: "Fee (sats)", sortable: true },
  { id: "status", label: "Status", sortable: false },
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
  // For received transactions, show appropriate message
  if (isReceived) {
    return (
      <Tooltip
        title="Fee not shown for received transactions as you didn't pay it"
        placement="top"
      >
        <Box display="flex" alignItems="center">
          <Typography variant="body2" color="textSecondary" sx={{ mr: 0.5 }}>
            N/A
          </Typography>
          <InfoOutlinedIcon fontSize="small" color="disabled" />
        </Box>
      </Tooltip>
    );
  }

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

// Table header with sort labels
const TransactionTableHeader: React.FC<{
  columns: Array<{ id: string; label: string; sortable: boolean }>;
  sortBy: string;
  sortDirection: "asc" | "desc";
  onSort: (property: keyof TransactionT) => void;
}> = ({ columns, sortBy, sortDirection, onSort }) => (
  <TableHead>
    <TableRow>
      {columns.map((column) => (
        <TableCell key={column.id}>
          {column.sortable ? (
            <TableSortLabel
              active={sortBy === column.id}
              direction={sortDirection}
              onClick={() => onSort(column.id as keyof TransactionT)}
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

// A single transaction row
const TransactionTableRow: React.FC<{
  tx: TransactionT;
  network?: string;
  onClickTransaction?: (txid: string) => void;
  onCopySuccess: () => void;
}> = ({ tx, network, onClickTransaction, onCopySuccess }) => (
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
      <Chip
        label={tx.status.confirmed ? "Confirmed" : "Pending"}
        color={tx.status.confirmed ? "success" : "warning"}
        size="small"
      />
    </TableCell>
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
    </TableCell>
  </TableRow>
);

export const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  onSort,
  sortBy,
  sortDirection,
  network,
  onClickTransaction,
}) => {
  const [snackbarOpen, setSnackbarOpen] = useState(false);

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
                  No transactions found
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((tx) => (
                <TransactionTableRow
                  key={tx.txid}
                  tx={tx}
                  network={network}
                  onClickTransaction={onClickTransaction}
                  onCopySuccess={() => setSnackbarOpen(true)}
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
