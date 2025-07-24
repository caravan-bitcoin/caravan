import React from "react";
import { CircularProgress, Typography, Box } from "@mui/material";
import { TransactionTable } from "./TransactionsTable";
import {
  useSortedTransactions,
  useHandleTransactionExplorerLinkClick,
} from "./hooks";
import { Transaction } from "./types";
interface Props {
  transactions: Transaction[];
  isLoading: boolean;
  error: any;
}

export const CompletedTransactionsView: React.FC<Props> = ({
  transactions,
  isLoading,
  error,
}) => {
  const { sortedTransactions, handleSort, sortBy, sortDirection } =
    useSortedTransactions(transactions);

  const handleExplorerLinkClick = useHandleTransactionExplorerLinkClick();

  // Show loading state
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

  // Show empty state
  if (transactions.length === 0) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <Typography variant="body1" color="textSecondary">
          No completed transactions found.
        </Typography>
      </Box>
    );
  }

  // Show transaction table
  return (
    <TransactionTable
      transactions={sortedTransactions}
      sortBy={sortBy}
      sortDirection={sortDirection}
      onSort={handleSort}
      showAcceleration={false}
      onClickTransaction={handleExplorerLinkClick}
    />
  );
};
