import React from "react";
import { useSelector } from "react-redux";
import {
  Box,
  Typography,
  CircularProgress,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { TransactionTable } from "./TransactionsTable";
import { usePendingTransactions } from "clients/transactions";
import {
  useSortedTransactions,
  useTransactionPagination,
  useHandleTransactionExplorerLinkClick,
} from "./hooks";

/**
 * TRANSACTIONS TAB - PENDING TRANSACTIONS ONLY
 *
 * This implementation currently only shows pending (unconfirmed) transactions.
 *
 * Tracking confirmed/spent transactions is challenging because as UTXOs are spent,
 * they disappear from the wallet state. In private clients, we need a different
 * approach to track historical transactions since we can't collect transaction IDs
 * directly from UTXO data that no longer exists in the wallet.
 *
 * When we add confirmed transaction support later, we can create separate tabs
 * and hooks for confirmed transactions.
 */

const TransactionsTab: React.FC = () => {
  const network = useSelector((state: any) => state.settings.network);

  // Use our custom hooks for pending transactions
  const { transactions, isLoading, error } = usePendingTransactions();
  const { sortBy, sortDirection, handleSort, sortedTransactions } =
    useSortedTransactions(transactions);
  const handleExplorerLinkClick = useHandleTransactionExplorerLinkClick();

  // Set up pagination for pending transactions
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

  return (
    <div>
      {error && (
        <Typography color="error" gutterBottom>
          Error: {error}
        </Typography>
      )}

      <Box mt={2}>
        {isLoading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TransactionTable
              transactions={currentPageTxs}
              onSort={handleSort}
              sortBy={sortBy}
              sortDirection={sortDirection}
              network={network}
              onClickTransaction={handleExplorerLinkClick}
            />
            {/* Pagination controls */}
            {sortedTransactions.length > 0 && (
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mt={2}
                px={1}
              >
                <FormControl
                  variant="outlined"
                  size="small"
                  sx={{ minWidth: 120 }}
                >
                  <InputLabel id="rows-per-page-label">Rows</InputLabel>
                  <Select
                    labelId="rows-per-page-label"
                    value={rowsPerPage.toString()}
                    onChange={handleRowsPerPageChange}
                    label="Rows"
                  >
                    <MenuItem value="5">5</MenuItem>
                    <MenuItem value="10">10</MenuItem>
                    <MenuItem value="25">25</MenuItem>
                    <MenuItem value="50">50</MenuItem>
                  </Select>
                </FormControl>

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
          </>
        )}
      </Box>
    </div>
  );
};

export default TransactionsTab;
