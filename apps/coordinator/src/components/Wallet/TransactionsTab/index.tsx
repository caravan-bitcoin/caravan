import React, { useState } from "react";
import { useSelector } from "react-redux";
import {
  Box,
  Typography,
  Tooltip,
  IconButton,
  CircularProgress,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from "@mui/material";
import { Refresh } from "@mui/icons-material";
import { TransactionTable } from "./TransactionsTable";
import {
  useFetchTransactions,
  useSortedTransactions,
  usePagination,
  useHandleExplorerLinkClick,
} from "./hooks";
import { AccelerationModal } from "./FeeBumping/components/AccelerationModal";

/**
 * TRANSACTIONS HISTORY LIMITATION
 *
 * Only pending transactions are shown in this implementation.
 *
 * The commented code reflects the changes done to comment out the Completed Transactions for now .
 *
 * Tracking confirmed/spent transactions is challenging because as UTXOs are spent,
 * they disappear from the wallet state. In private clients, we need a different
 * approach to track historical transactions since we can't collect transaction IDs
 * directly from UTXO data that no longer exists in the wallet.
 *
 * This would require maintaining a separate transaction history database or querying
 * all address histories, which has privacy implications.
 */

const TransactionsTab: React.FC<{ refreshWallet?: () => Promise<any> }> = ({
  refreshWallet,
}) => {
  // This key state controls remounting
  const [mountKey, setMountKey] = useState(0);
  // State for the selected transaction for acceleration
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(
    null,
  );
  // State for the acceleration modal
  const [accelerationModalOpen, setAccelerationModalOpen] = useState(false);
  // State for the raw tx hex
  const [txHex, setTxHex] = useState<string>("");

  // Get blockchain client from Redux store
  const blockchainClient = useSelector(
    (state: any) => state.client.blockchainClient,
  );

  // Handle refresh by forcing remount
  const handleRefresh = () => {
    if (refreshWallet) {
      refreshWallet()
        .then(() => {
          // Force remount by incrementing key
          setMountKey((k) => k + 1);
        })
        .catch((err) => {
          console.error("Error refreshing wallet:", err);
          setMountKey((k) => k + 1);
        });
    } else {
      // No wallet refresh function, just force remount
      setMountKey((k) => k + 1);
    }
  };

  // Handle acceleration button click
  const handleAccelerateClick = async (tx: any) => {
    if (!tx || !blockchainClient) return;

    try {
      // Fetch the raw transaction he
      const TxHex = await blockchainClient.getTransactionHex(tx.txid);

      if (!TxHex || typeof txHex !== "string") {
        throw new Error("Invalid transaction hex received");
      }

      // Set the selected transaction and raw tx hex
      setSelectedTransaction(tx);
      setTxHex(TxHex);

      // Open the acceleration modal
      setAccelerationModalOpen(true);
    } catch (error) {
      console.error("Error fetching raw transaction:", error);
      alert("Error fetching transaction details. Please try again.");
    }
  };

  // Handle acceleration modal close
  const handleAccelerationModalClose = () => {
    setAccelerationModalOpen(false);
    setSelectedTransaction(null);
    setTxHex("");

    // Refresh the transaction list to show updated status
    handleRefresh();
  };

  // Render actual content with key to force remount
  return (
    <>
      <TransactionsTabContent
        key={mountKey}
        onRefresh={handleRefresh}
        onAccelerate={handleAccelerateClick}
      />
      {/* Acceleration Modal */}
      {selectedTransaction && (
        <AccelerationModal
          open={accelerationModalOpen}
          onClose={handleAccelerationModalClose}
          transaction={selectedTransaction}
          txHex={txHex}
        />
      )}
    </>
  );
};

const TransactionsTabContent: React.FC<{
  onRefresh: () => void;
  onAccelerate: (tx: any) => void;
}> = ({ onRefresh, onAccelerate }) => {
  // const [tabValue, setTabValue] = useState(0);
  const network = useSelector((state: any) => state.settings.network);

  // Use our custom hooks
  const { transactions, isLoading, error, fetchTransactions } =
    useFetchTransactions();
  const { sortBy, sortDirection, handleSort, pendingTxs } =
    useSortedTransactions(transactions);
  const handleExplorerLinkClick = useHandleExplorerLinkClick();

  // Get the correct transaction list based on selected tab
  // const currentTabTxs = tabValue === 0 ? pendingTxs : confirmedTxs;
  const currentTabTxs = pendingTxs;
  // Set up pagination for the current tab's transactions
  const {
    page,
    rowsPerPage,
    totalPages,
    getCurrentPageItems,
    handlePageChange,
    handleRowsPerPageChange,
  } = usePagination(currentTabTxs.length);

  // Get transactions for current page
  const currentPageTxs = getCurrentPageItems(currentTabTxs);

  const handleRefreshClick = () => {
    fetchTransactions();
    onRefresh();
  };

  return (
    <div>
      <Box display="flex" justifyContent="flex-end" alignItems="center" mb={2}>
        <Tooltip title="Refresh transactions">
          <IconButton onClick={handleRefreshClick} disabled={isLoading}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Typography color="error" gutterBottom>
          Error: {error}
        </Typography>
      )}

      {/* <Tabs value={tabValue} onChange={(_, value) => setTabValue(value)}>
        <Tab
          label={
            <Box display="flex" alignItems="center" gap={1}>
              <span>Pending</span>
              <Chip
                label={pendingTxs.length}
                size="small"
                color={pendingTxs.length > 0 ? "primary" : "default"}
              />
            </Box>
          }
        />
        <Tab
          label={
            <Box display="flex" alignItems="center" gap={1}>
              <span>Confirmed</span>
              <Chip label={confirmedTxs.length} size="small" />
            </Box>
          }
        />
      </Tabs> */}

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
              renderActions={(tx: any) => (
                <Button
                  variant="outlined"
                  size="small"
                  color="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAccelerate(tx);
                  }}
                  disabled={tx.status?.confirmed}
                >
                  Accelerate
                </Button>
              )}
            />
            {/* Pagination controls */}
            {currentTabTxs.length > 0 && (
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
                    {`${(page - 1) * rowsPerPage + 1}-${Math.min(page * rowsPerPage, currentTabTxs.length)} of ${currentTabTxs.length}`}
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
