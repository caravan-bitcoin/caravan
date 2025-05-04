import React, { useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  useTheme,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  IconButton,
} from "@mui/material";
import {
  InfoOutlined,
  AccountBalanceWalletOutlined,
  PrivacyTipOutlined,
  AccountBalanceOutlined,
} from "@mui/icons-material";
import {
  ResponsiveContainer,
  Treemap,
  Tooltip as RechartsTooltip,
} from "recharts";

interface UTXO {
  txid: string;
  vout: number;
  value: number;
  address: string;
  status: {
    confirmed: boolean;
    block_time: number;
  };
  isReused?: boolean;
  isDust?: boolean;
  privacyScore?: number;
  wasteScore?: number;
}

interface UTXOTreemapProps {
  utxos: Record<string, UTXO[]>;
  dustLimits: {
    lowerLimit: number;
    upperLimit: number;
  };
  addressReuseData: Record<string, Array<{ txid: string; time: number }>>;
  onSelectUTXO?: (utxo: UTXO) => void;
}

// Visualization color modes
type ColorMode = "balance" | "privacy" | "waste";

const UTXOTreemap: React.FC<UTXOTreemapProps> = ({
  utxos,
  dustLimits,
  addressReuseData,
  onSelectUTXO,
}) => {
  const theme = useTheme();
  const [colorMode, setColorMode] = React.useState<ColorMode>("balance");

  // Process UTXOs for treemap visualization
  const treemapData = useMemo(() => {
    // Flatten and process UTXOs
    const processedUtxos = Object.entries(utxos).flatMap(
      ([address, addressUtxos]) => {
        return addressUtxos.map((utxo) => {
          // Calculate if this address is reused
          const isReused = addressReuseData[address]?.length > 1 || false;

          // Calculate if this is a dust UTXO
          const valueSats = Math.round(utxo.value * 100000000);
          const isDust = valueSats <= dustLimits.lowerLimit;
          const isAtRisk = !isDust && valueSats <= dustLimits.upperLimit;

          // Calculate privacy score (0-1)
          // Lower score if address is reused
          const privacyScore = isReused ? 0.3 : 0.9;

          // Calculate waste score (0-1)
          // Lower score if it's dust or at risk
          const wasteScore = isDust ? 0.1 : isAtRisk ? 0.4 : 0.9;

          return {
            ...utxo,
            address,
            name: `${utxo.txid.substring(0, 6)}...${utxo.txid.substring(
              utxo.txid.length - 6,
            )}:${utxo.vout}`,
            size: utxo.value, // Size of rectangle is based on UTXO value
            valueSats,
            isReused,
            isDust,
            isAtRisk,
            privacyScore,
            wasteScore,
          };
        });
      },
    );

    // Group by colorMode criteria
    const getGroupedData = () => {
      if (colorMode === "balance") {
        // Group by value ranges for balance mode
        const valueRanges = [
          {
            name: "Dust (≤ 546 sats)",
            min: 0,
            max: 546,
            color: theme.palette.error.light,
          },
          {
            name: "At Risk",
            min: 547,
            max: dustLimits.upperLimit,
            color: theme.palette.warning.light,
          },
          {
            name: "Small",
            min: dustLimits.upperLimit + 1,
            max: 50000,
            color: theme.palette.info.light,
          },
          {
            name: "Medium",
            min: 50001,
            max: 500000,
            color: theme.palette.primary.light,
          },
          {
            name: "Large",
            min: 500001,
            max: Infinity,
            color: theme.palette.success.light,
          },
        ];

        return valueRanges
          .map((range) => ({
            name: range.name,
            color: range.color,
            children: processedUtxos
              .filter(
                (utxo) =>
                  utxo.valueSats >= range.min && utxo.valueSats <= range.max,
              )
              .map((utxo) => ({
                ...utxo,
                value: utxo.value, // For tooltip
                color: range.color,
              })),
          }))
          .filter((group) => group.children.length > 0);
      } else if (colorMode === "privacy") {
        // Group by privacy scores
        const reused = {
          name: "Address Reused",
          color: theme.palette.error.main,
          children: processedUtxos
            .filter((utxo) => utxo.isReused)
            .map((utxo) => ({
              ...utxo,
              value: utxo.value,
              color: theme.palette.error.main,
            })),
        };

        const notReused = {
          name: "Single-Use Address",
          color: theme.palette.success.main,
          children: processedUtxos
            .filter((utxo) => !utxo.isReused)
            .map((utxo) => ({
              ...utxo,
              value: utxo.value,
              color: theme.palette.success.main,
            })),
        };

        return [reused, notReused].filter((group) => group.children.length > 0);
      } else {
        // waste mode
        // Group by waste categories
        const dust = {
          name: "Dust UTXOs",
          color: theme.palette.error.main,
          children: processedUtxos
            .filter((utxo) => utxo.isDust)
            .map((utxo) => ({
              ...utxo,
              value: utxo.value,
              color: theme.palette.error.main,
            })),
        };

        const atRisk = {
          name: "At-Risk UTXOs",
          color: theme.palette.warning.main,
          children: processedUtxos
            .filter((utxo) => utxo.isAtRisk)
            .map((utxo) => ({
              ...utxo,
              value: utxo.value,
              color: theme.palette.warning.main,
            })),
        };

        const healthy = {
          name: "Healthy UTXOs",
          color: theme.palette.success.main,
          children: processedUtxos
            .filter((utxo) => !utxo.isDust && !utxo.isAtRisk)
            .map((utxo) => ({
              ...utxo,
              value: utxo.value,
              color: theme.palette.success.main,
            })),
        };

        return [dust, atRisk, healthy].filter(
          (group) => group.children.length > 0,
        );
      }
    };

    return [
      {
        name: "UTXOs",
        children: getGroupedData(),
      },
    ];
  }, [utxos, colorMode, dustLimits, addressReuseData, theme.palette]);

  // Format satoshis to BTC
  const formatSats = (sats: number) => {
    return (sats / 100000000).toFixed(8);
  };

  // Custom treemap cell content
  const CustomTreemapContent = (props: any) => {
    const { x, y, width, height, name, depth, index, utxo } = props;

    // Only render text if rectangle is big enough
    const shouldRenderText = width > 50 && height > 20;

    // Don't render the root node
    if (depth === 0) return null;

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={props.fill || props.color}
          stroke="#fff"
          strokeWidth={2}
          style={{ cursor: "pointer" }}
          onClick={() => onSelectUTXO && utxo && onSelectUTXO(utxo)}
        />
        {shouldRenderText && (
          <text
            x={x + width / 2}
            y={y + height / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#fff"
            fontSize={12}
            fontWeight="bold"
            style={{ pointerEvents: "none" }}
          >
            {name}
          </text>
        )}
      </g>
    );
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;

      // Don't show tooltip for parent nodes
      if (!data.txid) return null;

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
            <strong>TxID:</strong> {data.txid.substring(0, 8)}...
            {data.txid.substring(data.txid.length - 8)}
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            <strong>Index:</strong> {data.vout}
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            <strong>Value:</strong> {formatSats(data.valueSats)} BTC
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            <strong>Address:</strong> {data.address.substring(0, 8)}...
            {data.address.substring(data.address.length - 8)}
          </Typography>

          <Box display="flex" mt={1} gap={1}>
            <Chip
              size="small"
              color={data.isReused ? "error" : "success"}
              label={data.isReused ? "Address Reused" : "Single-Use Address"}
              icon={<PrivacyTipOutlined />}
            />
            <Chip
              size="small"
              color={
                data.isDust ? "error" : data.isAtRisk ? "warning" : "success"
              }
              label={
                data.isDust ? "Dust" : data.isAtRisk ? "At Risk" : "Healthy"
              }
              icon={<AccountBalanceOutlined />}
            />
          </Box>
        </Paper>
      );
    }
    return null;
  };

  const handleModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newMode: ColorMode | null,
  ) => {
    if (newMode !== null) {
      setColorMode(newMode);
    }
  };

  const totalUtxoCount = useMemo(() => {
    return Object.values(utxos).reduce(
      (sum, addressUtxos) => sum + addressUtxos.length,
      0,
    );
  }, [utxos]);

  const totalBalance = useMemo(() => {
    return Object.values(utxos).reduce((sum, addressUtxos) => {
      return (
        sum + addressUtxos.reduce((addrSum, utxo) => addrSum + utxo.value, 0)
      );
    }, 0);
  }, [utxos]);

  return (
    <Box sx={{ height: "100%", width: "100%" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6">UTXO Visualization</Typography>
        <Tooltip
          title="This treemap shows your UTXOs proportionally sized by their value. Use the toggle buttons to color them by different metrics."
          arrow
        >
          <IconButton size="small">
            <InfoOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="subtitle2" component="span" sx={{ mr: 1 }}>
            Color by:
          </Typography>
          <ToggleButtonGroup
            value={colorMode}
            exclusive
            onChange={handleModeChange}
            size="small"
          >
            <ToggleButton value="balance">
              <AccountBalanceWalletOutlined sx={{ mr: 0.5 }} />
              Balance
            </ToggleButton>
            <ToggleButton value="privacy">
              <PrivacyTipOutlined sx={{ mr: 0.5 }} />
              Privacy
            </ToggleButton>
            <ToggleButton value="waste">
              <AccountBalanceOutlined sx={{ mr: 0.5 }} />
              Waste
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <Box>
          <Chip
            label={`${totalUtxoCount} UTXOs`}
            color="primary"
            size="small"
            sx={{ mr: 1 }}
          />
          <Chip
            label={`${totalBalance.toFixed(8)} BTC`}
            color="secondary"
            size="small"
          />
        </Box>
      </Box>

      <Paper
        variant="outlined"
        sx={{
          height: 500,
          p: 2,
          mb: 2,
          bgcolor: theme.palette.background.paper,
        }}
      >
        {treemapData[0].children.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={treemapData}
              dataKey="size"
              ratio={4 / 3}
              stroke="#fff"
              content={<CustomTreemapContent />}
            >
              <RechartsTooltip content={<CustomTooltip />} />
            </Treemap>
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

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Visualization Legend
        </Typography>
        <Box display="flex" flexWrap="wrap" gap={1}>
          {colorMode === "balance" && (
            <>
              <Chip
                size="small"
                sx={{ bgcolor: theme.palette.error.light }}
                label="Dust (≤546 sats)"
              />
              <Chip
                size="small"
                sx={{ bgcolor: theme.palette.warning.light }}
                label="At Risk"
              />
              <Chip
                size="small"
                sx={{ bgcolor: theme.palette.info.light }}
                label="Small"
              />
              <Chip
                size="small"
                sx={{ bgcolor: theme.palette.primary.light }}
                label="Medium"
              />
              <Chip
                size="small"
                sx={{ bgcolor: theme.palette.success.light }}
                label="Large"
              />
            </>
          )}
          {colorMode === "privacy" && (
            <>
              <Chip
                size="small"
                sx={{ bgcolor: theme.palette.error.main }}
                label="Address Reused"
              />
              <Chip
                size="small"
                sx={{ bgcolor: theme.palette.success.main }}
                label="Single-Use Address"
              />
            </>
          )}
          {colorMode === "waste" && (
            <>
              <Chip
                size="small"
                sx={{ bgcolor: theme.palette.error.main }}
                label="Dust UTXOs"
              />
              <Chip
                size="small"
                sx={{ bgcolor: theme.palette.warning.main }}
                label="At-Risk UTXOs"
              />
              <Chip
                size="small"
                sx={{ bgcolor: theme.palette.success.main }}
                label="Healthy UTXOs"
              />
            </>
          )}
        </Box>
        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
          Click on any UTXO to view more details. Rectangle size represents UTXO
          value.
        </Typography>
      </Box>
    </Box>
  );
};

export default UTXOTreemap;
