import React, { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  Divider,
  Tab,
  Tabs,
  Card,
  CardContent,
  Tooltip,
  IconButton,
} from "@mui/material";
import {
  AccountBalanceWalletOutlined,
  InfoOutlined,
  PrivacyTipOutlined,
  WarningAmberOutlined,
  CompareArrowsOutlined,
} from "@mui/icons-material";
import { WasteMetrics } from "@caravan/health";
import { MultisigAddressType } from "@caravan/bitcoin";

import { getWalletConfig } from "../../selectors/wallet";
import UTXOTreemap from "./UTXOTreemap";
import UTXODetails from "./UTXODetails";
import TradeoffChart from "./TradeoffChart";

// Mock data for development - you'd replace these with real data in production
const mockUtxos = {
  address1: [
    {
      txid: "tx1",
      vout: 0,
      value: 0.00001,
      status: { confirmed: true, block_time: Date.now() / 1000 - 86400 * 30 },
    },
    {
      txid: "tx2",
      vout: 0,
      value: 0.02,
      status: { confirmed: true, block_time: Date.now() / 1000 - 86400 * 25 },
    },
  ],
  address2: [
    {
      txid: "tx3",
      vout: 0,
      value: 0.0007,
      status: { confirmed: true, block_time: Date.now() / 1000 - 86400 * 15 },
    },
    {
      txid: "tx4",
      vout: 0,
      value: 0.4,
      status: { confirmed: true, block_time: Date.now() / 1000 - 86400 * 10 },
    },
  ],
  address3: [
    {
      txid: "tx5",
      vout: 0,
      value: 0.1,
      status: { confirmed: true, block_time: Date.now() / 1000 - 86400 * 5 },
    },
  ],
};

const mockAddressHistory = {
  address1: [
    { txid: "tx1", time: Date.now() / 1000 - 86400 * 30 },
    { txid: "tx2", time: Date.now() / 1000 - 86400 * 25 },
    { txid: "tx6", time: Date.now() / 1000 - 86400 * 20 },
  ],
  address2: [
    { txid: "tx3", time: Date.now() / 1000 - 86400 * 15 },
    { txid: "tx4", time: Date.now() / 1000 - 86400 * 10 },
  ],
  address3: [{ txid: "tx5", time: Date.now() / 1000 - 86400 * 5 }],
};

// Tab values
const TREEMAP_TAB = 0;
const TRADEOFF_TAB = 1;

interface UTXO {
  txid: string;
  vout: number;
  value: number;
  address?: string;
  status: {
    confirmed: boolean;
    block_time: number;
  };
  isReused?: boolean;
  isDust?: boolean;
  isAtRisk?: boolean;
  privacyScore?: number;
  wasteScore?: number;
}

