import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { PrivacyMetrics } from "@caravan/health";
import { Transaction, AddressUtxos } from "@caravan/clients";
import {
  Grid,
  Typography,
  Box,
  Paper,
  CircularProgress,
  Alert,
  Divider,
  Card,
  CardContent,
  Tabs,
  Tab,
  Tooltip,
  IconButton,
} from "@mui/material";
import {
  InfoOutlined,
  PrivacyTipOutlined,
  TimelineOutlined,
  AccountTreeOutlined,
  CheckCircleOutlined,
  WarningAmberOutlined,
  ErrorOutlined,
} from "@mui/icons-material";

import { getWalletConfig } from "../../selectors/wallet";
import PrivacyScoreCard from "./PrivacyScoreCard";
import AddressReuseAnalysis from "./AddressReuseAnalysis";
import ClusteringRiskChart from "./ClusteringRiskChart";
import PrivacyRecommendations from "./PrivacyRecommendations";
import PrivacyHistoryChart from "./PrivacyHistoryChart";
import PrivacyBreakdownPie from "./PrivacyBreakdownPie";

// Define tab values for detailed analysis section
const ADDRESS_REUSE_TAB = 0;
const CLUSTERING_TAB = 1;
const HISTORY_TAB = 2;

// Mock data for development/testing
const mockAddressHistory = {
  address1: [
    { txid: "tx1", time: Date.now() / 1000 - 86400 * 30 },
    { txid: "tx2", time: Date.now() / 1000 - 86400 * 25 },
    { txid: "tx3", time: Date.now() / 1000 - 86400 * 10 },
  ],
  address2: [{ txid: "tx4", time: Date.now() / 1000 - 86400 * 15 }],
  address3: [
    { txid: "tx5", time: Date.now() / 1000 - 86400 * 5 },
    { txid: "tx6", time: Date.now() / 1000 - 86400 * 2 },
  ],
};

