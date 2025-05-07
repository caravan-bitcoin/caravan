import React, { useMemo } from "react";
import { Transaction } from "@caravan/clients";
import {
  Box,
  Typography,
  useTheme,
  Tooltip,
  IconButton,
  Paper,
} from "@mui/material";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ComposedChart,
  Bar,
  Area,
  ReferenceLine,
  Label,
} from "recharts";
import { InfoOutlined } from "@mui/icons-material";

interface PrivacyHistoryChartProps {
  transactions: Transaction[];
  addressHistory: Record<string, Array<{ txid: string; time: number }>>;
}

const PrivacyHistoryChart: React.FC<PrivacyHistoryChartProps> = ({
  transactions,
  addressHistory,
}) => {
  const theme = useTheme();

  // Process data for visualization
  const { timelineData, cumulativeData } = useMemo(() => {
    // Sort transactions by time
    const sortedTransactions = [...transactions].sort(
      (a, b) => (a.status?.block_time || 0) - (b.status?.block_time || 0),
    );

    if (sortedTransactions.length === 0) {
      return { timelineData: [], cumulativeData: [] };
    }

    // Create a map of addresses to determine if they're reused
    const addressUsageCount = new Map<string, number>();
    Object.entries(addressHistory).forEach(([address, history]) => {
      addressUsageCount.set(address, history.length);
    });

    // Process transactions into monthly buckets
    const monthlyData = new Map<
      string,
      {
        date: string;
        timestamp: number;
        month: string;
        internalTxCount: number;
        addressReuseTxCount: number;
        goodPrivacyTxCount: number;
        totalTxCount: number;
        uniqueAddressesUsed: number;
        addressesReused: number;
      }
    >();

    // Track cumulative metrics
    let cumulativeUniqueAddresses = 0;
    let cumulativeReusedAddresses = 0;
    let cumulativeInternalTx = 0;
    let cumulativeAddressReuseTx = 0;
    let cumulativeGoodPrivacyTx = 0;
    let cumulativeTotalTx = 0;

    // Process each transaction
    sortedTransactions.forEach((tx) => {
      // Use status.block_time or fallback to tx.block_time
      const blockTime = tx.status?.block_time || tx.block_time;
      if (!blockTime) return; // Skip if no time info

      const date = new Date(blockTime * 1000);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
      const monthDisplay = date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
      });

      // Check for internal transaction
      const hasInternalInput = tx.vin.some((input) =>
        (input.prevout?.scriptpubkey_address || "").startsWith("address"),
      );

      const hasInternalOutput = tx.vout.some((output) =>
        (output.scriptpubkey_address || "").startsWith("address"),
      );

      const isInternalTx = hasInternalInput && hasInternalOutput;

      // Check for address reuse
      const outputAddresses = tx.vout
        .map((output) => output.scriptpubkey_address)
        .filter(Boolean) as string[];

      const hasAddressReuse = outputAddresses.some(
        (addr) => (addressUsageCount.get(addr) || 0) > 1,
      );

      // Determine transaction privacy category
      const isGoodPrivacy = !isInternalTx && !hasAddressReuse;

      // Update or create monthly data
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          date: date.toISOString().split("T")[0],
          timestamp: date.getTime(),
          month: monthDisplay,
          internalTxCount: 0,
          addressReuseTxCount: 0,
          goodPrivacyTxCount: 0,
          totalTxCount: 0,
          uniqueAddressesUsed: 0,
          addressesReused: 0,
        });
      }

      const monthData = monthlyData.get(monthKey)!;

      if (isInternalTx) {
        monthData.internalTxCount += 1;
        cumulativeInternalTx += 1;
      } else if (hasAddressReuse) {
        monthData.addressReuseTxCount += 1;
        cumulativeAddressReuseTx += 1;
      } else {
        monthData.goodPrivacyTxCount += 1;
        cumulativeGoodPrivacyTx += 1;
      }

      monthData.totalTxCount += 1;
      cumulativeTotalTx += 1;

      // Count unique addresses used in this transaction
      const uniqueAddressesInTx = new Set(outputAddresses);
      const reusedAddressesInTx = new Set(
        outputAddresses.filter(
          (addr) => (addressUsageCount.get(addr) || 0) > 1,
        ),
      );

      monthData.uniqueAddressesUsed += uniqueAddressesInTx.size;
      monthData.addressesReused += reusedAddressesInTx.size;

      cumulativeUniqueAddresses += uniqueAddressesInTx.size;
      cumulativeReusedAddresses += reusedAddressesInTx.size;
    });

    // Convert monthly data to array and calculate percentages
    const timelineData = Array.from(monthlyData.values())
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((data) => ({
        ...data,
        privacyScore:
          data.totalTxCount === 0
            ? 1
            : data.goodPrivacyTxCount / data.totalTxCount,
      }));

    // Create cumulative data points (one per transaction)
    const cumulativeDataPoints: any[] = [];
    let runningPrivacyScore = 1;

    sortedTransactions.forEach((tx, index) => {
      const blockTime = tx.status?.block_time || tx.block_time;
      if (!blockTime) return; // Skip if no time info

      const date = new Date(blockTime * 1000);

      // Check transaction privacy issues
      const isInternalTx =
        tx.vin.some((input) =>
          (input.prevout?.scriptpubkey_address || "").startsWith("address"),
        ) &&
        tx.vout.some((output) =>
          (output.scriptpubkey_address || "").startsWith("address"),
        );

      const outputAddresses = tx.vout
        .map((output) => output.scriptpubkey_address)
        .filter(Boolean) as string[];

      const hasAddressReuse = outputAddresses.some(
        (addr) => (addressUsageCount.get(addr) || 0) > 1,
      );

      // Calculate running privacy score
      if (index === 0) {
        runningPrivacyScore = isInternalTx || hasAddressReuse ? 0 : 1;
      } else {
        // Exponential moving average (EMA) to smooth out the score
        const alpha = 0.2; // Smoothing factor
        const newValue = isInternalTx || hasAddressReuse ? 0 : 1;
        runningPrivacyScore =
          alpha * newValue + (1 - alpha) * runningPrivacyScore;
      }

      cumulativeDataPoints.push({
        txid: tx.txid,
        date: date.toLocaleDateString(),
        timestamp: date.getTime(),
        index: index + 1,
        privacyScore: runningPrivacyScore,
        hasIssue: isInternalTx || hasAddressReuse,
        issueType: isInternalTx
          ? "Internal Transfer"
          : hasAddressReuse
            ? "Address Reuse"
            : "None",
      });
    });

    return {
      timelineData,
      cumulativeData: cumulativeDataPoints,
    };
  }, [transactions, addressHistory]);

  // Custom tooltip for monthly chart
  const MonthlyTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;

      return (
        <Paper elevation={3} sx={{ p: 2, maxWidth: 300 }}>
          <Typography variant="subtitle2" gutterBottom>
            {data.month} ({data.totalTxCount} transactions)
          </Typography>
          <Typography variant="body2">
            Privacy Score: {(data.privacyScore * 10).toFixed(1)}/10
          </Typography>
          <Typography variant="body2">
            Good Privacy: {data.goodPrivacyTxCount} tx (
            {((data.goodPrivacyTxCount / data.totalTxCount) * 100).toFixed(0)}%)
          </Typography>
          <Typography variant="body2">
            Address Reuse: {data.addressReuseTxCount} tx (
            {((data.addressReuseTxCount / data.totalTxCount) * 100).toFixed(0)}
            %)
          </Typography>
          <Typography variant="body2">
            Internal Transfers: {data.internalTxCount} tx (
            {((data.internalTxCount / data.totalTxCount) * 100).toFixed(0)}%)
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  // Custom tooltip for cumulative chart
  const CumulativeTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;

      return (
        <Paper elevation={3} sx={{ p: 2, maxWidth: 300 }}>
          <Typography variant="subtitle2" gutterBottom>
            Transaction #{data.index}
          </Typography>
          <Typography variant="body2">Date: {data.date}</Typography>
          <Typography variant="body2">
            Privacy Score: {(data.privacyScore * 10).toFixed(1)}/10
          </Typography>
          {data.hasIssue && (
            <Typography variant="body2" color="error">
              Issue: {data.issueType}
            </Typography>
          )}
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            TxID: {data.txid.substring(0, 8)}...
            {data.txid.substring(data.txid.length - 8)}
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  // If no data, show placeholder
  if (timelineData.length === 0) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height={300}
      >
        <Typography variant="body1" color="text.secondary">
          No transaction history available
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Monthly Privacy Score Chart */}
      <Box sx={{ mb: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="subtitle1">Monthly Privacy Score</Typography>
          <Tooltip title="Shows your wallet's privacy score aggregated by month, with transaction breakdowns. Higher scores mean better privacy practices.">
            <IconButton size="small">
              <InfoOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Paper variant="outlined" sx={{ p: 2, height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis
                yAxisId="left"
                domain={[0, "dataMax"]}
                tick={{ fontSize: 12 }}
              >
                <Label
                  value="Transactions"
                  angle={-90}
                  position="insideLeft"
                  style={{ textAnchor: "middle", fontSize: 12 }}
                />
              </YAxis>
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 1]}
                tickFormatter={(value) => (value * 10).toFixed(0)}
                tick={{ fontSize: 12 }}
              >
                <Label
                  value="Privacy Score"
                  angle={90}
                  position="insideRight"
                  style={{ textAnchor: "middle", fontSize: 12 }}
                />
              </YAxis>
              <RechartsTooltip content={<MonthlyTooltip />} />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="goodPrivacyTxCount"
                name="Good Privacy"
                stackId="a"
                fill={theme.palette.success.main}
              />
              <Bar
                yAxisId="left"
                dataKey="addressReuseTxCount"
                name="Address Reuse"
                stackId="a"
                fill={theme.palette.warning.main}
              />
              <Bar
                yAxisId="left"
                dataKey="internalTxCount"
                name="Internal Transfers"
                stackId="a"
                fill={theme.palette.error.main}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="privacyScore"
                name="Privacy Score"
                stroke={theme.palette.primary.main}
                strokeWidth={3}
                dot={{ r: 4 }}
              />
              <ReferenceLine
                y={0.7}
                yAxisId="right"
                stroke={theme.palette.success.main}
                strokeDasharray="3 3"
                label={{
                  value: "Good (7.0)",
                  position: "insideBottomRight",
                  fontSize: 12,
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Paper>
      </Box>

      {/* Cumulative Privacy Score Chart */}
      <Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="subtitle1">
            Cumulative Privacy Score Evolution
          </Typography>
          <Tooltip title="Shows how your wallet's privacy score has evolved with each transaction. Upward trends indicate improved privacy practices over time.">
            <IconButton size="small">
              <InfoOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Paper variant="outlined" sx={{ p: 2, height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cumulativeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="index"
                label={{
                  value: "Transaction Number",
                  position: "insideBottom",
                  offset: -10,
                }}
              />
              <YAxis
                domain={[0, 1]}
                tickFormatter={(value) => (value * 10).toFixed(0)}
              >
                <Label
                  value="Privacy Score"
                  angle={-90}
                  position="insideLeft"
                />
              </YAxis>
              <RechartsTooltip content={<CumulativeTooltip />} />
              <Legend />
              <ReferenceLine
                y={0.7}
                stroke={theme.palette.success.main}
                strokeDasharray="3 3"
                label={{ value: "Good (7.0)", position: "insideBottomRight" }}
              />
              <ReferenceLine
                y={0.4}
                stroke={theme.palette.warning.main}
                strokeDasharray="3 3"
                label={{
                  value: "Moderate (4.0)",
                  position: "insideBottomRight",
                }}
              />
              <Area
                type="monotone"
                dataKey="privacyScore"
                name="Privacy Score"
                fill={theme.palette.primary.light}
                fillOpacity={0.3}
                stroke={theme.palette.primary.main}
                strokeWidth={2}
                activeDot={{
                  r: 6,
                  stroke: "#fff",
                  strokeWidth: 1,
                  fill: (entry: any) =>
                    entry.hasIssue
                      ? theme.palette.error.main
                      : theme.palette.success.main,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Paper>

        <Typography
          variant="caption"
          sx={{ display: "block", mt: 1, textAlign: "center" }}
        >
          The Privacy Score Evolution chart tracks how your privacy score
          changes with each transaction. Drops in the line indicate transactions
          with privacy issues, while a rising trend shows improvement.
        </Typography>
      </Box>
    </Box>
  );
};

export default PrivacyHistoryChart;
