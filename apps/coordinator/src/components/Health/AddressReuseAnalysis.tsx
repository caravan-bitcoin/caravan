import React, { useMemo } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  Tooltip,
  Alert,
} from "@mui/material";
import { CheckCircle, Warning, Error, InfoOutlined } from "@mui/icons-material";

interface AddressReuseAnalysisProps {
  addressHistory: Record<string, Array<{ txid: string; time: number }>>;
  addressReuseScore: number;
}

const AddressReuseAnalysis: React.FC<AddressReuseAnalysisProps> = ({
  addressHistory,
  addressReuseScore,
}) => {
  const addressAnalysisData = useMemo(() => {
    // Process address history to categorize addresses by reuse level
    return Object.entries(addressHistory).map(([address, transactions]) => {
      const txCount = transactions.length;
      let riskLevel: "low" | "medium" | "high" = "low";

      if (txCount > 5) {
        riskLevel = "high";
      } else if (txCount > 2) {
        riskLevel = "medium";
      }

      const lastUsedDate = new Date(
        Math.max(...transactions.map((tx) => tx.time * 1000)),
      );

      return {
        address,
        txCount,
        riskLevel,
        lastUsedDate,
        // Truncate address for display
        displayAddress: `${address.substring(0, 8)}...${address.substring(address.length - 8)}`,
      };
    });
  }, [addressHistory]);

  // Summary stats
  const { totalAddresses, reusedAddresses, highRiskAddresses } = useMemo(() => {
    return {
      totalAddresses: addressAnalysisData.length,
      reusedAddresses: addressAnalysisData.filter((a) => a.txCount > 1).length,
      highRiskAddresses: addressAnalysisData.filter(
        (a) => a.riskLevel === "high",
      ).length,
    };
  }, [addressAnalysisData]);

  const reusedAddressPercentage = totalAddresses
    ? (reusedAddresses / totalAddresses) * 100
    : 0;

  // Get risk color
  const getRiskColor = (riskLevel: "low" | "medium" | "high") => {
    switch (riskLevel) {
      case "low":
        return "success";
      case "medium":
        return "warning";
      case "high":
        return "error";
      default:
        return "default";
    }
  };

  // Get risk icon
  const getRiskIcon = (riskLevel: "low" | "medium" | "high") => {
    switch (riskLevel) {
      case "low":
        return <CheckCircle color="success" fontSize="small" />;
      case "medium":
        return <Warning color="warning" fontSize="small" />;
      case "high":
        return <Error color="error" fontSize="small" />;
      default:
        return <InfoOutlined fontSize="small" />;
    }
  };

  return (
    <Box>
      <Box mb={3}>
        <Typography variant="subtitle1" gutterBottom>
          Address Reuse Summary
        </Typography>

        <Box display="flex" alignItems="center" mb={2}>
          <Box flexGrow={1} mr={2}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {reusedAddresses} out of {totalAddresses} addresses reused (
              {reusedAddressPercentage.toFixed(1)}%)
            </Typography>
            <LinearProgress
              variant="determinate"
              value={addressReuseScore * 100}
              sx={{
                height: 10,
                borderRadius: 5,
                backgroundColor: "#e0e0e0",
                "& .MuiLinearProgress-bar": {
                  borderRadius: 5,
                  backgroundColor:
                    addressReuseScore >= 0.6
                      ? "#4caf50"
                      : addressReuseScore >= 0.4
                        ? "#ffeb3b"
                        : "#f44336",
                },
              }}
            />
          </Box>

          <Tooltip
            title="Address reuse score is based on the percentage of addresses with more than one transaction. Higher is better."
            arrow
          >
            <Box
              sx={{
                width: 50,
                height: 50,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor:
                  addressReuseScore >= 0.6
                    ? "#4caf50"
                    : addressReuseScore >= 0.4
                      ? "#ffeb3b"
                      : "#f44336",
                color: "white",
                fontWeight: "bold",
              }}
            >
              {(addressReuseScore * 10).toFixed(0)}
            </Box>
          </Tooltip>
        </Box>

        {highRiskAddresses > 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {highRiskAddresses} address{highRiskAddresses > 1 ? "es" : ""} with
            high reuse detected. Consider consolidating these funds with a
            privacy-focused transaction.
          </Alert>
        )}
      </Box>

      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ maxHeight: 300, overflow: "auto" }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Address</TableCell>
              <TableCell align="center">Tx Count</TableCell>
              <TableCell align="center">Reuse Risk</TableCell>
              <TableCell>Last Used</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {addressAnalysisData.map((addressData) => (
              <TableRow key={addressData.address}>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    {addressData.displayAddress}
                  </Typography>
                </TableCell>
                <TableCell align="center">{addressData.txCount}</TableCell>
                <TableCell align="center">
                  <Chip
                    icon={getRiskIcon(addressData.riskLevel)}
                    label={
                      addressData.riskLevel.charAt(0).toUpperCase() +
                      addressData.riskLevel.slice(1)
                    }
                    color={getRiskColor(addressData.riskLevel)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {addressData.lastUsedDate.toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="caption" display="block" sx={{ mt: 2 }}>
        Best practice: Each address should only be used once for receiving
        funds. Multiple transactions to the same address reduce your privacy.
      </Typography>
    </Box>
  );
};

export default AddressReuseAnalysis;
