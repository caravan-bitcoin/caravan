import React, { useState } from "react";
import { useSelector } from "react-redux";
import { useGetClient } from "hooks/client";
import { Box, Tabs, Tab } from "@mui/material";
import { AccelerationModal } from "./FeeBumping/components/AccelerationModal";
import { usePendingTransactions } from "clients/transactions";
import { useConfirmedTransactions } from "clients/txHistory";
import { ConfirmedTransactionsView } from "./ConfirmedTransactionsView";
import { PendingTransactionsView } from "./PendingTransactionsView";
import { useHandleTransactionExplorerLinkClick } from "./hooks";

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
  const { transactions: pendingTransactions = [] } = usePendingTransactions();

  // Fetch confirmed transactions - all of them, up to our `MAX_TRANSACTIONS_TO_FETCH`
  const {
    transactions: confirmedTransactions = [],
    isLoading: confirmedIsLoading,
    error: confirmedError,
  } = useConfirmedTransactions();

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
          <PendingTransactionsView
            network={network}
            onClickTransaction={handleExplorerLinkClick}
            onAccelerateTransaction={handleAccelerateTransaction}
          />
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
