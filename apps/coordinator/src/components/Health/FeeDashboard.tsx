import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { WasteMetrics } from "@caravan/health";
import { FeeRatePercentile } from "@caravan/clients";
import {
  Grid,
  Typography,
  Box,
  Paper,
  CircularProgress,
  Alert,
  Divider,
} from "@mui/material";

import { getWalletConfig } from "../../selectors/wallet";
import FeeMetricsCard from "./FeeMetricsCard";
import FeeHistoryChart from "./FeeHistoryChart";
import DustAnalysis from "./DustAnalysis";
import HealthRecommendations from "./HealthRecommendations";

// Mock data for development/testing without hitting APIs
const mockTransactions = [
  {
    txid: "txid1",
    vin: [{ prevTxId: "prevTxId1", vout: 0, sequence: 0 }],
    vout: [
      {
        scriptPubkeyHex: "scriptPubkeyHex1",
        scriptPubkeyAddress: "address1",
        value: 0.1,
      },
    ],
    size: 250,
    weight: 750,
    fee: 3000,
    isSend: true,
    amount: 100000,
    block_time: Date.now() / 1000 - 86400 * 2,
  },
  {
    txid: "txid2",
    vin: [
      { prevTxId: "prevTxId2", vout: 0, sequence: 0 },
      { prevTxId: "prevTxId3", vout: 1, sequence: 0 },
    ],
    vout: [
      {
        scriptPubkeyHex: "scriptPubkeyHex2",
        scriptPubkeyAddress: "address2",
        value: 0.2,
      },
    ],
    size: 300,
    weight: 950,
    fee: 5000,
    isSend: true,
    amount: 200000,
    block_time: Date.now() / 1000 - 86400,
  },
];

const mockUtxos = {
  address1: [
    {
      txid: "tx1",
      vout: 0,
      value: 0.1,
      status: { confirmed: true, block_time: 1234 },
    },
    {
      txid: "tx2",
      vout: 0,
      value: 0.2,
      status: { confirmed: true, block_time: 1234 },
    },
  ],
  address2: [
    {
      txid: "tx3",
      vout: 0,
      value: 0.3,
      status: { confirmed: true, block_time: 1234 },
    },
    {
      txid: "tx4",
      vout: 0,
      value: 0.4,
      status: { confirmed: true, block_time: 1234 },
    },
  ],
};

const mockFeeRatePercentileHistory: FeeRatePercentile[] = [
  {
    avgHeight: 800000,
    timestamp: Date.now() / 1000 - 86400 * 7,
    avgFee_0: 1,
    avgFee_10: 3,
    avgFee_25: 5,
    avgFee_50: 8,
    avgFee_75: 12,
    avgFee_90: 20,
    avgFee_100: 50,
  },
  {
    avgHeight: 800100,
    timestamp: Date.now() / 1000 - 86400 * 6,
    avgFee_0: 2,
    avgFee_10: 4,
    avgFee_25: 7,
    avgFee_50: 10,
    avgFee_75: 15,
    avgFee_90: 25,
    avgFee_100: 60,
  },
  {
    avgHeight: 800200,
    timestamp: Date.now() / 1000 - 86400 * 5,
    avgFee_0: 1,
    avgFee_10: 3,
    avgFee_25: 6,
    avgFee_50: 9,
    avgFee_75: 14,
    avgFee_90: 22,
    avgFee_100: 55,
  },
  {
    avgHeight: 800300,
    timestamp: Date.now() / 1000 - 86400 * 4,
    avgFee_0: 2,
    avgFee_10: 5,
    avgFee_25: 8,
    avgFee_50: 12,
    avgFee_75: 18,
    avgFee_90: 30,
    avgFee_100: 70,
  },
  {
    avgHeight: 800400,
    timestamp: Date.now() / 1000 - 86400 * 3,
    avgFee_0: 3,
    avgFee_10: 6,
    avgFee_25: 10,
    avgFee_50: 15,
    avgFee_75: 22,
    avgFee_90: 35,
    avgFee_100: 80,
  },
  {
    avgHeight: 800500,
    timestamp: Date.now() / 1000 - 86400 * 2,
    avgFee_0: 2,
    avgFee_10: 5,
    avgFee_25: 9,
    avgFee_50: 14,
    avgFee_75: 20,
    avgFee_90: 32,
    avgFee_100: 75,
  },
  {
    avgHeight: 800600,
    timestamp: Date.now() / 1000 - 86400 * 1,
    avgFee_0: 2,
    avgFee_10: 4,
    avgFee_25: 8,
    avgFee_50: 13,
    avgFee_75: 19,
    avgFee_90: 30,
    avgFee_100: 65,
  },
];

const FeeDashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feeRatePercentileHistory, setFeeRatePercentileHistory] = useState<
    FeeRatePercentile[]
  >([]);
  const [wasteMetrics, setWasteMetrics] = useState<WasteMetrics | null>(null);
  const [currentFeeRate, setCurrentFeeRate] = useState<number>(0);

  const walletConfig = useSelector(getWalletConfig);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // In a real implementation, you would fetch real transaction data and UTXOs
        // from the blockchain using the client

        // For POC purposes, we'll use mock data to avoid API calls

        // Create WasteMetrics instance with mock data
        const metrics = new WasteMetrics(mockTransactions, mockUtxos);
        setWasteMetrics(metrics);

        // Get fee rate percentile history
        // In a real implementation, uncomment this:
        // const feeHistory = await blockchainClient.getBlockFeeRatePercentileHistory();
        const feeHistory = mockFeeRatePercentileHistory;
        setFeeRatePercentileHistory(feeHistory);

        // Get current fee rate
        // In a real implementation, uncomment this:
        // const feeRate = await blockchainClient.getFeeEstimate(3);
        const feeRate = 12; // Mock fee rate
        setCurrentFeeRate(feeRate);
      } catch (err: any) {
        console.error("Error fetching data for fee dashboard:", err);
        setError(err.message || "Error fetching data for fee dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

  // Calculate metrics scores
  const relativeFeesScore =
    wasteMetrics?.relativeFeesScore(feeRatePercentileHistory) || 0;
  const feesToAmountRatio = wasteMetrics?.feesToAmountRatio() || 0;
  const weightedWasteScore =
    wasteMetrics?.weightedWasteScore(feeRatePercentileHistory) || 0;

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Fee Health Overview */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" gutterBottom>
              Fee Health Overview
            </Typography>
            <Typography variant="body1" paragraph>
              This dashboard analyzes your wallet`&apos;s fee spending patterns
              and provides recommendations to optimize transaction costs.
            </Typography>
            <Divider sx={{ my: 2 }} />
            <FeeMetricsCard
              relativeFeesScore={relativeFeesScore}
              feesToAmountRatio={feesToAmountRatio}
              weightedWasteScore={weightedWasteScore}
            />
          </Paper>
        </Grid>

        {/* Fee History Chart */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              Fee Rate History
            </Typography>
            <FeeHistoryChart
              feeRatePercentileHistory={feeRatePercentileHistory}
              walletFeeRate={5} // Mock value
            />
          </Paper>
        </Grid>

        {/* UTXO Dust Analysis */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              UTXO Dust Analysis
            </Typography>
            <DustAnalysis
              currentFeeRate={currentFeeRate}
              walletType={walletConfig?.addressType || "P2WSH"}
              quorum={{
                requiredSignerCount: walletConfig?.quorum?.requiredSigners || 2,
                totalSignerCount: walletConfig?.quorum?.totalSigners || 3,
              }}
              wasteMetrics={wasteMetrics}
              utxos={mockUtxos}
            />
          </Paper>
        </Grid>

        {/* Recommendations */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Fee Optimization Recommendations
            </Typography>
            <HealthRecommendations
              relativeFeesScore={relativeFeesScore}
              feesToAmountRatio={feesToAmountRatio}
              weightedWasteScore={weightedWasteScore}
              currentFeeRate={currentFeeRate}
            />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default FeeDashboard;
