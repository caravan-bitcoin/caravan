import React, { useMemo } from "react";
import { Transaction } from "@caravan/clients";
import { Box, Typography, useTheme, Grid, Chip } from "@mui/material";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

interface PrivacyBreakdownPieProps {
  addressHistory: Record<string, Array<{ txid: string; time: number }>>;
  transactions: Transaction[];
}

const PrivacyBreakdownPie: React.FC<PrivacyBreakdownPieProps> = ({
  addressHistory,
  transactions,
}) => {
  const theme = useTheme();

  // Process data for visualization
  const { pieData, summary } = useMemo(() => {
    // Analyze addresses
    const reusedAddresses = new Set<string>();
    const singleUseAddresses = new Set<string>();

    // Identify reused addresses
    Object.entries(addressHistory).forEach(([address, history]) => {
      if (history.length > 1) {
        reusedAddresses.add(address);
      } else {
        singleUseAddresses.add(address);
      }
    });

    // Identify transactions with privacy issues
    const internalTxIds = new Set<string>();
    const addressReuseTxIds = new Set<string>();
    const goodPrivacyTxIds = new Set<string>();

    transactions.forEach((tx) => {
      // Check for internal transactions (between wallet addresses)
      const hasInternalInput = tx.vin.some((input) =>
        (input.prevout?.scriptpubkey_address || "").startsWith("address"),
      );

      const hasInternalOutput = tx.vout.some((output) =>
        (output.scriptpubkey_address || "").startsWith("address"),
      );

      if (hasInternalInput && hasInternalOutput) {
        internalTxIds.add(tx.txid);
        return;
      }

      // Check for address reuse
      const outputAddresses = tx.vout
        .map((output) => output.scriptpubkey_address)
        .filter(Boolean) as string[];

      if (outputAddresses.some((addr) => reusedAddresses.has(addr))) {
        addressReuseTxIds.add(tx.txid);
        return;
      }

      // If no privacy issues found, it's a good privacy transaction
      goodPrivacyTxIds.add(tx.txid);
    });

    // Prepare pie chart data
    const pieData = [
      {
        name: "Good Privacy",
        value: goodPrivacyTxIds.size,
        color: theme.palette.success.main,
        description: "Transactions with good privacy practices",
      },
      {
        name: "Address Reuse",
        value: addressReuseTxIds.size,
        color: theme.palette.warning.main,
        description: "Transactions that reuse addresses",
      },
      {
        name: "Internal Transfers",
        value: internalTxIds.size,
        color: theme.palette.error.main,
        description: "Transfers between your own addresses",
      },
    ].filter((segment) => segment.value > 0);

    // Calculate summary statistics
    const totalAddresses = reusedAddresses.size + singleUseAddresses.size;
    const totalTransactions = transactions.length;

    const summary = {
      reusedAddressCount: reusedAddresses.size,
      singleUseAddressCount: singleUseAddresses.size,
      reusedAddressPercent:
        (reusedAddresses.size / Math.max(totalAddresses, 1)) * 100,
      goodPrivacyTxCount: goodPrivacyTxIds.size,
      addressReuseTxCount: addressReuseTxIds.size,
      internalTxCount: internalTxIds.size,
      goodPrivacyTxPercent:
        (goodPrivacyTxIds.size / Math.max(totalTransactions, 1)) * 100,
    };

    return { pieData, summary };
  }, [addressHistory, transactions, theme.palette]);

  // Custom tooltip
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
          }}
        >
          <Typography variant="subtitle2">{data.name}</Typography>
          <Typography variant="body2">
            {data.value} transaction{data.value !== 1 ? "s" : ""}
          </Typography>
          <Typography variant="caption">{data.description}</Typography>
        </Box>
      );
    }
    return null;
  };

  // If no data, show placeholder
  if (pieData.length === 0) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height={300}
      >
        <Typography variant="body1" color="text.secondary">
          No transaction data available
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                innerRadius={60}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Grid>
        <Grid item xs={12} md={5}>
          <Box mt={2}>
            <Typography variant="subtitle2" gutterBottom>
              Address Usage
            </Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              <Chip
                label={`${summary.singleUseAddressCount} Single-Use Addresses (${(100 - summary.reusedAddressPercent).toFixed(1)}%)`}
                color="success"
                variant="outlined"
                size="small"
                sx={{ justifyContent: "flex-start" }}
              />
              <Chip
                label={`${summary.reusedAddressCount} Reused Addresses (${summary.reusedAddressPercent.toFixed(1)}%)`}
                color="warning"
                variant="outlined"
                size="small"
                sx={{ justifyContent: "flex-start" }}
              />
            </Box>
          </Box>

          <Box mt={3}>
            <Typography variant="subtitle2" gutterBottom>
              Transaction Privacy
            </Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              <Chip
                label={`${summary.goodPrivacyTxCount} Good Privacy (${summary.goodPrivacyTxPercent.toFixed(1)}%)`}
                color="success"
                variant="outlined"
                size="small"
                sx={{ justifyContent: "flex-start" }}
              />
              <Chip
                label={`${summary.addressReuseTxCount} Address Reuse Issues`}
                color="warning"
                variant="outlined"
                size="small"
                sx={{ justifyContent: "flex-start" }}
              />
              <Chip
                label={`${summary.internalTxCount} Internal Transfers`}
                color="error"
                variant="outlined"
                size="small"
                sx={{ justifyContent: "flex-start" }}
              />
            </Box>
          </Box>
        </Grid>
      </Grid>

      <Typography
        variant="caption"
        sx={{ display: "block", mt: 2, textAlign: "center" }}
      >
        This chart shows the breakdown of your transactions by privacy
        characteristics. Aim for more "Good Privacy" transactions by avoiding
        address reuse and minimizing internal transfers.
      </Typography>
    </Box>
  );
};

export default PrivacyBreakdownPie;
