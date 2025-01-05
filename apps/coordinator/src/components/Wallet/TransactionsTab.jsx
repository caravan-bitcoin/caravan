import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { styled } from "@mui/material/styles";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  Box,
  Typography,
  Tooltip,
  IconButton,
  CircularProgress,
  Card,
  CardHeader,
  CardContent,
  Chip,
} from "@mui/material";
import { OpenInNew, Refresh, Schedule } from "@mui/icons-material";
import { blockExplorerTransactionURL } from "@caravan/bitcoin";
import {
  setTransactions,
  setTransactionsLoading,
  setTransactionsError,
} from "../../actions/transactionActions";
import { updateBlockchainClient } from "../../actions/clientActions";

const StyledCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  height: "100%",
}));

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  fontWeight: theme.typography.fontWeightMedium,
}));

const StyledChip = styled(Chip)(({ theme }) => ({
  marginRight: theme.spacing(1),
}));

// Helper component for tab panels, helps to switch between Pending and Completed Tx's
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`transaction-tabpanel-${index}`}
      aria-labelledby={`transaction-tab-${index}`}
      {...other}
    >
      {value === index && <Box py={2}>{children}</Box>}
    </div>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

function TransactionsTab({
  network,
  transactions,
  isLoading,
  error,
  getBlockchainClient,
  deposits,
  change,
  setTransactions,
  setTransactionsLoading,
  setTransactionsError,
}) {
  const [tabValue, setTabValue] = useState(0);
  const [mounted, setMounted] = useState(true);

  // Helper function to fetch individual transaction details
  const fetchTransactionDetails = async (client, txid) => {
    try {
      const txDetails = await client.getTransaction(txid);
      return {
        ...txDetails,
        confirmed: txDetails.status.confirmed,
        timestamp: txDetails.status.block_time,
      };
    } catch (err) {
      console.error(`Error fetching tx ${txid}:`, err);
      return null;
    }
  };

  // Main function to fetch all transaction data
  const fetchTransactions = async () => {
    if (!mounted) return;
    setTransactionsLoading(true);

    try {
      const blockchainClient = await getBlockchainClient();
      if (!blockchainClient) {
        throw new Error("No blockchain client available");
      }

      // Get unique txids from all UTXOs
      const txids = new Set();
      [
        ...Object.values(deposits.nodes),
        ...Object.values(change.nodes),
      ].forEach((node) => {
        node.utxos.forEach((utxo) => txids.add(utxo.txid));
      });

      // Fetch details for each transaction
      const txPromises = Array.from(txids).map((txid) =>
        fetchTransactionDetails(blockchainClient, txid),
      );

      const txDetails = (await Promise.all(txPromises))
        .filter((tx) => tx !== null)
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)); // Sort by timestamp

      if (mounted) {
        setTransactions(txDetails);
        setTransactionsError(null);
      }
    } catch (err) {
      if (mounted) {
        setTransactionsError(err.message);
      }
    } finally {
      if (mounted) {
        setTransactionsLoading(false);
      }
    }
  };

  // Initial data fetch and cleanup
  useEffect(() => {
    setMounted(true);
    fetchTransactions();
    return () => setMounted(false);
  }, [deposits.nodes, change.nodes]);

  // Helper function to format dates
  const formatDate = (timestamp) => {
    if (!timestamp) return "Pending";
    return new Date(timestamp * 1000).toLocaleString();
  };

  // Helper function to format fees
  const formatFee = (fee) => {
    if (!fee) return "N/A";
    return `${fee.toLocaleString()} sats`;
  };

  // Split transactions into pending and confirmed
  const pendingTxs =
    transactions && Array.isArray(transactions)
      ? transactions.filter((tx) => !tx.status?.confirmed)
      : [];
  const confirmedTxs =
    transactions && Array.isArray(transactions)
      ? transactions.filter((tx) => tx.status?.confirmed)
      : [];

  // Render the transaction table
  const renderTransactionTable = (txs) => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <StyledTableCell>Transaction ID</StyledTableCell>
            <StyledTableCell>Time</StyledTableCell>
            <StyledTableCell>Details</StyledTableCell>
            <StyledTableCell align="right">Fee</StyledTableCell>
            {tabValue === 1 && (
              <StyledTableCell align="right">Block</StyledTableCell>
            )}
            <StyledTableCell>Actions</StyledTableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {txs.map((tx) => (
            <TableRow key={tx.txid} hover>
              <TableCell>
                <Tooltip title={tx.txid}>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <span>{`${tx.txid.substring(0, 8)}...`}</span>
                    {!tx.status.confirmed && (
                      <Tooltip title="Pending">
                        <Schedule
                          color="action"
                          fontSize="small"
                          sx={{ ml: 1 }}
                        />
                      </Tooltip>
                    )}
                  </Box>
                </Tooltip>
              </TableCell>
              <TableCell>{formatDate(tx.status.block_time)}</TableCell>
              <TableCell>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  <StyledChip
                    label={`${tx.size} vBytes`}
                    size="small"
                    variant="outlined"
                  />
                  <StyledChip
                    label={tx.status.confirmed ? "Confirmed" : "Pending"}
                    color={tx.status.confirmed ? "success" : "warning"}
                    size="small"
                  />
                </Box>
              </TableCell>
              <TableCell align="right">{formatFee(tx.fee)}</TableCell>
              {tabValue === 1 && (
                <TableCell align="right">
                  {tx.status.block_height?.toLocaleString()}
                </TableCell>
              )}
              <TableCell>
                <Tooltip title="View in Block Explorer">
                  <IconButton
                    onClick={() =>
                      window.open(
                        blockExplorerTransactionURL(tx.txid, network),
                        "_blank",
                      )
                    }
                    size="small"
                  >
                    <OpenInNew fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <StyledCard>
      <CardHeader
        title={
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h6">Transactions</Typography>
            <Tooltip title="Refresh transactions">
              <IconButton onClick={fetchTransactions} disabled={isLoading}>
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        }
      />
      <CardContent>
        {error && (
          <Typography color="error" gutterBottom>
            Error: {error}
          </Typography>
        )}

        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab
            label={`Pending (${pendingTxs.length})`}
            sx={{ fontWeight: "medium" }}
          />
          <Tab
            label={`Confirmed (${confirmedTxs.length})`}
            sx={{ fontWeight: "medium" }}
          />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          {isLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : pendingTxs.length > 0 ? (
            renderTransactionTable(pendingTxs)
          ) : (
            <Typography align="center" color="textSecondary" p={3}>
              No pending transactions
            </Typography>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {isLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : confirmedTxs.length > 0 ? (
            renderTransactionTable(confirmedTxs)
          ) : (
            <Typography align="center" color="textSecondary" p={3}>
              No confirmed transactions
            </Typography>
          )}
        </TabPanel>
      </CardContent>
    </StyledCard>
  );
}

TransactionsTab.propTypes = {
  network: PropTypes.string.isRequired,
  transactions: PropTypes.array,
  isLoading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  getBlockchainClient: PropTypes.func.isRequired,
  deposits: PropTypes.shape({
    nodes: PropTypes.object.isRequired,
  }).isRequired,
  change: PropTypes.shape({
    nodes: PropTypes.object.isRequired,
  }).isRequired,
  setTransactions: PropTypes.func.isRequired,
  setTransactionsLoading: PropTypes.func.isRequired,
  setTransactionsError: PropTypes.func.isRequired,
};

TransactionsTab.defaultProps = {
  transactions: [],
  error: null,
};

const mapStateToProps = (state) => {
  return {
    network: state.settings.network,
    deposits: state.wallet.deposits,
    change: state.wallet.change,
    transactions: state.spend.transaction.transactions.transactions || [], // Access nested transactions array
    isLoading: state.spend.transaction.transactions.isLoading,
    error: state.spend.transaction.transactions.error,
  };
};

const mapDispatchToProps = {
  getBlockchainClient: updateBlockchainClient,
  setTransactions,
  setTransactionsLoading,
  setTransactionsError,
};

export default connect(mapStateToProps, mapDispatchToProps)(TransactionsTab);
