import React from "react";
import { useSelector } from "react-redux";
import { Box, Typography, CircularProgress } from "@mui/material";
import { TransactionTable } from "./TransactionsTable";
import { PaginationControls } from "./PaginationControls";
import { TransactionFilter } from "./TransactionFilter";
import { usePendingTransactions } from "clients/transactions";
import {
  useSortedTransactions,
  useTransactionPagination,
  useTransactionFilter,
} from "../hooks";
import { TransactionT } from "../types";
import { getWalletAddresses } from "selectors/wallet";

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
  const walletAddresses = useSelector(getWalletAddresses);

  const { filterType, setFilterType, filteredTransactions, counts } =
    useTransactionFilter(pendingTransactions);

  const { sortBy, sortDirection, handleSort, sortedTransactions } =
    useSortedTransactions(filteredTransactions);

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
            transactions={currentPageItems}
            rawTransactions={pendingTransactions}
            onSort={handleSort}
            sortBy={sortBy}
            sortDirection={sortDirection}
            network={network}
            walletAddresses={walletAddresses}
            onClickTransaction={onClickTransaction}
            onAccelerateTransaction={onAccelerateTransaction}
            showAcceleration={true}
            expandable={true}
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
        </>
      )}
    </Box>
  );
};
