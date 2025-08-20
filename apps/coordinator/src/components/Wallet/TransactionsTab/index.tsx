import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useGetClient } from "hooks/client";
import {
  Box,
  Typography,
  CircularProgress,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
} from "@mui/material";
import { TransactionTable } from "./TransactionsTable";
import { AccelerationModal } from "./FeeBumping/components/AccelerationModal";
import { usePendingTransactions } from "clients/transactions";
import { useCompletedTransactionsWithLoadMore } from "clients/txHistory";
import { ConfirmedTransactionsView } from "./ConfirmedTransactionsView";
import {
  useSortedTransactions,
  useTransactionPagination,
  useHandleTransactionExplorerLinkClick,
} from "./hooks";

const TransactionsTab: React.FC = () => {
  const network = useSelector((state: any) => state.settings.network);

  // Tab state for switching between pending and completed
  const [tabValue, setTabValue] = useState(0);

  // State to track if user has manually interacted with tabs
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // State for the selected transaction for acceleration
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(
    null,
  );
  // State for the acceleration modal
  const [accelerationModalOpen, setAccelerationModalOpen] = useState(false);
  // State for the raw tx hex
  const [txHex, setTxHex] = useState<string>("");
  // Get blockchain client from Redux store
  const blockchainClient = useGetClient();

  // Use our custom hooks for pending transactions
  const pendingTransactionsResult = usePendingTransactions();
  const pendingTransactions = pendingTransactionsResult?.transactions || [];
  const pendingIsLoading = pendingTransactionsResult?.isLoading || false;
  const pendingError = pendingTransactionsResult?.error || null;

  // Use completed transactions hook with loadmore functionality
  const {
    data: completedTransactions,
    isLoading: completedIsLoading,
    isFetchingNextPage: completedIsLoadingMore,
    error: completedError,
    hasNextPage: completedHasMore,
    fetchNextPage: loadMoreCompleted,
    totalLoaded: completedTotalLoaded,
  } = useCompletedTransactionsWithLoadMore(100); // Load 100 transactions at a time

  const sortingResult = useSortedTransactions(pendingTransactions);
  const sortBy = sortingResult?.sortBy || "blockTime";
  const sortDirection = sortingResult?.sortDirection || "desc";
  const handleSort = sortingResult?.handleSort || (() => {});
  const sortedTransactions = sortingResult?.sortedTransactions || [];

  const handleExplorerLinkClick = useHandleTransactionExplorerLinkClick();

  // Set up pagination for pending transactions
  const paginationResult = useTransactionPagination(sortedTransactions.length);
  const {
    page,
    rowsPerPage,
    totalPages,
    getCurrentPageItems,
    handlePageChange,
    handleRowsPerPageChange,
  } = paginationResult;

  // Get transactions for current page
  const currentPageTxs = getCurrentPageItems
    ? getCurrentPageItems(sortedTransactions)
    : [];

  // Calculate display count more reliably for confirmed transactions
  const getConfirmedDisplayCount = () => {
    if (completedIsLoading) return "...";

    // If we have loaded exactly a full page size (100) or more, and either:
    // - hasMore is true, OR
    // - we have exactly 100 (which suggests there might be more)
    // Then show the "+" indicator
    if (
      completedTotalLoaded >= 100 &&
      (completedHasMore || completedTotalLoaded % 100 === 0)
    ) {
      return `${completedTotalLoaded}+`;
    }
    return completedTotalLoaded.toString();
  };

  // Handle tab change - single function with user interaction tracking
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setHasUserInteracted(true); // Mark that user has manually interacted
  };

  // Handle acceleration button click
  const handleAccelerateTransaction = async (tx: any) => {
    if (!tx || !blockchainClient) return;

    try {
      // Fetch the raw transaction hex
      const txHex = await blockchainClient.getTransactionHex(tx.txid);
      if (!txHex || typeof txHex !== "string") {
        throw new Error("Invalid transaction hex received");
      }

      // Set the selected transaction and raw tx hex
      setSelectedTransaction(tx);
      setTxHex(txHex);

      // Open the acceleration modal
      setAccelerationModalOpen(true);
    } catch (error) {
      console.error("Error fetching raw transaction:", error);
      alert("Error fetching transaction details. Please try again.");
    }
  };

  // Auto-switch to confirmed tab when there are no pending but some confirmed
  // Only auto-switch if user hasn't manually interacted
  useEffect(() => {
    if (
      !hasUserInteracted && // Only auto-switch if user hasn't manually clicked
      tabValue === 0 &&
      !pendingIsLoading &&
      pendingTransactions.length === 0 &&
      completedTransactions.length > 0
    ) {
      setTabValue(1); // Switch to confirmed tab
    }
  }, [
    hasUserInteracted,
    tabValue,
    pendingTransactions.length, // Use .length instead of the whole array
    pendingIsLoading,
    completedTransactions.length, // Use .length instead of the whole array
  ]);

  // Handle acceleration modal close
  const handleAccelerationModalClose = () => {
    setAccelerationModalOpen(false);
    setSelectedTransaction(null);
    setTxHex("");
  };

  return (
    <div>
      {/* Tab Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="transaction tabs"
          >
            <Tab
              label={`Pending (${pendingTransactions.length})`}
              id="pending-tab"
              aria-controls="pending-tabpanel"
            />
            <Tab
              label={`Confirmed (${getConfirmedDisplayCount()})`}
              id="completed-tab"
              aria-controls="completed-tabpanel"
            />
          </Tabs>
        </Box>
      </Box>

      {/* Pending Transactions Tab */}
      <div
        role="tabpanel"
        hidden={tabValue !== 0}
        id="pending-tabpanel"
        aria-labelledby="pending-tab"
      >
        {tabValue === 0 && (
          <Box>
            {pendingError && (
              <Typography color="error" gutterBottom>
                Error:{" "}
                {typeof pendingError === "string"
                  ? pendingError
                  : JSON.stringify(pendingError)}
              </Typography>
            )}

            <Box mt={2}>
              {pendingIsLoading ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress />
                </Box>
              ) : pendingTransactions.length === 0 ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <Typography variant="body1" color="textSecondary">
                    No pending transactions found.
                  </Typography>
                </Box>
              ) : (
                <>
                  <TransactionTable
                    transactions={
                      Array.isArray(currentPageTxs) ? currentPageTxs : []
                    }
                    onSort={handleSort}
                    sortBy={sortBy}
                    sortDirection={sortDirection}
                    network={network}
                    onClickTransaction={handleExplorerLinkClick}
                    onAccelerateTransaction={handleAccelerateTransaction}
                    showAcceleration={true}
                  />
                  {/* Pagination controls for pending transactions */}
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
                        <Typography
                          variant="body2"
                          color="textSecondary"
                          mr={2}
                        >
                          {`${(page - 1) * rowsPerPage + 1}-${Math.min(
                            page * rowsPerPage,
                            sortedTransactions.length,
                          )} of ${sortedTransactions.length}`}
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
          </Box>
        )}
      </div>

      {/* Completed Transactions Tab */}
      <div
        role="tabpanel"
        hidden={tabValue !== 1}
        id="completed-tabpanel"
        aria-labelledby="completed-tab"
      >
        {tabValue === 1 && (
          <ConfirmedTransactionsView
            transactions={completedTransactions}
            isLoading={completedIsLoading}
            isLoadingMore={completedIsLoadingMore}
            error={completedError}
            hasMore={completedHasMore ?? false}
            onLoadMore={loadMoreCompleted}
            totalLoaded={completedTotalLoaded}
            network={network}
            onClickTransaction={handleExplorerLinkClick}
          />
        )}
      </div>

      {/* Acceleration Modal - only for pending transactions */}
      {selectedTransaction && (
        <AccelerationModal
          open={accelerationModalOpen}
          onClose={handleAccelerationModalClose}
          transaction={selectedTransaction}
          txHex={txHex}
        />
      )}
    </div>
  );
};

export default TransactionsTab;
