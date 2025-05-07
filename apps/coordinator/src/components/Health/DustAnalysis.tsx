import React, { useMemo } from "react";
import { WasteMetrics } from "@caravan/health";
import { MultisigAddressType } from "@caravan/bitcoin";
import {
  Box,
  Typography,
  Tooltip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Divider,
  LinearProgress,
  Badge,
} from "@mui/material";
import {
  InfoOutlined,
  ArrowDownward,
  Warning,
  CheckCircle,
} from "@mui/icons-material";

interface DustAnalysisProps {
  currentFeeRate: number;
  walletType: MultisigAddressType;
  quorum: {
    requiredSignerCount: number;
    totalSignerCount: number;
  };
  wasteMetrics: WasteMetrics | null;
  utxos: any; // UTXO type
}

const DustAnalysis: React.FC<DustAnalysisProps> = ({
  currentFeeRate,
  walletType,
  quorum,
  wasteMetrics,
  utxos,
}) => {
  // Calculate dust limits using WasteMetrics
  const dustLimits = useMemo(() => {
    if (!wasteMetrics) {
      return { lowerLimit: 546, upperLimit: 1092 }; // Default values
    }

    // If we have the metrics instance, calculate actual dust limits
    const tempWasteMetrics = new WasteMetrics(); // Create a temporary instance for the calculation
    return tempWasteMetrics.calculateDustLimits(
      currentFeeRate,
      walletType,
      {
        requiredSignerCount: quorum.requiredSignerCount,
        totalSignerCount: quorum.totalSignerCount,
      },
      2, // Risk multiplier
    );
  }, [currentFeeRate, walletType, quorum, wasteMetrics]);

  // Analyze UTXOs
  const { dustUtxos, riskUtxos, safeUtxos, totalUtxos } = useMemo(() => {
    const analysis = {
      dustUtxos: [] as any[],
      riskUtxos: [] as any[],
      safeUtxos: [] as any[],
      totalUtxos: 0,
    };

    if (!utxos) return analysis;

    // Flatten UTXOs from all addresses
    const allUtxos: any[] = [];

    Object.keys(utxos).forEach((address) => {
      utxos[address].forEach((utxo: any) => {
        allUtxos.push({
          ...utxo,
          address,
          valueSats: Math.round(utxo.value * 100000000), // Convert to satoshis
        });
      });
    });

    analysis.totalUtxos = allUtxos.length;

    // Categorize UTXOs based on dust limits
    allUtxos.forEach((utxo) => {
      if (utxo.valueSats <= dustLimits.lowerLimit) {
        analysis.dustUtxos.push(utxo);
      } else if (utxo.valueSats <= dustLimits.upperLimit) {
        analysis.riskUtxos.push(utxo);
      } else {
        analysis.safeUtxos.push(utxo);
      }
    });

    return analysis;
  }, [utxos, dustLimits]);

  // Format satoshis to BTC
  const formatSats = (sats: number) => {
    return (sats / 100000000).toFixed(8);
  };

  return (
    <Box sx={{ height: "100%" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="subtitle1">
          Current Fee Rate: {currentFeeRate} sat/vB
        </Typography>
        <Tooltip
          title="Dust UTXOs cost more in fees to spend than they're worth."
          arrow
        >
          <IconButton size="small">
            <InfoOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Paper sx={{ p: 2, mb: 2, bgcolor: "background.default" }}>
        <Typography variant="subtitle2">Dust Thresholds:</Typography>
        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
          <Typography variant="body2">
            Lower Limit: {dustLimits.lowerLimit} sats (
            {formatSats(dustLimits.lowerLimit)} BTC)
          </Typography>
          <Typography variant="body2">
            Upper Limit: {dustLimits.upperLimit} sats (
            {formatSats(dustLimits.upperLimit)} BTC)
          </Typography>
        </Box>
      </Paper>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          UTXO Classification
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
          <Badge badgeContent={dustUtxos.length} color="error" sx={{ mr: 1 }}>
            <Warning color="error" />
          </Badge>
          <Typography variant="body2" color="error">
            {`Dust UTXOs (<= ${dustLimits.lowerLimit} sats)`}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
          <Badge badgeContent={riskUtxos.length} color="warning" sx={{ mr: 1 }}>
            <Warning color="warning" />
          </Badge>
          <Typography variant="body2" color="warning.main">
            At-Risk UTXOs ({dustLimits.lowerLimit} - {dustLimits.upperLimit}{" "}
            sats)
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Badge badgeContent={safeUtxos.length} color="success" sx={{ mr: 1 }}>
            <CheckCircle color="success" />
          </Badge>
          <Typography variant="body2" color="success.main">
            {`Safe UTXOs (> ${dustLimits.upperLimit} sats)`}
          </Typography>
        </Box>

        <Box sx={{ mt: 2, width: "100%" }}>
          <LinearProgress
            variant="determinate"
            value={(safeUtxos.length / Math.max(totalUtxos, 1)) * 100}
            color="success"
            sx={{ height: 10, borderRadius: 5 }}
          />
          <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
            {((safeUtxos.length / Math.max(totalUtxos, 1)) * 100).toFixed(0)}%
            of UTXOs are safe
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {dustUtxos.length > 0 && (
        <Box>
          <Typography variant="subtitle1" gutterBottom color="error">
            Dust UTXOs to Consolidate
          </Typography>
          <List dense sx={{ maxHeight: 150, overflow: "auto" }}>
            {dustUtxos.slice(0, 5).map((utxo) => (
              <ListItem key={`${utxo.txid}-${utxo.vout}`} disablePadding>
                <ListItemIcon sx={{ minWidth: 30 }}>
                  <ArrowDownward color="error" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={`${utxo.valueSats} sats (${formatSats(utxo.valueSats)} BTC)`}
                  secondary={`${utxo.txid.substring(0, 8)}...${utxo.txid.substring(utxo.txid.length - 8)}`}
                  primaryTypographyProps={{ variant: "body2" }}
                  secondaryTypographyProps={{ variant: "caption" }}
                />
              </ListItem>
            ))}
            {dustUtxos.length > 5 && (
              <Typography variant="caption" sx={{ pl: 4 }}>
                ...and {dustUtxos.length - 5} more
              </Typography>
            )}
          </List>
        </Box>
      )}

      {dustUtxos.length === 0 && (
        <Box textAlign="center" p={2}>
          <CheckCircle color="success" fontSize="large" />
          <Typography variant="body2" color="success.main" mt={1}>
            Great! No dust UTXOs detected.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default DustAnalysis;
