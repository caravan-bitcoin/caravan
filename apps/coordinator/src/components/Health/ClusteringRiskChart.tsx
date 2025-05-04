import React, { useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  useTheme,
} from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import {
  ResponsiveContainer,
  Sankey,
  Tooltip as RechartsTooltip,
  Rectangle,
  Layer,
} from "recharts";

interface ClusteringRiskChartProps {
  transactions: Array<{
    txid: string;
    vin: Array<{
      prevout?: {
        scriptpubkey_address?: string;
      };
      addresses?: string[];
    }>;
    vout: Array<{
      scriptPubkeyAddress?: string;
      scriptpubkey_address?: string;
      value?: number;
    }>;
    block_time: number;
  }>;
  clusteringRiskScore: number;
}

const ClusteringRiskChart: React.FC<ClusteringRiskChartProps> = ({
  transactions,
  clusteringRiskScore,
}) => {
  const theme = useTheme();

  // Process transaction data for the Sankey diagram
  const { nodes, links, stats } = useMemo(() => {
    // Track all addresses that appear in our wallet
    const walletAddresses = new Set<string>();
    const externalAddresses = new Set<string>();

    // Helper function to get address from input or output
    const getInputAddress = (input: any): string | undefined => {
      return (
        input.prevout?.scriptpubkey_address ||
        (input.addresses && input.addresses.length > 0
          ? input.addresses[0]
          : undefined)
      );
    };

    const getOutputAddress = (output: any): string | undefined => {
      return output.scriptPubkeyAddress || output.scriptpubkey_address;
    };

    // Get all addresses that appear in our mock wallet
    transactions.forEach((tx) => {
      tx.vout.forEach((output) => {
        const address = getOutputAddress(output);
        if (address) {
          if (address.startsWith("address")) {
            walletAddresses.add(address);
          } else {
            externalAddresses.add(address);
          }
        }
      });

      tx.vin.forEach((input) => {
        const address = getInputAddress(input);
        if (address) {
          if (address.startsWith("address")) {
            walletAddresses.add(address);
          } else {
            externalAddresses.add(address);
          }
        }
      });
    });

    // Calculate clustering statistics
    const internalTxCount = transactions.filter((tx) => {
      // Check if any input and any output are both from our wallet
      return (
        tx.vin.some((input) => {
          const address = getInputAddress(input);
          return address && address.startsWith("address");
        }) &&
        tx.vout.some((output) => {
          const address = getOutputAddress(output);
          return address && address.startsWith("address");
        })
      );
    }).length;

    // Build nodes for Sankey diagram
    const nodeList = [
      // Group external inputs
      { name: "External Inputs" },

      // Add wallet addresses
      ...Array.from(walletAddresses).map((address) => ({
        name: address,
        category: "wallet",
      })),

      // Group external outputs
      { name: "External Outputs" },
    ];

    // Build links for Sankey diagram
    const linkList: Array<any> = [];

    // Add transaction flow links
    transactions.forEach((tx) => {
      tx.vin.forEach((input) => {
        const inputAddress = getInputAddress(input);
        if (!inputAddress) return;

        tx.vout.forEach((output) => {
          const outputAddress = getOutputAddress(output);
          if (!outputAddress) return;

          const sourceIdx = inputAddress.startsWith("address")
            ? nodeList.findIndex((n) => n.name === inputAddress)
            : 0; // External inputs

          const targetIdx = outputAddress.startsWith("address")
            ? nodeList.findIndex((n) => n.name === outputAddress)
            : nodeList.length - 1; // External outputs

          // Skip if source and target are the same (shouldn't happen in valid txs)
          if (sourceIdx === targetIdx) {
            return;
          }

          // Check if link already exists and increment value
          const existingLink = linkList.find(
            (l) => l.source === sourceIdx && l.target === targetIdx,
          );

          if (existingLink) {
            existingLink.value += 1;
          } else {
            linkList.push({
              source: sourceIdx,
              target: targetIdx,
              value: 1,
            });
          }
        });
      });
    });

    // Stats for display
    const stats = {
      internalTxCount,
      walletAddressCount: walletAddresses.size,
      externalAddressCount: externalAddresses.size,
      totalTxCount: transactions.length,
    };

    return {
      nodes: nodeList,
      links: linkList,
      stats,
    };
  }, [transactions]);

  // Custom Sankey node color
  const getNodeColor = (name: string) => {
    if (name === "External Inputs") return theme.palette.primary.main;
    if (name === "External Outputs") return theme.palette.secondary.main;
    return theme.palette.info.main; // Wallet addresses
  };

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="subtitle1">Transaction Flow Analysis</Typography>
        <Tooltip
          title="This visualization shows how transactions flow between your wallet addresses and external entities, helping identify patterns that might reduce privacy."
          arrow
        >
          <IconButton size="small">
            <InfoOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Paper
        variant="outlined"
        sx={{ p: 2, mb: 3, bgcolor: "background.default" }}
      >
        <Box display="flex" justifyContent="space-between" flexWrap="wrap">
          <Chip
            label={`Wallet Addresses: ${stats.walletAddressCount}`}
            size="small"
            color="primary"
            sx={{ m: 0.5 }}
          />
          <Chip
            label={`External Addresses: ${stats.externalAddressCount}`}
            size="small"
            color="secondary"
            sx={{ m: 0.5 }}
          />
          <Chip
            label={`Internal Transactions: ${stats.internalTxCount}`}
            size="small"
            color="info"
            sx={{ m: 0.5 }}
          />
          <Chip
            label={`Privacy Score: ${(clusteringRiskScore * 10).toFixed(1)}/10`}
            size="small"
            color={
              clusteringRiskScore >= 0.6
                ? "success"
                : clusteringRiskScore >= 0.4
                  ? "warning"
                  : "error"
            }
            sx={{ m: 0.5 }}
          />
        </Box>
      </Paper>

      {stats.internalTxCount > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {stats.internalTxCount} internal transaction
          {stats.internalTxCount > 1 ? "s" : ""} detected between your wallet
          addresses. This creates strong clustering evidence for blockchain
          analysts.
        </Alert>
      )}

      <Paper
        variant="outlined"
        sx={{
          height: 300,
          p: 2,
          bgcolor: theme.palette.background.default,
        }}
      >
        {nodes.length > 0 && links.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <Sankey
              data={{ nodes, links }}
              nodePadding={50}
              margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
              link={{ stroke: "#77c878" }}
              node={{
                stroke: "#111",
                strokeWidth: 1,
                fill: (node) => getNodeColor(node.name),
              }}
            >
              <Layer>
                <Rectangle />
              </Layer>
              <RechartsTooltip
                content={({ payload }) => {
                  if (!payload || !payload.length) return null;

                  const data = payload[0]?.payload || {};

                  // Format node tooltip
                  if (data.name) {
                    return (
                      <Box
                        sx={{
                          bgcolor: "background.paper",
                          p: 1,
                          border: "1px solid #ccc",
                          borderRadius: 1,
                        }}
                      >
                        <Typography variant="body2" fontWeight="bold">
                          {data.name}
                        </Typography>
                      </Box>
                    );
                  }

                  // Format link tooltip
                  if (data.source && data.target) {
                    const sourceName = nodes[data.source]?.name || "Unknown";
                    const targetName = nodes[data.target]?.name || "Unknown";

                    return (
                      <Box
                        sx={{
                          bgcolor: "background.paper",
                          p: 1,
                          border: "1px solid #ccc",
                          borderRadius: 1,
                        }}
                      >
                        <Typography variant="body2">
                          <strong>From:</strong> {sourceName}
                        </Typography>
                        <Typography variant="body2">
                          <strong>To:</strong> {targetName}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Transactions:</strong> {data.value}
                        </Typography>
                      </Box>
                    );
                  }

                  return null;
                }}
              />
            </Sankey>
          </ResponsiveContainer>
        ) : (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            height="100%"
          >
            <Typography variant="body2" color="text.secondary">
              Not enough transaction data to generate flow visualization
            </Typography>
          </Box>
        )}
      </Paper>

      <Typography variant="caption" display="block" sx={{ mt: 2 }}>
        This diagram shows the flow of transactions between addresses. Strong
        connections between your walle&apos;s addresses can make them easier to
        cluster together.
      </Typography>
    </Box>
  );
};

export default ClusteringRiskChart;
