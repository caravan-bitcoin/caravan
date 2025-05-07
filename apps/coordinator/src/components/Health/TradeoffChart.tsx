import React, { useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  useTheme,
  Tooltip,
  IconButton,
  Card,
  CardContent,
  Grid,
} from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  Label,
  ReferenceLine,
} from "recharts";

interface UTXO {
  txid: string;
  vout: number;
  value: number;
  address?: string;
  status: {
    confirmed: boolean;
    block_time: number;
  };
}

interface TradeoffChartProps {
  utxos: Record<string, UTXO[]>;
  dustLimits: {
    lowerLimit: number;
    upperLimit: number;
  };
  addressReuseData: Record<string, Array<{ txid: string; time: number }>>;
  onSelectUTXO?: (
    utxo: UTXO & {
      privacyScore: number;
      wasteScore: number;
      isReused: boolean;
      isDust: boolean;
      isAtRisk: boolean;
    },
  ) => void;
}

const TradeoffChart: React.FC<TradeoffChartProps> = ({
  utxos,
  dustLimits,
  addressReuseData,
  onSelectUTXO,
}) => {
  const theme = useTheme();

  // Process UTXOs for the scatter plot
  const { scatterData, quadrantCounts, utxoAnalysis } = useMemo(() => {
    // Process and flatten UTXOs
    const processedUtxos = Object.entries(utxos).flatMap(
      ([address, addressUtxos]) => {
        return addressUtxos.map((utxo) => {
          // Calculate privacy score (0-1)
          const isReused = (addressReuseData[address]?.length || 0) > 1;
          const privacyScore = isReused ? 0.3 : 0.9;

          // Calculate waste score (0-1)
          const valueSats = Math.round(utxo.value * 100000000);
          const isDust = valueSats <= dustLimits.lowerLimit;
          const isAtRisk = !isDust && valueSats <= dustLimits.upperLimit;
          const wasteScore = isDust ? 0.1 : isAtRisk ? 0.4 : 0.9;

          // Format display information
          const displayAddress = `${address.substring(0, 6)}...${address.substring(
            address.length - 6,
          )}`;

          return {
            ...utxo,
            address,
            displayAddress,
            value: utxo.value,
            valueSats,
            privacyScore,
            wasteScore,
            isReused,
            isDust,
            isAtRisk,
            name: `${utxo.txid.substring(0, 6)}...${utxo.txid.substring(
              utxo.txid.length - 6,
            )}:${utxo.vout}`,
            // Scale the size by the log of the value to make visualization better
            size: Math.max(10, Math.log10(valueSats) * 10),
          };
        });
      },
    );

    // Count UTXOs in each quadrant to understand distribution
    const quadrantCounts = {
      q1: 0, // High privacy, high waste efficiency (good)
      q2: 0, // High privacy, low waste efficiency
      q3: 0, // Low privacy, low waste efficiency (bad)
      q4: 0, // Low privacy, high waste efficiency
    };

    processedUtxos.forEach((utxo) => {
      if (utxo.privacyScore >= 0.5 && utxo.wasteScore >= 0.5) {
        quadrantCounts.q1++;
      } else if (utxo.privacyScore >= 0.5 && utxo.wasteScore < 0.5) {
        quadrantCounts.q2++;
      } else if (utxo.privacyScore < 0.5 && utxo.wasteScore < 0.5) {
        quadrantCounts.q3++;
      } else {
        quadrantCounts.q4++;
      }
    });

    // Calculate overall metrics
    const totalUtxos = processedUtxos.length;
    const goodUtxos = quadrantCounts.q1;
    const goodPrivacyCount = quadrantCounts.q1 + quadrantCounts.q2;
    const goodWasteCount = quadrantCounts.q1 + quadrantCounts.q4;
    const badUtxos = quadrantCounts.q3;

    const utxoAnalysis = {
      totalUtxos,
      goodUtxos,
      badUtxos,
      goodPrivacyCount,
      goodWasteCount,
      goodPercentage: (goodUtxos / totalUtxos) * 100,
      badPercentage: (badUtxos / totalUtxos) * 100,
      privacyPercentage: (goodPrivacyCount / totalUtxos) * 100,
      wastePercentage: (goodWasteCount / totalUtxos) * 100,
    };

    return {
      scatterData: processedUtxos,
      quadrantCounts,
      utxoAnalysis,
    };
  }, [utxos, dustLimits, addressReuseData]);

  // Format satoshis to BTC
  const formatSats = (sats: number) => {
    return (sats / 100000000).toFixed(8);
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const utxo = payload[0].payload;

      return (
        <Paper
          elevation={3}
          sx={{
            p: 2,
            maxWidth: 300,
            backgroundColor: "background.paper",
            color: "text.primary",
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            UTXO Details
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            <strong>TxID:</strong> {utxo.txid.substring(0, 8)}...
            {utxo.txid.substring(utxo.txid.length - 8)}
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            <strong>Value:</strong> {formatSats(utxo.valueSats)} BTC
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            <strong>Address:</strong> {utxo.displayAddress}
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            <strong>Privacy Score:</strong>{" "}
            {(utxo.privacyScore * 10).toFixed(1)}/10
            {utxo.isReused && " (Reused Address)"}
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            <strong>Waste Score:</strong> {(utxo.wasteScore * 10).toFixed(1)}/10
            {utxo.isDust
              ? " (Dust)"
              : utxo.isAtRisk
                ? " (At Risk)"
                : " (Healthy)"}
          </Typography>
          <Typography
            variant="caption"
            display="block"
            sx={{ mt: 1, fontStyle: "italic" }}
          >
            Click for more details
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  // Handler for UTXO click
  const handleUTXOClick = (data: any) => {
    if (onSelectUTXO) {
      onSelectUTXO(data);
    }
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6">
          Privacy vs. Waste Efficiency Trade-off
        </Typography>
        <Tooltip
          title="This chart shows the trade-off between privacy and waste efficiency for each UTXO. Ideally, UTXOs should be in the top-right quadrant (high privacy, high waste efficiency)."
          arrow
        >
          <IconButton size="small">
            <InfoOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: theme.palette.success.light }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Optimal UTXOs (Q1)
              </Typography>
              <Typography variant="h5" color="success.dark">
                {quadrantCounts.q1} UTXOs
              </Typography>
              <Typography variant="caption">
                {utxoAnalysis.goodPercentage.toFixed(1)}% of your wallet
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: theme.palette.info.light }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Privacy-Focused (Q2)
              </Typography>
              <Typography variant="h5" color="info.dark">
                {quadrantCounts.q2} UTXOs
              </Typography>
              <Typography variant="caption">
                Good privacy, but potentially wasteful
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: theme.palette.error.light }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Problematic UTXOs (Q3)
              </Typography>
              <Typography variant="h5" color="error.dark">
                {quadrantCounts.q3} UTXOs
              </Typography>
              <Typography variant="caption">
                {utxoAnalysis.badPercentage.toFixed(1)}% of your wallet
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: theme.palette.warning.light }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Efficient but Exposed (Q4)
              </Typography>
              <Typography variant="h5" color="warning.dark">
                {quadrantCounts.q4} UTXOs
              </Typography>
              <Typography variant="caption">
                Economical, but with privacy concerns
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Scatter Plot */}
      <Paper
        variant="outlined"
        sx={{
          height: 500,
          p: 2,
          mb: 2,
          bgcolor: theme.palette.background.paper,
        }}
      >
        {scatterData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{
                top: 20,
                right: 20,
                bottom: 60,
                left: 20,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="wasteScore"
                name="Waste Efficiency"
                domain={[0, 1]}
                tickCount={5}
                tickFormatter={(value) => `${(value * 10).toFixed(0)}`}
              >
                <Label
                  value="Waste Efficiency Score"
                  position="bottom"
                  offset={20}
                />
              </XAxis>
              <YAxis
                type="number"
                dataKey="privacyScore"
                name="Privacy"
                domain={[0, 1]}
                tickCount={5}
                tickFormatter={(value) => `${(value * 10).toFixed(0)}`}
              >
                <Label
                  value="Privacy Score"
                  position="left"
                  angle={-90}
                  offset={0}
                />
              </YAxis>
              <ZAxis
                type="number"
                dataKey="size"
                range={[20, 100]}
                name="Size"
                unit=" sats"
              />

              {/* Reference Lines for Quadrants */}
              <ReferenceLine
                x={0.5}
                stroke={theme.palette.divider}
                strokeWidth={2}
                strokeDasharray="5 5"
              />
              <ReferenceLine
                y={0.5}
                stroke={theme.palette.divider}
                strokeWidth={2}
                strokeDasharray="5 5"
              />

              {/* Quadrant Labels */}
              <text
                x="75%"
                y="75%"
                textAnchor="middle"
                fill={theme.palette.text.secondary}
              >
                Q4: Efficient but Exposed
              </text>
              <text
                x="25%"
                y="75%"
                textAnchor="middle"
                fill={theme.palette.text.secondary}
              >
                Q3: Problematic
              </text>
              <text
                x="25%"
                y="25%"
                textAnchor="middle"
                fill={theme.palette.text.secondary}
              >
                Q2: Privacy-Focused
              </text>
              <text
                x="75%"
                y="25%"
                textAnchor="middle"
                fill={theme.palette.text.secondary}
              >
                Q1: Optimal
              </text>

              <RechartsTooltip content={<CustomTooltip />} />

              <Legend />

              <Scatter
                name="UTXOs"
                data={scatterData}
                fill={theme.palette.primary.main}
                onClick={handleUTXOClick}
                cursor="pointer"
              />
            </ScatterChart>
          </ResponsiveContainer>
        ) : (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            height="100%"
          >
            <Typography variant="body1" color="text.secondary">
              No UTXOs available for visualization
            </Typography>
          </Box>
        )}
      </Paper>

      <Typography variant="subtitle1" gutterBottom>
        Interpretation Guide
      </Typography>
      <Typography variant="body2" paragraph>
        This chart illustrates the trade-off between privacy and waste
        efficiency for each of your UTXOs:
      </Typography>
      <Typography variant="body2" component="div">
        <ul>
          <li>
            <strong>Quadrant 1 (top-right):</strong> Optimal UTXOs with both
            good privacy and good waste efficiency
          </li>
          <li>
            <strong>Quadrant 2 (top-left):</strong> Privacy-focused UTXOs that
            may be economically inefficient to spend
          </li>
          <li>
            <strong>Quadrant 3 (bottom-left):</strong> Problematic UTXOs with
            both privacy and waste concerns
          </li>
          <li>
            <strong>Quadrant 4 (bottom-right):</strong> Economically efficient
            UTXOs but with privacy concerns
          </li>
        </ul>
      </Typography>
      <Typography variant="body2" paragraph>
        The size of each dot represents the relative value of the UTXO. Ideally,
        you want most of your UTXOs in Quadrant 1.
      </Typography>
      <Typography variant="body2">
        {utxoAnalysis.goodPercentage > 70 ? (
          <strong>
            Your wallet is in great shape with{" "}
            {utxoAnalysis.goodPercentage.toFixed(1)}% of UTXOs in the optimal
            quadrant!
          </strong>
        ) : utxoAnalysis.goodPercentage > 40 ? (
          <strong>
            Your wallet is reasonably balanced with{" "}
            {utxoAnalysis.goodPercentage.toFixed(1)}% of UTXOs in the optimal
            quadrant.
          </strong>
        ) : (
          <strong>
            Consider addressing the UTXOs in Quadrant 3 (bottom-left) first as
            they have both privacy and waste concerns.
          </strong>
        )}
      </Typography>
    </Box>
  );
};

export default TradeoffChart;