// Mock data for development/testing - properly using the Transaction type
const mockTransactions: Transaction[] = [
  {
    txid: "tx1",
    vin: [
      {
        txid: "prevTx1",
        vout: 0,
        prevout: { scriptpubkey_address: "external1" },
        addresses: ["external1"],
        sequence: 0,
        witness: [],
        scriptsig: "",
        scriptsig_asm: "",
        inner_redeemscript_asm: "",
        inner_witnessscript_asm: "",
      },
    ],
    vout: [
      {
        scriptpubkey_address: "address1",
        value: 0.1,
        scriptpubkey: "script1",
        scriptpubkey_asm: "",
        scriptpubkey_type: "",
        n: 0,
      },
      {
        scriptpubkey_address: "external2",
        value: 0.2,
        scriptpubkey: "script2",
        scriptpubkey_asm: "",
        scriptpubkey_type: "",
        n: 1,
      },
    ],
    size: 250,
    weight: 800,
    fee: 1000,
    status: {
      confirmed: true,
      block_time: Date.now() / 1000 - 86400 * 30,
      block_height: 700000,
      block_hash: "hash1",
    },
    version: 1,
    locktime: 0,
    isSend: true,
    amount: 0.3,
    block_time: Date.now() / 1000 - 86400 * 30,
  },
  {
    txid: "tx2",
    vin: [
      {
        txid: "prevTx2",
        vout: 0,
        prevout: { scriptpubkey_address: "address1" },
        addresses: ["address1"],
        sequence: 0,
        witness: [],
        scriptsig: "",
        scriptsig_asm: "",
        inner_redeemscript_asm: "",
        inner_witnessscript_asm: "",
      },
    ],
    vout: [
      {
        scriptpubkey_address: "address2",
        value: 0.05,
        scriptpubkey: "script3",
        scriptpubkey_asm: "",
        scriptpubkey_type: "",
        n: 0,
      },
      {
        scriptpubkey_address: "external3",
        value: 0.04,
        scriptpubkey: "script4",
        scriptpubkey_asm: "",
        scriptpubkey_type: "",
        n: 1,
      },
    ],
    size: 220,
    weight: 750,
    fee: 900,
    status: {
      confirmed: true,
      block_time: Date.now() / 1000 - 86400 * 25,
      block_height: 700100,
      block_hash: "hash2",
    },
    version: 1,
    locktime: 0,
    isSend: true,
    amount: 0.09,
    block_time: Date.now() / 1000 - 86400 * 25,
  },
  {
    txid: "tx3",
    vin: [
      {
        txid: "prevTx3",
        vout: 1,
        prevout: { scriptpubkey_address: "external4" },
        addresses: ["external4"],
        sequence: 0,
        witness: [],
        scriptsig: "",
        scriptsig_asm: "",
        inner_redeemscript_asm: "",
        inner_witnessscript_asm: "",
      },
    ],
    vout: [
      {
        scriptpubkey_address: "address1",
        value: 0.15,
        scriptpubkey: "script5",
        scriptpubkey_asm: "",
        scriptpubkey_type: "",
        n: 0,
      },
    ],
    size: 180,
    weight: 650,
    fee: 800,
    status: {
      confirmed: true,
      block_time: Date.now() / 1000 - 86400 * 10,
      block_height: 700200,
      block_hash: "hash3",
    },
    version: 1,
    locktime: 0,
    isSend: false,
    amount: 0.15,
    block_time: Date.now() / 1000 - 86400 * 10,
  },
  {
    txid: "tx4",
    vin: [
      {
        txid: "prevTx4",
        vout: 0,
        prevout: { scriptpubkey_address: "external5" },
        addresses: ["external5"],
        sequence: 0,
        witness: [],
        scriptsig: "",
        scriptsig_asm: "",
        inner_redeemscript_asm: "",
        inner_witnessscript_asm: "",
      },
    ],
    vout: [
      {
        scriptpubkey_address: "address2",
        value: 0.2,
        scriptpubkey: "script6",
        scriptpubkey_asm: "",
        scriptpubkey_type: "",
        n: 0,
      },
    ],
    size: 190,
    weight: 700,
    fee: 850,
    status: {
      confirmed: true,
      block_time: Date.now() / 1000 - 86400 * 15,
      block_height: 700300,
      block_hash: "hash4",
    },
    version: 1,
    locktime: 0,
    isSend: false,
    amount: 0.2,
    block_time: Date.now() / 1000 - 86400 * 15,
  },
  {
    txid: "tx5",
    vin: [
      {
        txid: "prevTx5",
        vout: 0,
        prevout: { scriptpubkey_address: "external6" },
        addresses: ["external6"],
        sequence: 0,
        witness: [],
        scriptsig: "",
        scriptsig_asm: "",
        inner_redeemscript_asm: "",
        inner_witnessscript_asm: "",
      },
    ],
    vout: [
      {
        scriptpubkey_address: "address3",
        value: 0.1,
        scriptpubkey: "script7",
        scriptpubkey_asm: "",
        scriptpubkey_type: "",
        n: 0,
      },
      {
        scriptpubkey_address: "external7",
        value: 0.05,
        scriptpubkey: "script8",
        scriptpubkey_asm: "",
        scriptpubkey_type: "",
        n: 1,
      },
    ],
    size: 230,
    weight: 780,
    fee: 950,
    status: {
      confirmed: true,
      block_time: Date.now() / 1000 - 86400 * 5,
      block_height: 700400,
      block_hash: "hash5",
    },
    version: 1,
    locktime: 0,
    isSend: false,
    amount: 0.15,
    block_time: Date.now() / 1000 - 86400 * 5,
  },
  {
    txid: "tx6",
    vin: [
      {
        txid: "prevTx6",
        vout: 0,
        prevout: { scriptpubkey_address: "address2" },
        addresses: ["address2"],
        sequence: 0,
        witness: [],
        scriptsig: "",
        scriptsig_asm: "",
        inner_redeemscript_asm: "",
        inner_witnessscript_asm: "",
      },
    ],
    vout: [
      {
        scriptpubkey_address: "address3",
        value: 0.12,
        scriptpubkey: "script9",
        scriptpubkey_asm: "",
        scriptpubkey_type: "",
        n: 0,
      },
      {
        scriptpubkey_address: "external8",
        value: 0.07,
        scriptpubkey: "script10",
        scriptpubkey_asm: "",
        scriptpubkey_type: "",
        n: 1,
      },
    ],
    size: 210,
    weight: 760,
    fee: 920,
    status: {
      confirmed: true,
      block_time: Date.now() / 1000 - 86400 * 2,
      block_height: 700500,
      block_hash: "hash6",
    },
    version: 1,
    locktime: 0,
    isSend: true,
    amount: 0.19,
    block_time: Date.now() / 1000 - 86400 * 2,
  },
];