const UTXOExplorer: React.FC = () => {
  const [activeTab, setActiveTab] = useState(TREEMAP_TAB);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFeeRate, setCurrentFeeRate] = useState<number>(10); // sats/vB
  const [selectedUTXO, setSelectedUTXO] = useState<UTXO | null>(null);
  const [wasteMetrics, setWasteMetrics] = useState<WasteMetrics | null>(null);
  const [utxos, setUtxos] = useState<Record<string, UTXO[]>>({});
  const [addressHistory, setAddressHistory] = useState<
    Record<string, Array<{ txid: string; time: number }>>
  >({});

  const walletConfig = useSelector(getWalletConfig);

  // Calculate dust limits using WasteMetrics
  const dustLimits = useMemo(() => {
    if (!wasteMetrics) {
      return { lowerLimit: 546, upperLimit: 1092 }; // Default values
    }

    // If we have the metrics instance, calculate actual dust limits
    const tempWasteMetrics = new WasteMetrics(); // Create a temporary instance for the calculation
    return tempWasteMetrics.calculateDustLimits(
      currentFeeRate,
      walletConfig?.addressType || ("P2WSH" as MultisigAddressType),
      {
        requiredSignerCount: walletConfig?.quorum?.requiredSigners || 2,
        totalSignerCount: walletConfig?.quorum?.totalSigners || 3,
      },
      2, // Risk multiplier
    );
  }, [currentFeeRate, walletConfig, wasteMetrics]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // In a real implementation, you would fetch real UTXO data and address history
        // from the blockchain client

        // For POC purposes, we'll use mock data to avoid API calls
        setUtxos(mockUtxos);
        setAddressHistory(mockAddressHistory);

        // Create WasteMetrics instance
        // In a real implementation you'd use actual transaction data
        const metrics = new WasteMetrics();
        setWasteMetrics(metrics);

        // Get current fee rate
        // In a real implementation, uncomment this:
        // const feeRate = await blockchainClient.getFeeEstimate(3);
        const feeRate = 10; // Mock fee rate
        setCurrentFeeRate(feeRate);
      } catch (err: any) {
        console.error("Error fetching data for UTXO explorer:", err);
        setError(err.message || "Error fetching data for UTXO explorer");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate wallet statistics
  const walletStats = useMemo(() => {
    let totalBalance = 0;
    let totalUtxos = 0;
    let dustCount = 0;
    let atRiskCount = 0;
    let addressReuseCount = 0;
    let highPrivacyCount = 0;

    // Count UTXOs and balances
    Object.entries(utxos).forEach(([address, addressUtxos]) => {
      addressUtxos.forEach((utxo) => {
        totalBalance += utxo.value;
        totalUtxos++;

        // Check if dust
        const valueSats = Math.round(utxo.value * 100000000);
        if (valueSats <= dustLimits.lowerLimit) {
          dustCount++;
        } else if (valueSats <= dustLimits.upperLimit) {
          atRiskCount++;
        }

        // Check address reuse
        const isReused = (addressHistory[address]?.length || 0) > 1;
        if (isReused) {
          addressReuseCount++;
        } else {
          highPrivacyCount++;
        }
      });
    });

    return {
      totalBalance,
      totalUtxos,
      dustCount,
      atRiskCount,
      addressReuseCount,
      highPrivacyCount,
      healthyUtxos: totalUtxos - dustCount - atRiskCount,
      privacyScore: highPrivacyCount / totalUtxos || 0,
      wasteScore:
        (totalUtxos - dustCount - atRiskCount * 0.5) / totalUtxos || 0,
    };
  }, [utxos, addressHistory, dustLimits]);

  // Handle tab change
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Handle UTXO selection
  const handleSelectUTXO = (utxo: UTXO) => {
    setSelectedUTXO(utxo);
  };

  // Handle closing UTXO details
  const handleCloseDetails = () => {
    setSelectedUTXO(null);
  };

  // Format BTC amount
  const formatBTC = (amount: number) => {
    return amount.toFixed(8);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        <AccountBalanceWalletOutlined sx={{ mr: 1, verticalAlign: "middle" }} />
        UTXO Explorer
      </Typography>

      <Grid container spacing={3} mb={3}>
        {/* Total Balance Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Total Balance
              </Typography>
              <Typography variant="h4" color="primary.main">
                {formatBTC(walletStats.totalBalance)} BTC
              </Typography>
              <Typography variant="caption" display="block">
                {walletStats.totalUtxos} UTXOs
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Privacy Score Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="subtitle2" color="text.secondary">
                  Privacy Score
                </Typography>
                <Tooltip title="Based on address reuse patterns in your wallet">
                  <IconButton size="small">
                    <InfoOutlined fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography
                variant="h4"
                color={
                  walletStats.privacyScore >= 0.7
                    ? "success.main"
                    : walletStats.privacyScore >= 0.4
                      ? "warning.main"
                      : "error.main"
                }
              >
                {(walletStats.privacyScore * 10).toFixed(1)}/10
              </Typography>
              <Typography variant="caption" display="block">
                {walletStats.addressReuseCount} addresses reused
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Waste Score Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="subtitle2" color="text.secondary">
                  Waste Score
                </Typography>
                <Tooltip title="Indicates how economical your UTXOs are to spend">
                  <IconButton size="small">
                    <InfoOutlined fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography
                variant="h4"
                color={
                  walletStats.wasteScore >= 0.7
                    ? "success.main"
                    : walletStats.wasteScore >= 0.4
                      ? "warning.main"
                      : "error.main"
                }
              >
                {(walletStats.wasteScore * 10).toFixed(1)}/10
              </Typography>
              <Typography variant="caption" display="block">
                {walletStats.dustCount} dust UTXOs
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Current Fee Rate Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Current Fee Rate
              </Typography>
              <Typography variant="h4" color="secondary.main">
                {currentFeeRate} sat/vB
              </Typography>
              <Typography variant="caption" display="block">
                Dust Limit: {dustLimits.lowerLimit} sats
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tab Navigation */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab
            icon={<AccountBalanceWalletOutlined />}
            label="UTXO Treemap"
            id="utxo-tab"
            aria-controls="utxo-panel"
          />
          <Tab
            icon={<CompareArrowsOutlined />}
            label="Privacy vs. Waste Tradeoff"
            id="tradeoff-tab"
            aria-controls="tradeoff-panel"
          />
        </Tabs>
      </Paper>

      {/* Selected UTXO Details */}
      {selectedUTXO && (
        <UTXODetails utxo={selectedUTXO} onClose={handleCloseDetails} />
      )}

      {/* Tab Content */}
      <Box role="tabpanel" hidden={activeTab !== TREEMAP_TAB} id="utxo-panel">
        {activeTab === TREEMAP_TAB && (
          <UTXOTreemap
            utxos={utxos}
            dustLimits={dustLimits}
            addressReuseData={addressHistory}
            onSelectUTXO={handleSelectUTXO}
          />
        )}
      </Box>

      <Box
        role="tabpanel"
        hidden={activeTab !== TRADEOFF_TAB}
        id="tradeoff-panel"
      >
        {activeTab === TRADEOFF_TAB && (
          <TradeoffChart
            utxos={utxos}
            dustLimits={dustLimits}
            addressReuseData={addressHistory}
            onSelectUTXO={handleSelectUTXO}
          />
        )}
      </Box>

      {/* Recommendations */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          <Box display="flex" alignItems="center">
            <PrivacyTipOutlined sx={{ mr: 1 }} />
            Privacy vs. Waste Insights
          </Box>
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                <PrivacyTipOutlined
                  fontSize="small"
                  sx={{ mr: 1, verticalAlign: "text-bottom" }}
                />
                Privacy Insights
              </Typography>

              <Typography variant="body2" paragraph>
                {walletStats.addressReuseCount === 0
                  ? "Excellent! You're not reusing any addresses, which is ideal for privacy."
                  : `${walletStats.addressReuseCount} of your ${walletStats.totalUtxos} UTXOs are in reused addresses, which can reduce your privacy by making it easier to link your transactions.`}
              </Typography>

              <Typography variant="body2">
                {walletStats.addressReuseCount > 0
                  ? "Consider spending UTXOs from reused addresses to fresh addresses during low fee periods to improve your privacy score."
                  : "Continue using a new address for each transaction to maintain your excellent privacy practices."}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                <WarningAmberOutlined
                  fontSize="small"
                  sx={{ mr: 1, verticalAlign: "text-bottom" }}
                />
                Waste Insights
              </Typography>

              <Typography variant="body2" paragraph>
                {walletStats.dustCount === 0 && walletStats.atRiskCount === 0
                  ? "Great! Your wallet doesn't contain any dust or at-risk UTXOs."
                  : `Your wallet contains ${walletStats.dustCount} dust UTXOs and ${walletStats.atRiskCount} at-risk UTXOs that may be expensive to spend relative to their value.`}
              </Typography>

              <Typography variant="body2">
                {walletStats.dustCount > 0 || walletStats.atRiskCount > 0
                  ? `Current fee rate is ${currentFeeRate} sat/vB. Consider consolidating smaller UTXOs during lower fee periods (ideally below ${Math.floor(currentFeeRate / 2)} sat/vB) to optimize your wallet's efficiency.`
                  : `Current fee rate is ${currentFeeRate} sat/vB. All your UTXOs are healthy and economical to spend.`}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default UTXOExplorer;
