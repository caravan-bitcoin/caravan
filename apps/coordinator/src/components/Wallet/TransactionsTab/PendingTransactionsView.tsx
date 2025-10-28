import React from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import { TransactionTable } from "./TransactionsTable";
import { PaginationControls } from "./PaginationControls";
import { usePendingTransactions } from "clients/transactions";
import { useSortedTransactions, useTransactionPagination } from "./hooks";
import { TransactionT } from "./types";

interface Props {
  network?: string;
  onClickTransaction: (txid: string) => void;
  onAccelerateTransaction: (tx: TransactionT) => Promise<void>;
}

export const PendingTransactionsView: React.FC<Props> = ({
  network,
  onClickTransaction,
  onAccelerateTransaction,
}) => {
  const {
    transactions: pendingTransactions = [],
    isLoading,
    error,
  } = usePendingTransactions();

  const { sortBy, sortDirection, handleSort, sortedTransactions } =
    useSortedTransactions(pendingTransactions);

  const {
    page,
    rowsPerPage,
    totalPages,
    getCurrentPageItems,
    handlePageChange,
    handleRowsPerPageChange,
  } = useTransactionPagination(sortedTransactions.length);

  const currentPageItems = getCurrentPageItems(sortedTransactions);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography color="error" gutterBottom>
        Error: {typeof error === "string" ? error : JSON.stringify(error)}
      </Typography>
    );
  }

  if (pendingTransactions.length === 0) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <Typography variant="body1" color="textSecondary">
          No pending transactions found.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <TransactionTable
        transactions={currentPageItems}
        onSort={handleSort}
        sortBy={sortBy}
        sortDirection={sortDirection}
        network={network}
        onClickTransaction={onClickTransaction}
        onAccelerateTransaction={onAccelerateTransaction}
        showAcceleration={true}
      />
      <PaginationControls
        totalItems={sortedTransactions.length}
        rowsPerPage={rowsPerPage}
        page={page}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
        rowsPerPageOptions={[5, 10, 25, 50]}
      />
    </Box>
  );
};