const mockCoinJoinParticipation = {
  totalTxCount: 6,
  coinJoinCount: 0,
  lastCoinJoinDate: null,
};

const PrivacyDashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [privacyMetrics, setPrivacyMetrics] = useState<PrivacyMetrics | null>(
    null,
  );
  const [addressReuseScore, setAddressReuseScore] = useState(0);
  const [clusteringRiskScore, setClusteringRiskScore] = useState(0);
  const [coinJoinStats] = useState(mockCoinJoinParticipation);
  const [overallPrivacyScore, setOverallPrivacyScore] = useState(0);
  const [detailTab, setDetailTab] = useState(ADDRESS_REUSE_TAB);

  const walletConfig = useSelector(getWalletConfig);

  // Calculate detailed metrics for display
  const privacyDetails = React.useMemo(() => {
    const addressCount = Object.keys(mockAddressHistory).length;
    const reusedAddressCount = Object.values(mockAddressHistory).filter(
      (history) => history.length > 1,
    ).length;

    // Calculate average number of transactions per address
    const totalTransactions = Object.values(mockAddressHistory).reduce(
      (sum, history) => sum + history.length,
      0,
    );
    const avgTxPerAddress = totalTransactions / Math.max(addressCount, 1);

    // Calculate date of oldest transaction
    const oldestTimestamp = Math.min(
      ...Object.values(mockAddressHistory).flatMap((history) =>
        history.map((tx) => tx.time),
      ),
    );
    const oldestDate = new Date(oldestTimestamp * 1000);

    // Calculate count of internal transactions (between wallet addresses)
    const internalTxCount = mockTransactions.filter(
      (tx) =>
        tx.vin.some((input) =>
          (input.prevout?.scriptpubkey_address || "").startsWith("address"),
        ) &&
        tx.vout.some((output) =>
          (output.scriptpubkey_address || "").startsWith("address"),
        ),
    ).length;

    return {
      addressCount,
      reusedAddressCount,
      reusedAddressPercent:
        (reusedAddressCount / Math.max(addressCount, 1)) * 100,
      avgTxPerAddress,
      oldestDate,
      internalTxCount,
      totalTransactions,
    };
  }, [mockAddressHistory]);

  // Get privacy status and icon
  const getPrivacyStatus = (score: number) => {
    if (score >= 0.8) {
      return {
        status: "Excellent",
        color: "success.main",
        icon: <CheckCircleOutlined color="success" />,
      };
    }
    if (score >= 0.6) {
      return {
        status: "Good",
        color: "success.main",
        icon: <CheckCircleOutlined color="success" />,
      };
    }
    if (score >= 0.4) {
      return {
        status: "Moderate",
        color: "warning.main",
        icon: <WarningAmberOutlined color="warning" />,
      };
    }
    if (score >= 0.2) {
      return {
        status: "Poor",
        color: "warning.main",
        icon: <WarningAmberOutlined color="warning" />,
      };
    }
    return {
      status: "Very Poor",
      color: "error.main",
      icon: <ErrorOutlined color="error" />,
    };
  };

  const overallStatus = getPrivacyStatus(overallPrivacyScore);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // In a real implementation, you would fetch actual address history and transaction data
        // from the blockchain client

        // For POC purposes, we'll use mock data to avoid API calls

        // Create PrivacyMetrics instance with mock data
        const metrics = new PrivacyMetrics(
          mockTransactions,
          mockAddressHistory as AddressUtxos, // We cast this to AddressUtxos for now as it's just mock data
        );
        setPrivacyMetrics(metrics);

        // Calculate metrics
        const addressReuse = metrics.addressReuseFactor();
        setAddressReuseScore(addressReuse);

        const clusteringRisk = metrics.utxoValueDispersionFactor();
        setClusteringRiskScore(clusteringRisk);

        // Calculate overall privacy score (weighted average)
        const overall =
          0.5 * addressReuse +
          0.3 * clusteringRisk +
          0.2 * (coinJoinStats.coinJoinCount > 0 ? 0.8 : 0.2);
        setOverallPrivacyScore(overall);
      } catch (err: any) {
        console.error("Error fetching data for privacy dashboard:", err);
        setError(err.message || "Error fetching data for privacy dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle detail tab change
  const handleDetailTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setDetailTab(newValue);
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
      {/* Hero Section with Overall Privacy Score */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 4,
          backgroundImage:
            "linear-gradient(to right, rgba(66, 66, 255, 0.1), rgba(25, 118, 210, 0.1))",
          borderRadius: 2,
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={7}>
            <Typography variant="h5" gutterBottom fontWeight="bold">
              <PrivacyTipOutlined sx={{ mr: 1, verticalAlign: "middle" }} />
              Wallet Privacy Health
            </Typography>
            <Typography variant="body1" paragraph>
              Your wallet's privacy score assesses how well your Bitcoin usage
              protects your financial sovereignty. This dashboard analyzes your
              transactions, address usage patterns, and UTXOs to provide
              personalized recommendations.
            </Typography>
            <Box display="flex" alignItems="center">
              {overallStatus.icon}
              <Typography
                variant="h6"
                color={overallStatus.color}
                sx={{ ml: 1 }}
              >
                {overallStatus.status} Privacy Health
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={5}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                height: 200,
              }}
            >
              <Box
                sx={{
                  position: "relative",
                  width: 200,
                  height: 200,
                  borderRadius: "50%",
                  background: `radial-gradient(circle,
                    ${
                      overallPrivacyScore >= 0.8
                        ? "#4caf50"
                        : overallPrivacyScore >= 0.6
                          ? "#8bc34a"
                          : overallPrivacyScore >= 0.4
                            ? "#ffeb3b"
                            : overallPrivacyScore >= 0.2
                              ? "#ff9800"
                              : "#f44336"
                    } 10%,
                    rgba(255,255,255,0.8) 60%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: 3,
                }}
              >
                <Typography
                  variant="h2"
                  align="center"
                  fontWeight="bold"
                  color={
                    overallPrivacyScore >= 0.6
                      ? "success.main"
                      : overallPrivacyScore >= 0.4
                        ? "warning.main"
                        : "error.main"
                  }
                >
                  {Math.round(overallPrivacyScore * 10)}
                </Typography>
                <Typography
                  variant="subtitle1"
                  position="absolute"
                  bottom="50px"
                  fontWeight="medium"
                >
                  out of 10
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        {/* Key Privacy Metrics Cards */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <span>Key Privacy Metrics</span>
                <Tooltip title="These scores reflect different aspects of your wallet's privacy health. Click each card to learn more.">
                  <IconButton size="small">
                    <InfoOutlined fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Typography>
            <Divider sx={{ my: 2 }} />
            <PrivacyScoreCard
              addressReuseScore={addressReuseScore}
              clusteringRiskScore={clusteringRiskScore}
              coinJoinParticipation={coinJoinStats.coinJoinCount > 0}
              overallPrivacyScore={overallPrivacyScore}
            />
          </Paper>
        </Grid>

        {/* Privacy Breakdown Pie Chart */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <span>Privacy Breakdown</span>
                <Tooltip title="This chart shows the breakdown of your wallet's UTXOs by privacy status">
                  <IconButton size="small">
                    <InfoOutlined fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Typography>
            <PrivacyBreakdownPie
              addressHistory={mockAddressHistory}
              transactions={mockTransactions}
            />
          </Paper>
        </Grid>

        {/* Privacy Stats */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <span>Wallet Privacy Statistics</span>
                <Tooltip title="Important metrics about your wallet's privacy characteristics">
                  <IconButton size="small">
                    <InfoOutlined fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Typography>

            <Grid container spacing={2} sx={{ mt: 1 }}>
              {/* Total Addresses */}
              <Grid item xs={12} sm={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">
                      Total Addresses
                    </Typography>
                    <Typography variant="h4" color="primary.main">
                      {privacyDetails.addressCount}
                    </Typography>
                    <Typography variant="caption" display="block">
                      {privacyDetails.reusedAddressCount} reused (
                      {privacyDetails.reusedAddressPercent.toFixed(1)}%)
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Total Transactions */}
              <Grid item xs={12} sm={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">
                      Total Transactions
                    </Typography>
                    <Typography variant="h4" color="primary.main">
                      {privacyDetails.totalTransactions}
                    </Typography>
                    <Typography variant="caption" display="block">
                      Avg {privacyDetails.avgTxPerAddress.toFixed(1)} per
                      address
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Internal Transactions */}
              <Grid item xs={12} sm={6}>
                <Card
                  variant="outlined"
                  sx={{
                    bgcolor:
                      privacyDetails.internalTxCount > 0
                        ? "warning.light"
                        : "success.light",
                  }}
                >
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">
                      Internal Transactions
                    </Typography>
                    <Typography
                      variant="h4"
                      color={
                        privacyDetails.internalTxCount > 0
                          ? "warning.dark"
                          : "success.dark"
                      }
                    >
                      {privacyDetails.internalTxCount}
                    </Typography>
                    <Typography
                      variant="caption"
                      display="block"
                      color="text.secondary"
                    >
                      {privacyDetails.internalTxCount > 0
                        ? "May reveal address connections"
                        : "Good - no internal transfers"}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Wallet Age */}
              <Grid item xs={12} sm={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">
                      Wallet Age
                    </Typography>
                    <Typography variant="h4" color="primary.main">
                      {Math.round(
                        (Date.now() / 1000 -
                          privacyDetails.oldestDate.getTime() / 1000) /
                          86400,
                      )}{" "}
                      days
                    </Typography>
                    <Typography variant="caption" display="block">
                      First tx: {privacyDetails.oldestDate.toLocaleDateString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Detailed Analysis Section with Tabs */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Detailed Privacy Analysis
            </Typography>

            <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
              <Tabs
                value={detailTab}
                onChange={handleDetailTabChange}
                aria-label="privacy analysis tabs"
                sx={{ mb: 1 }}
              >
                <Tab
                  icon={<PrivacyTipOutlined />}
                  label="Address Reuse"
                  id="tab-0"
                  aria-controls="tabpanel-0"
                />
                <Tab
                  icon={<AccountTreeOutlined />}
                  label="Clustering Risk"
                  id="tab-1"
                  aria-controls="tabpanel-1"
                />
                <Tab
                  icon={<TimelineOutlined />}
                  label="Privacy History"
                  id="tab-2"
                  aria-controls="tabpanel-2"
                />
              </Tabs>
            </Box>

            {/* Tab Panels */}
            <Box
              role="tabpanel"
              hidden={detailTab !== ADDRESS_REUSE_TAB}
              id="tabpanel-0"
            >
              {detailTab === ADDRESS_REUSE_TAB && (
                <AddressReuseAnalysis
                  addressHistory={mockAddressHistory}
                  addressReuseScore={addressReuseScore}
                />
              )}
            </Box>

            <Box
              role="tabpanel"
              hidden={detailTab !== CLUSTERING_TAB}
              id="tabpanel-1"
            >
              {detailTab === CLUSTERING_TAB && (
                <ClusteringRiskChart
                  transactions={mockTransactions}
                  clusteringRiskScore={clusteringRiskScore}
                />
              )}
            </Box>

            <Box
              role="tabpanel"
              hidden={detailTab !== HISTORY_TAB}
              id="tabpanel-2"
            >
              {detailTab === HISTORY_TAB && (
                <PrivacyHistoryChart
                  transactions={mockTransactions}
                  addressHistory={mockAddressHistory}
                />
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Privacy Recommendations */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Privacy Enhancement Recommendations
            </Typography>
            <PrivacyRecommendations
              addressReuseScore={addressReuseScore}
              clusteringRiskScore={clusteringRiskScore}
              coinJoinParticipation={coinJoinStats.coinJoinCount > 0}
              overallPrivacyScore={overallPrivacyScore}
              walletType={walletConfig?.addressType || "P2WSH"}
            />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PrivacyDashboard;
