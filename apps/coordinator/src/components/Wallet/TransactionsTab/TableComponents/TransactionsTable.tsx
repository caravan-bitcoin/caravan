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
  Collapse,
  useTheme,
  CircularProgress,
} from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { KeyboardArrowDown, KeyboardArrowUp } from "@mui/icons-material";
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
  Transaction,
} from "../types";
import TransactionFlowDiagram from "../../TransactionFlowDiagram";
import { transformTransactionToFlowDiagram } from "utils/transactionFlowUtils";
import {
  useTransactionDetails,
  usePrefetchTransactionDetails,
} from "hooks/useTransactionDetails";

// Helper function to format the relative time
const formatRelativeTime = (timestamp?: number): string => {
  if (!timestamp) return "Pending";
  return formatDistanceToNow(new Date(timestamp * 1000), { addSuffix: true });
};

// Column definitions with sorting configuration - dynamic based on showAcceleration and expandable
const getColumns = (showAcceleration: boolean, expandable: boolean) => [
  ...(expandable ? [{ id: "expand", label: "", sortable: false }] : []),
  { id: "txid", label: "Transaction ID", sortable: false },
  { id: "blockTime", label: "Time", sortable: true },
  { id: "size", label: "Size (vBytes)", sortable: true },
  { id: "fee", label: "Fee (sats)", sortable: true },
  { id: "valueToWallet", label: "Value", sortable: true },
  { id: "status", label: "Status", sortable: true },
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
    const feeInBTC = satoshisToBitcoins(feeInSats!);
    const actualFeeInSats = Number(feeInSats);

    const shouldShowPlaceholder =
      !feeInSats || actualFeeInSats === 0 || isNaN(actualFeeInSats); // Note we added explicit check so we can handle case when the fee is 0 (for pending we do populate fees for even received Tx), as 0 is a valid number (truthy in the ?? chain)

    return (
      <Tooltip title="You did not spend this fee" placement="top">
        <Box display="flex" flexDirection="column">
          {shouldShowPlaceholder ? (
            <Typography
              variant="body2"
              sx={{ color: "green", fontWeight: 500 }}
            >
              --
            </Typography>
          ) : (
            <>
              <Typography
                variant="body2"
                sx={{ color: "green", fontWeight: 500 }}
              >
                {actualFeeInSats.toLocaleString()} sats
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: "green", fontWeight: 400 }}
              >
                {feeInBTC} BTC
              </Typography>
            </>
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

// A single transaction row with optional showAcceleration column and expandable flow diagram
const TransactionTableRow: React.FC<{
  tx: TransactionT;
  rawTx?: Transaction;
  showAcceleration: boolean;
  expandable: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  network?: string;
  walletAddresses?: string[];
  onClickTransaction?: (txid: string) => void;
  onAccelerateTransaction?: (tx: TransactionT) => void;
  onCopySuccess: () => void;
  renderActions?: (tx: TransactionT) => React.ReactNode;
  colSpan: number;
}> = ({
  tx,
  rawTx,
  expandable,
  isExpanded,
  onToggleExpand,
  network,
  walletAddresses = [],
  onClickTransaction,
  onAccelerateTransaction,
  onCopySuccess,
  renderActions,
  colSpan,
}) => {
  const theme = useTheme();
  // Check if transaction can be accelerated (pending/unconfirmed)
  const canAccelerate = !tx.status.confirmed;

  // Prefetch transaction details on hover for instant expansion
  const prefetchDetails = usePrefetchTransactionDetails();

  // Fetch full transaction details (with prevout) when expanded
  // This is done on-demand to avoid fetching extra data for all transactions
  const { data: fullTxDetails, isLoading: isLoadingDetails } =
    useTransactionDetails(tx.txid, isExpanded && expandable);

  // Transform transaction data for flow diagram when expanded
  // Use full details (with prevout) if available, otherwise fall back to rawTx
  const flowDiagramProps = React.useMemo(() => {
    if (!isExpanded) return null;
    // Prefer full details which have prevout data
    const txData = fullTxDetails || rawTx;
    if (!txData) return null;
    return transformTransactionToFlowDiagram(txData, walletAddresses);
  }, [isExpanded, fullTxDetails, rawTx, walletAddresses]);

  // Handle mouse enter to prefetch data
  const handleMouseEnter = React.useCallback(() => {
    if (expandable && !isExpanded) {
      prefetchDetails(tx.txid);
    }
  }, [expandable, isExpanded, prefetchDetails, tx.txid]);

  return (
    <>
      <TableRow
        hover
        onMouseEnter={handleMouseEnter}
        sx={{
          cursor: expandable ? "pointer" : "default",
          "& > *": { borderBottom: isExpanded ? "unset" : undefined },
          backgroundColor: isExpanded
            ? theme.palette.action.selected
            : "inherit",
          transition: "background-color 0.2s ease",
        }}
        onClick={expandable ? onToggleExpand : undefined}
      >
        {/* Expand/Collapse Icon */}
        {expandable && (
          <TableCell sx={{ width: 48, padding: "0 8px" }}>
            <IconButton
              aria-label="expand row"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
            >
              {isExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
            </IconButton>
          </TableCell>
        )}
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
              <TableCell onClick={(e) => e.stopPropagation()}>
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
            <TableCell onClick={(e) => e.stopPropagation()}>
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
        <TableCell onClick={(e) => e.stopPropagation()}>
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

      {/* Expanded row with Flow Diagram */}
      {expandable && (
        <TableRow>
          <TableCell
            style={{ paddingBottom: 0, paddingTop: 0 }}
            colSpan={colSpan}
          >
            <Collapse in={isExpanded} timeout={300} unmountOnExit>
              <Box
                sx={{
                  py: 3,
                  px: 2,
                  opacity: isLoadingDetails ? 0.6 : 1,
                  transition: "opacity 0.3s ease-in-out",
                }}
              >
                {isLoadingDetails && !flowDiagramProps ? (
                  <Box
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    py={4}
                    sx={{
                      minHeight: 200,
                      animation: "fadeIn 0.3s ease-in-out",
                      "@keyframes fadeIn": {
                        from: { opacity: 0 },
                        to: { opacity: 1 },
                      },
                    }}
                  >
                    <CircularProgress size={24} sx={{ mr: 2 }} />
                    <Typography color="text.secondary">
                      Loading transaction details...
                    </Typography>
                  </Box>
                ) : flowDiagramProps ? (
                  <Box
                    sx={{
                      animation: "fadeIn 0.3s ease-in-out",
                      "@keyframes fadeIn": {
                        from: { opacity: 0, transform: "translateY(-10px)" },
                        to: { opacity: 1, transform: "translateY(0)" },
                      },
                    }}
                  >
                    <TransactionFlowDiagram
                      inputs={flowDiagramProps.inputs}
                      outputs={flowDiagramProps.outputs}
                      fee={flowDiagramProps.fee}
                      changeAddress={flowDiagramProps.changeAddress}
                      inputsTotalSats={flowDiagramProps.inputsTotalSats}
                      network={network}
                      status={flowDiagramProps.status}
                      confirmations={flowDiagramProps.confirmations}
                    />
                  </Box>
                ) : (
                  <Typography color="text.secondary">
                    Unable to load transaction details
                  </Typography>
                )}
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

export const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  rawTransactions,
  onSort,
  sortBy,
  sortDirection,
  network,
  walletAddresses = [],
  onClickTransaction,
  onAccelerateTransaction,
  renderActions,
  showAcceleration = false, // Default to false for backward compatibility
  expandable = false, // Default to false for backward compatibility
}) => {
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [expandedTxid, setExpandedTxid] = useState<string | null>(null);

  // Get dynamic columns based on showAcceleration and expandable
  const columns = getColumns(showAcceleration, expandable);

  // Create a map of txid to raw transaction for quick lookup
  const rawTxMap = React.useMemo(() => {
    const map = new Map<string, Transaction>();
    if (rawTransactions) {
      rawTransactions.forEach((tx) => {
        map.set(tx.txid, tx);
      });
    }
    return map;
  }, [rawTransactions]);

  const handleToggleExpand = (txid: string) => {
    setExpandedTxid(expandedTxid === txid ? null : txid);
  };

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
              transactions.map((tx) => (
                <TransactionTableRow
                  key={tx.txid}
                  tx={tx}
                  rawTx={rawTxMap.get(tx.txid)}
                  showAcceleration={showAcceleration}
                  expandable={expandable}
                  isExpanded={expandedTxid === tx.txid}
                  onToggleExpand={() => handleToggleExpand(tx.txid)}
                  network={network}
                  walletAddresses={walletAddresses}
                  onClickTransaction={onClickTransaction}
                  onAccelerateTransaction={onAccelerateTransaction}
                  onCopySuccess={() => setSnackbarOpen(true)}
                  renderActions={renderActions}
                  colSpan={columns.length}
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
