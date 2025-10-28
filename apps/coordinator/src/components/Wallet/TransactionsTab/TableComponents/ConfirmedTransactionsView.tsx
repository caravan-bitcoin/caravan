import React from "react";
import { CircularProgress, Typography, Box } from "@mui/material";
import { TransactionTable } from "./TransactionsTable";
import { PaginationControls } from "./PaginationControls";
import {
  useSortedTransactions,
  useHandleTransactionExplorerLinkClick,
  useTransactionPagination,
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
      <PaginationControls
        totalItems={sortedTransactions.length}
        rowsPerPage={rowsPerPage}
        page={page}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
        rowsPerPageOptions={[10, 25, 50, 100]}
      />
    </Box>
  );
};
