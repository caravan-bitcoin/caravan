import React, { useState } from "react";
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
import { useConfirmedTransactions } from "clients/txHistory";
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

  // Acceleration modal state
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(
    null,
  );
  const [accelerationModalOpen, setAccelerationModalOpen] = useState(false);
  const [txHex, setTxHex] = useState<string>("");

  const blockchainClient = useGetClient();

  // Fetch pending transactions
  const {
    transactions: pendingTransactions = [],
    isLoading: pendingIsLoading,
    error: pendingError,
  } = usePendingTransactions();

  // Fetch confirmed transactions - all of them, up to our `MAX_TRANSACTIONS_TO_FETCH`
  const {
    transactions: confirmedTransactions = [],
    isLoading: confirmedIsLoading,
    error: confirmedError,
  } = useConfirmedTransactions();

  // Sort and paginate pending transactions
  const {
    sortBy,
    sortDirection,
    handleSort,
    sortedTransactions: sortedPendingTxs,
  } = useSortedTransactions(pendingTransactions);

  const {
    page,
    rowsPerPage,
    totalPages,
    getCurrentPageItems,
    handlePageChange,
    handleRowsPerPageChange,
  } = useTransactionPagination(sortedPendingTxs.length);

  const currentPagePendingTxs = getCurrentPageItems(sortedPendingTxs);
  const handleExplorerLinkClick = useHandleTransactionExplorerLinkClick();

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

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

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
              label={`Confirmed (${confirmedTransactions.length})`}
              id="confirmed-tab"
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
                    transactions={currentPagePendingTxs}
                    onSort={handleSort}
                    sortBy={sortBy}
                    sortDirection={sortDirection}
                    network={network}
                    onClickTransaction={handleExplorerLinkClick}
                    onAccelerateTransaction={handleAccelerateTransaction}
                    showAcceleration={true}
                  />
                  {/* Pagination controls for pending transactions */}
                  {sortedPendingTxs.length > 0 && (
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
                            sortedPendingTxs.length,
                          )} of ${sortedPendingTxs.length}`}
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
            transactions={confirmedTransactions}
            isLoading={confirmedIsLoading}
            error={confirmedError}
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
