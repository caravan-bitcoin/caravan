import React from "react";
import { FeeRatePercentile } from "@caravan/clients";
import { Box, Typography, useTheme } from "@mui/material";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";

interface FeeHistoryChartProps {
  feeRatePercentileHistory: FeeRatePercentile[];
  walletFeeRate: number;
}

const FeeHistoryChart: React.FC<FeeHistoryChartProps> = ({
  feeRatePercentileHistory,
  walletFeeRate,
}) => {
  const theme = useTheme();

  // Transform the data for the chart
  const chartData = feeRatePercentileHistory
    .map((feeData) => {
      const date = new Date(feeData.timestamp * 1000);
      return {
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString(),
        timestamp: feeData.timestamp,
        p10: feeData.avgFee_10,
        p25: feeData.avgFee_25,
        p50: feeData.avgFee_50,
        p75: feeData.avgFee_75,
        p90: feeData.avgFee_90,
        height: feeData.avgHeight,
      };
    })
    .sort((a, b) => a.timestamp - b.timestamp); // Ensure chronological order

  if (chartData.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: "center" }}>
        <Typography variant="body1">No fee history data available.</Typography>
      </Box>
    );
  }

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Box
          sx={{
            bgcolor: "background.paper",
            p: 2,
            border: "1px solid #ccc",
            borderRadius: 1,
            boxShadow: 1,
          }}
        >
          <Typography
            variant="body2"
            fontWeight="bold"
          >{`${data.date}`}</Typography>
          <Typography variant="body2">{`Block Height: ~${data.height}`}</Typography>
          <Typography
            variant="body2"
            sx={{ color: "#8884d8" }}
          >{`10th percentile: ${data.p10} sat/vB`}</Typography>
          <Typography
            variant="body2"
            sx={{ color: "#82ca9d" }}
          >{`25th percentile: ${data.p25} sat/vB`}</Typography>
          <Typography
            variant="body2"
            sx={{ color: "#ffc658" }}
          >{`Median (50th): ${data.p50} sat/vB`}</Typography>
          <Typography
            variant="body2"
            sx={{ color: "#ff8042" }}
          >{`75th percentile: ${data.p75} sat/vB`}</Typography>
          <Typography
            variant="body2"
            sx={{ color: "#ff0000" }}
          >{`90th percentile: ${data.p90} sat/vB`}</Typography>
        </Box>
      );
    }
    return null;
  };

  return (
    <Box sx={{ width: "100%", height: 400 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{
            top: 10,
            right: 30,
            left: 0,
            bottom: 0,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            label={{
              value: "Date",
              position: "insideBottomRight",
              offset: -10,
            }}
          />
          <YAxis
            label={{
              value: "Fee Rate (sat/vB)",
              angle: -90,
              position: "insideLeft",
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />

          <Area
            type="monotone"
            dataKey="p10"
            name="10th percentile"
            stackId="1"
            stroke="#8884d8"
            fill="#8884d8"
            fillOpacity={0.6}
          />
          <Area
            type="monotone"
            dataKey="p25"
            name="25th percentile"
            stackId="2"
            stroke="#82ca9d"
            fill="#82ca9d"
            fillOpacity={0.6}
          />
          <Area
            type="monotone"
            dataKey="p50"
            name="Median (50th)"
            stackId="3"
            stroke="#ffc658"
            fill="#ffc658"
            fillOpacity={0.6}
          />
          <Area
            type="monotone"
            dataKey="p75"
            name="75th percentile"
            stackId="4"
            stroke="#ff8042"
            fill="#ff8042"
            fillOpacity={0.6}
          />
          <Area
            type="monotone"
            dataKey="p90"
            name="90th percentile"
            stackId="5"
            stroke="#ff0000"
            fill="#ff0000"
            fillOpacity={0.6}
          />

          {/* Reference line for wallet's average fee rate */}
          <ReferenceLine
            y={walletFeeRate}
            label={{
              value: "Your Avg. Fee Rate",
              position: "insideTopRight",
              fill: theme.palette.primary.main,
              fontSize: 12,
            }}
            stroke={theme.palette.primary.main}
            strokeDasharray="3 3"
          />
        </AreaChart>
      </ResponsiveContainer>

      <Typography
        variant="caption"
        display="block"
        sx={{ mt: 1, textAlign: "center" }}
      >
        This chart shows the historical fee rates with percentile bands. Your
        wallet`&apos;s average fee rate is marked with a dashed line.
      </Typography>
    </Box>
  );
};

export default FeeHistoryChart;
