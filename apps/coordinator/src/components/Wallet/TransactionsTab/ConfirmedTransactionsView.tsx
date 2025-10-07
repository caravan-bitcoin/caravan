import React from "react";
import {
  CircularProgress,
  Typography,
  Box,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { TransactionTable } from "./TransactionsTable";
import {
  useSortedTransactions,
  useHandleTransactionExplorerLinkClick,
  useTransactionPagination,
} from "./hooks";
import { Transaction } from "./types";
import { useGetClient } from "hooks/client";

interface Props {
  transactions: Transaction[];
  isLoading: boolean;
  error: any;
  network?: string;
  onClickTransaction?: (txid: string) => void;
}

export const ConfirmedTransactionsView: React.FC<Props> = ({
  transactions,
  isLoading,
  error,
  network,
  onClickTransaction,
}) => {
  const { sortedTransactions, handleSort, sortBy, sortDirection } =
    useSortedTransactions(transactions);
  const handleExplorerLinkClick = useHandleTransactionExplorerLinkClick();
  const client = useGetClient();

  // Set up pagination for the currently loaded transactions
  const {
    page,
    rowsPerPage,
    totalPages,
    getCurrentPageItems,
    handlePageChange,
    handleRowsPerPageChange,
  } = useTransactionPagination(sortedTransactions.length);

  // Get transactions for current page
  const currentPageTxs = getCurrentPageItems(sortedTransactions);

  // Show loading state for initial load
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  // Show error state
  if (error) {
    return (
      <Typography color="error">Error: {error.message || error}</Typography>
    );
  }

  // Show empty state only after loading completes
  if (transactions.length === 0) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <Typography variant="body1" color="textSecondary">
          No completed transactions found.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Transaction Table */}
      {/* Warning for private clients */}
      {client?.type === "private" && (
        <Box mb={2}>
          <Typography variant="caption" color="textSecondary">
            Transaction history may be incomplete for nodes with multiple
            wallets loaded. Showing up to 500 most recent transactions.
          </Typography>
        </Box>
      )}
      <TransactionTable
        transactions={Array.isArray(currentPageTxs) ? currentPageTxs : []}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSort={handleSort}
        showAcceleration={false} // Don't show acceleration for confirmed txs
        network={network}
        onClickTransaction={onClickTransaction || handleExplorerLinkClick}
      />

      {/* Standard Pagination Controls (for loaded transactions) */}
      {sortedTransactions.length > 0 && (
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mt={2}
          px={1}
        >
          {/* Rows per page dropdown */}
          <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="rows-per-page-label">Rows</InputLabel>
            <Select
              labelId="rows-per-page-label"
              value={rowsPerPage.toString()}
              onChange={handleRowsPerPageChange}
              label="Rows"
            >
              <MenuItem value="10">10</MenuItem>
              <MenuItem value="25">25</MenuItem>
              <MenuItem value="50">50</MenuItem>
              <MenuItem value="100">100</MenuItem>
            </Select>
          </FormControl>

          {/* Page info and navigation */}
          <Box display="flex" alignItems="center">
            <Typography variant="body2" color="textSecondary" mr={2}>
              {`${(page - 1) * rowsPerPage + 1}-${Math.min(page * rowsPerPage, sortedTransactions.length)} of ${sortedTransactions.length}`}
            </Typography>
            <Pagination
              count={totalPages}
              page={page}
              onChange={handlePageChange}
              color="primary"
              size="small"
            />
          </Box>
        </Box>
      )}
    </Box>
  );
};
