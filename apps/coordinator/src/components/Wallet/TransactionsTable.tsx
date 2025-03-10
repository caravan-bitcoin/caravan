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
  Box,
  Tooltip,
  Typography,
  Alert,
  Snackbar,
} from "@mui/material";
import { satoshisToBitcoins } from "@caravan/bitcoin";
import { formatDistanceToNow } from "date-fns";
import { OpenInNew } from "@mui/icons-material";

interface TransactionTableProps {
  transactions: Transaction[];
  onSort: (property: keyof Transaction) => void;
  sortBy: string;
  sortDirection: "asc" | "desc";
  network?: string;
  onClickTransaction?: (txid: string) => void;
}

// How our Transaction should look like
interface Transaction {
  txid: string;
  status: {
    confirmed: boolean;
    blockTime?: number;
    blockHeight?: number;
  };
  size: number;
  fee: number;
  value: number;
}

// Helper function to format the relative time
const formatRelativeTime = (timestamp?: number): string => {
  if (!timestamp) return "Pending";
  return formatDistanceToNow(new Date(timestamp * 1000), { addSuffix: true });
};

// Column definitions with sorting configuration
const columns = [
  { id: "txid", label: "Transaction ID", sortable: false },
  { id: "blockTime", label: "Time", sortable: true },
  { id: "value", label: "Transaction Amount", sortable: true },
  { id: "size", label: "Size (vBytes)", sortable: true },
  { id: "fee", label: "Fee (sats)", sortable: true },
  { id: "status", label: "Status", sortable: false },
  { id: "actions", label: "", sortable: false },
];

// FeeDisplay component to display fees display in both sats and BTC
const FeeDisplay: React.FC<{ feeInSats?: number }> = ({ feeInSats }) => {
  if (feeInSats === null || feeInSats === undefined) {
    return <Typography color="textSecondary">N/A</Typography>;
  }

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

// ValueDisplay to show the value of whole transaction (total output value)
const ValueDisplay: React.FC<{ valueInSats?: number }> = ({ valueInSats }) => {
  if (valueInSats === null || valueInSats === undefined) {
    return <Typography color="textSecondary">N/A</Typography>;
  }

  const valueInBTC = satoshisToBitcoins(valueInSats.toString());

  return (
    <Tooltip
      title={
        <Box>
          <Typography variant="caption">
            {`${valueInSats.toLocaleString()} sats`}
          </Typography>
          <br />
          <Typography variant="caption">{`${valueInBTC} BTC`}</Typography>
        </Box>
      }
    >
      <Box>
        <Typography variant="body2" color="textPrimary">
          {valueInSats.toLocaleString()} sats
        </Typography>
        <Typography variant="caption" color="textSecondary">
          {valueInBTC} BTC
        </Typography>
      </Box>
    </Tooltip>
  );
};

export const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  onSort,
  sortBy,
  sortDirection,
  network,
  onClickTransaction,
}) => {
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // Handler for sorting
  const createSortHandler = (property: keyof Transaction) => () => {
    onSort(property);
  };

  // Render table header with sort labels
  const renderTableHeader = () => (
    <TableHead>
      <TableRow>
        {columns.map((column) => (
          <TableCell key={column.id}>
            {column.sortable ? (
              <TableSortLabel
                active={sortBy === column.id}
                direction={sortDirection}
                onClick={createSortHandler(column.id as keyof Transaction)}
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

  // Rendering a single transaction row
  const renderTransactionRow = (tx: Transaction) => (
    <TableRow>
      <TableCell>
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
                  setSnackbarOpen(true);
                })
                .catch((err) => {
                  console.error("Could not copy text: ", err);
                });
            }}
            style={{ cursor: "pointer" }}
          />
        </Tooltip>
      </TableCell>
      <TableCell>{formatRelativeTime(tx.status.blockTime)}</TableCell>
      <TableCell>
        <ValueDisplay valueInSats={tx.value} />
      </TableCell>
      <TableCell>{tx.size}</TableCell>
      <TableCell>
        <FeeDisplay feeInSats={tx.fee} />
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

  return (
    <>
      <TableContainer component={Paper}>
        <Table size="small">
          {renderTableHeader()}
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center">
                  No transactions found
                </TableCell>
              </TableRow>
            ) : (
              transactions.map(renderTransactionRow)
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
