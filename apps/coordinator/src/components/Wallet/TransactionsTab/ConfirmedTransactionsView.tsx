import React from "react";
import {
  CircularProgress,
  Typography,
  Box,
  Button,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from "@mui/material";
import { TransactionTable } from "./TransactionsTable";
import {
  useSortedTransactions,
  useHandleTransactionExplorerLinkClick,
  useTransactionPagination,
} from "./hooks";
import { Transaction } from "./types";

interface Props {
  transactions: Transaction[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: any;
  hasMore: boolean;
  onLoadMore: () => void;
  totalLoaded: number;
  network?: string;
  onClickTransaction?: (txid: string) => void;
}

export const ConfirmedTransactionsView: React.FC<Props> = ({
  transactions,
  isLoading,
  isLoadingMore,
  error,
  hasMore,
  onLoadMore,
  totalLoaded,
  network,
  onClickTransaction,
}) => {
  const { sortedTransactions, handleSort, sortBy, sortDirection } =
    useSortedTransactions(transactions);
  const handleExplorerLinkClick = useHandleTransactionExplorerLinkClick();

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
  if (isLoading && transactions.length === 0) {
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

  // Show empty state
  if (!isLoading && transactions.length === 0) {
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
              <MenuItem value="5">5</MenuItem>
              <MenuItem value="10">10</MenuItem>
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

      {/* Load More Section (if there are more transactions to load from API) */}
      {(hasMore || isLoadingMore) && (
        <>
          <Divider sx={{ my: 2 }} />
          <Box
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            p={2}
            gap={1}
          >
            {isLoadingMore ? (
              <Box display="flex" alignItems="center" gap={2}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="textSecondary">
                  Loading more transactions...
                </Typography>
              </Box>
            ) : hasMore ? (
              <>
                <Button
                  variant="outlined"
                  onClick={onLoadMore}
                  disabled={isLoadingMore}
                  size="medium"
                >
                  Load More Transactions
                </Button>
                <Typography variant="caption" color="textSecondary">
                  Loaded {totalLoaded} transactions so far
                </Typography>
              </>
            ) : (
              <Typography variant="body2" color="textSecondary">
                All transactions loaded ({totalLoaded} total)
              </Typography>
            )}
          </Box>
        </>
      )}

      {/* Summary Info */}
      {!hasMore && !isLoadingMore && (
        <Box display="flex" justifyContent="center" mt={1}>
          <Typography variant="caption" color="textSecondary">
            Showing all {totalLoaded} completed transactions
          </Typography>
        </Box>
      )}
    </Box>
  );
};
