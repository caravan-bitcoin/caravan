import React from "react";
import { CircularProgress, Typography, Box } from "@mui/material";
import { TransactionTable } from "./TransactionsTable";
import { PaginationControls } from "./PaginationControls";
import { TransactionFilter } from "./TransactionFilter";
import {
  useSortedTransactions,
  useHandleTransactionExplorerLinkClick,
  useTransactionPagination,
  useTransactionFilter,
} from "../hooks";
import { Transaction } from "../types";
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
  const handleExplorerLinkClick = useHandleTransactionExplorerLinkClick();
  const client = useGetClient();

  const { filterType, setFilterType, filteredTransactions, counts } =
    useTransactionFilter(transactions);
  const { sortedTransactions, handleSort, sortBy, sortDirection } =
    useSortedTransactions(filteredTransactions);

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

      <TransactionFilter
        filterType={filterType}
        onFilterChange={setFilterType}
        counts={counts}
      />

      {/* Show message if filter results in no transactions */}
      {filteredTransactions.length === 0 ? (
        <Box display="flex" justifyContent="center" p={3}>
          <Typography variant="body1" color="textSecondary">
            No {filterType === "received" ? "received" : "sent"} transactions
            found.
          </Typography>
        </Box>
      ) : (
        <>
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
          <PaginationControls
            totalItems={sortedTransactions.length}
            rowsPerPage={rowsPerPage}
            page={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </>
      )}
    </Box>
  );
};
