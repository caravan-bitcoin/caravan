import React from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Divider,
  Chip,
  Card,
  CardContent,
  LinearProgress,
  Tooltip,
  IconButton,
  Button,
} from "@mui/material";
import {
  InfoOutlined,
  AccountBalanceWalletOutlined,
  PrivacyTipOutlined,
  WarningAmberOutlined,
  CalendarMonthOutlined,
  CloseOutlined,
} from "@mui/icons-material";

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
  isAtRisk?: boolean;
  privacyScore?: number;
  wasteScore?: number;
}

interface UTXODetailsProps {
  utxo: UTXO | null;
  onClose: () => void;
}

const UTXODetails: React.FC<UTXODetailsProps> = ({ utxo, onClose }) => {
  if (!utxo) return null;

  // Format satoshis to BTC
  const formatSats = (sats: number) => {
    return (sats / 100000000).toFixed(8);
  };

  // Calculate value in satoshis
  const valueSats = Math.round(utxo.value * 100000000);

  // Format timestamp to date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  // Get color for scores
  const getScoreColor = (score: number) => {
    if (score >= 0.8) return "success";
    if (score >= 0.5) return "warning";
    return "error";
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3, position: "relative" }}>
      <IconButton
        sx={{ position: "absolute", top: 8, right: 8 }}
        onClick={onClose}
      >
        <CloseOutlined />
      </IconButton>

      <Typography variant="h5" gutterBottom>
        UTXO Details
      </Typography>

      <Grid container spacing={3}>
        {/* Basic Information */}
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <AccountBalanceWalletOutlined
                  sx={{ mr: 1, verticalAlign: "bottom" }}
                />
                Basic Information
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Transaction ID
                  </Typography>
                  <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
                    {utxo.txid}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Output Index
                  </Typography>
                  <Typography variant="body2">{utxo.vout}</Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Address
                  </Typography>
                  <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
                    {utxo.address}
                  </Typography>
                  {utxo.isReused && (
                    <Chip
                      size="small"
                      color="error"
                      label="Address Reused"
                      sx={{ mt: 1 }}
                    />
                  )}
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Value
                  </Typography>
                  <Typography variant="h5" color="primary.main">
                    {formatSats(valueSats)} BTC
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {valueSats.toLocaleString()} satoshis
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    <CalendarMonthOutlined
                      sx={{ fontSize: 14, mr: 0.5, verticalAlign: "text-top" }}
                    />
                    Creation Date
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(utxo.status.block_time)}
                  </Typography>
                  <Chip
                    size="small"
                    color={utxo.status.confirmed ? "success" : "warning"}
                    label={utxo.status.confirmed ? "Confirmed" : "Unconfirmed"}
                    sx={{ mt: 1 }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Health Metrics */}
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <WarningAmberOutlined sx={{ mr: 1, verticalAlign: "bottom" }} />
                Health Metrics
              </Typography>

              <Grid container spacing={3}>
                {/* Waste Score */}
                <Grid item xs={12} sm={6}>
                  <Box mb={1}>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography variant="subtitle2">Waste Score</Typography>
                      <Tooltip title="Indicates how economical this UTXO is to spend based on its size and the current fee rate">
                        <IconButton size="small">
                          <InfoOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>

                    <LinearProgress
                      variant="determinate"
                      value={(utxo.wasteScore || 0) * 100}
                      color={getScoreColor(utxo.wasteScore || 0)}
                      sx={{ height: 10, borderRadius: 5, mb: 1 }}
                    />

                    {utxo.isDust ? (
                      <Box>
                        <Chip
                          size="small"
                          color="error"
                          label="Dust UTXO"
                          sx={{ mr: 1 }}
                        />
                        <Typography variant="caption" color="error.main">
                          This UTXO would cost more in fees to spend than its
                          value
                        </Typography>
                      </Box>
                    ) : utxo.isAtRisk ? (
                      <Box>
                        <Chip
                          size="small"
                          color="warning"
                          label="At-Risk UTXO"
                          sx={{ mr: 1 }}
                        />
                        <Typography variant="caption" color="warning.main">
                          This UTXO may cost a significant portion of its value
                          in fees to spend
                        </Typography>
                      </Box>
                    ) : (
                      <Box>
                        <Chip
                          size="small"
                          color="success"
                          label="Healthy UTXO"
                          sx={{ mr: 1 }}
                        />
                        <Typography variant="caption" color="success.main">
                          This UTXO is economical to spend
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Grid>

                {/* Privacy Score */}
                <Grid item xs={12} sm={6}>
                  <Box mb={1}>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography variant="subtitle2">Privacy Score</Typography>
                      <Tooltip title="Indicates how private this UTXO is based on address reuse and other factors">
                        <IconButton size="small">
                          <InfoOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>

                    <LinearProgress
                      variant="determinate"
                      value={(utxo.privacyScore || 0) * 100}
                      color={getScoreColor(utxo.privacyScore || 0)}
                      sx={{ height: 10, borderRadius: 5, mb: 1 }}
                    />

                    {utxo.isReused ? (
                      <Box>
                        <Chip
                          size="small"
                          color="error"
                          label="Privacy Concern"
                          sx={{ mr: 1 }}
                        />
                        <Typography variant="caption" color="error.main">
                          This UTXO uses an address that has been reused,
                          reducing privacy
                        </Typography>
                      </Box>
                    ) : (
                      <Box>
                        <Chip
                          size="small"
                          color="success"
                          label="Good Privacy"
                          sx={{ mr: 1 }}
                        />
                        <Typography variant="caption" color="success.main">
                          This UTXO uses a fresh address, enhancing privacy
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Grid>
              </Grid>

              {/* Recommendations */}
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" gutterBottom>
                <PrivacyTipOutlined
                  sx={{ mr: 1, verticalAlign: "text-bottom" }}
                />
                Recommendations
              </Typography>

              <Box>
                {utxo.isDust && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    • Consider consolidating this dust UTXO during low fee
                    periods
                  </Typography>
                )}

                {utxo.isAtRisk && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    • Monitor fee rates before spending this UTXO to ensure
                    cost-effectiveness
                  </Typography>
                )}

                {utxo.isReused && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    • Spend this UTXO to improve your wallet's overall privacy
                    posture
                  </Typography>
                )}

                {!utxo.isDust && !utxo.isAtRisk && !utxo.isReused && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    • This is a healthy UTXO with good privacy characteristics
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box display="flex" justifyContent="flex-end" mt={3}>
        <Button
          variant="outlined"
          onClick={onClose}
          startIcon={<CloseOutlined />}
        >
          Close Details
        </Button>
      </Box>
    </Paper>
  );
};

export default UTXODetails;
