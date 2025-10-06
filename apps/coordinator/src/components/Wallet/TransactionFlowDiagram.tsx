import React, { useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Chip,
  Tooltip,
  useTheme,
  Button,
  IconButton,
} from "@mui/material";
import {
  ArrowForward,
  CallMade,
  Savings,
  LocalGasStation,
  AccountBalanceWallet,
  ExpandMore,
  ExpandLess,
  OpenInNew,
  ContentCopy,
} from "@mui/icons-material";
import BigNumber from "bignumber.js";
import { satoshisToBitcoins, blockExplorerTransactionURL, Network } from "@caravan/bitcoin";
import DustChip from "../ScriptExplorer/DustChip";

interface TransactionFlowDiagramProps {
  inputs: Array<{
    txid: string;
    index: number;
    amountSats: string;
    multisig?: {
      name?: string;
    };
  }>;
  outputs: Array<{
    address: string;
    amount: string; // in BTC
    scriptType?: string;
  }>;
  fee: string; // in BTC
  changeAddress?: string;
  inputsTotalSats: any;
  network?: string;
}

const TransactionFlowDiagram: React.FC<TransactionFlowDiagramProps> = ({
  inputs,
  outputs,
  fee,
  changeAddress,
  inputsTotalSats,
  network = "mainnet",
}) => {
  const theme = useTheme();
  const [showAllInputs, setShowAllInputs] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  // Calculate totals and categorize outputs
  const flowData = useMemo(() => {
    const totalInputSats = BigNumber(inputsTotalSats.toString());
    const totalInputBtc = BigNumber(satoshisToBitcoins(totalInputSats.toString()));
    const feeBtc = BigNumber(fee);
    const totalOutputBtc = outputs.reduce(
      (sum, output) => sum.plus(BigNumber(output.amount)),
      BigNumber(0),
    );

    // Categorize outputs
    const categorizedOutputs = outputs.map((output) => {
      const isChange = output.address === changeAddress;
      return {
        ...output,
        isChange,
        type: isChange ? "change" : "recipient",
      };
    });

    const recipientOutputs = categorizedOutputs.filter((o) => !o.isChange);
    const changeOutputs = categorizedOutputs.filter((o) => o.isChange);

    return {
      totalInputBtc,
      totalInputSats,
      totalOutputBtc,
      feeBtc,
      recipientOutputs,
      changeOutputs,
      inputCount: inputs.length,
      outputCount: outputs.length,
    };
  }, [inputs, outputs, fee, changeAddress, inputsTotalSats]);

  // Get script type color
  const getScriptTypeColor = (scriptType?: string) => {
    switch (scriptType?.toLowerCase()) {
      case "p2wsh":
        return theme.palette.success.main;
      case "p2sh-p2wsh":
      case "p2sh_p2wsh":
        return theme.palette.info.main;
      case "p2sh":
        return theme.palette.warning.main;
      case "p2wpkh":
        return theme.palette.success.light;
      case "p2pkh":
        return theme.palette.warning.light;
      default:
        return theme.palette.grey[500];
    }
  };

  // Format script type for display
  const formatScriptType = (scriptType?: string) => {
    if (!scriptType) return "Unknown";
    return scriptType.toUpperCase().replace("_", "-");
  };

  // Format address for display (truncate middle)
  const formatAddress = (address: string) => {
    if (address.length <= 20) return address;
    return `${address.slice(0, 10)}...${address.slice(-8)}`;
  };

  // Calculate visual heights based on proportions
  const getHeightPercentage = (amount: BigNumber) => {
    const percentage = amount
      .dividedBy(flowData.totalInputBtc)
      .multipliedBy(100)
      .toNumber();
    return Math.max(percentage, 5); // Minimum 5% height for visibility
  };

  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        background: "linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%)",
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <Box display="flex" alignItems="center" mb={3}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 600,
            color: theme.palette.primary.main,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <AccountBalanceWallet />
          Transaction Flow
        </Typography>
      </Box>

      {/* Main Flow Visualization */}
      <Box
        sx={{
          position: "relative",
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          justifyContent: "space-between",
          alignItems: "stretch",
          minHeight: { xs: "auto", md: 400 },
          gap: { xs: 3, md: 4 },
          width: "100%",
        }}
      >
        {/* INPUTS Column */}
        <Box
          sx={{
            flex: { xs: "1", md: "0 0 28%" },
            width: { xs: "100%", md: "auto" },
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            alignSelf: "flex-start",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 1,
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 600, color: theme.palette.text.secondary }}
            >
              Inputs ({flowData.inputCount})
            </Typography>
            <Chip
              label={`${flowData.totalInputBtc.toFixed(8)} BTC`}
              size="small"
              sx={{
                fontWeight: 600,
                backgroundColor: theme.palette.primary.main,
                color: "#fff",
              }}
            />
          </Box>

          <Box
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
              borderRadius: 2,
              p: 2.5,
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              boxShadow: `0 8px 24px ${theme.palette.primary.main}40`,
              position: "relative",
              overflow: "hidden",
              "&::before": {
                content: '""',
                position: "absolute",
                top: 0,
                right: 0,
                width: "100%",
                height: "100%",
                background:
                  "radial-gradient(circle at top right, rgba(255,255,255,0.2) 0%, transparent 60%)",
                pointerEvents: "none",
              },
            }}
          >
            {inputs.slice(0, showAllInputs ? inputs.length : 3).map((input, idx) => {
              const inputAmount = BigNumber(
                satoshisToBitcoins(input.amountSats.toString())
              );
              const scriptType =
                input.multisig?.name?.includes("p2wsh")
                  ? "P2WSH"
                  : input.multisig?.name?.includes("p2sh")
                    ? "P2SH"
                    : "Unknown";

              return (
                <Box
                  key={`${input.txid}-${input.index}`}
                  sx={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    borderRadius: 1.5,
                    p: 1.5,
                    position: "relative",
                    zIndex: 1,
                    transition: "transform 0.2s ease",
                    "&:hover": {
                      transform: "translateX(4px)",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    },
                  }}
                >
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    mb={0.5}
                  >
                    <Box display="flex" alignItems="center" gap={0.5} flex={1}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: theme.palette.text.secondary,
                          fontWeight: 500,
                          fontFamily: "monospace",
                          fontSize: "0.7rem",
                        }}
                      >
                        {formatAddress(input.txid)}:{input.index}
                      </Typography>
                      <IconButton
                        size="small"
                        href={blockExplorerTransactionURL(input.txid, network as Network)}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          padding: 0.25,
                          "& svg": { fontSize: "0.875rem" },
                        }}
                      >
                        <OpenInNew fontSize="inherit" />
                      </IconButton>
                    </Box>
                    <Chip
                      label={scriptType}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: "0.65rem",
                        backgroundColor: getScriptTypeColor(scriptType),
                        color: "#fff",
                        fontWeight: 600,
                      }}
                    />
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        color: theme.palette.primary.main,
                      }}
                    >
                      {inputAmount.toFixed(8)} BTC
                    </Typography>
                    <Box sx={{ "& .MuiChip-root": { height: 22, fontSize: "0.7rem" } }}>
                      <DustChip
                        amountSats={parseInt(input.amountSats)}
                        scriptType={input.multisig?.name}
                      />
                    </Box>
                  </Box>
                </Box>
              );
            })}

            {inputs.length > 3 && (
              <Button
                onClick={() => setShowAllInputs(!showAllInputs)}
                sx={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  borderRadius: 1.5,
                  p: 1.5,
                  textAlign: "center",
                  position: "relative",
                  zIndex: 1,
                  width: "100%",
                  textTransform: "none",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 1)",
                    transform: "translateX(4px)",
                  },
                }}
              >
                <Box display="flex" alignItems="center" gap={1} justifyContent="center">
                  {showAllInputs ? <ExpandLess /> : <ExpandMore />}
                  <Typography
                    variant="body2"
                    sx={{
                      color: theme.palette.text.secondary,
                      fontWeight: 600,
                    }}
                  >
                    {showAllInputs 
                      ? "Show less" 
                      : `+${inputs.length - 3} more input${inputs.length - 3 > 1 ? "s" : ""}`}
                  </Typography>
                </Box>
              </Button>
            )}
          </Box>
        </Box>

        {/* Mobile Flow Indicator */}
        <Box
          sx={{
            display: { xs: "flex", md: "none" },
            justifyContent: "center",
            alignItems: "center",
            py: 2,
          }}
        >
          <ArrowForward
            sx={{
              fontSize: 48,
              color: theme.palette.primary.main,
              transform: "rotate(90deg)",
            }}
          />
        </Box>

        {/* FLOW Arrow - Simple and Clean */}
        <Box
          sx={{
            flex: { xs: "0", md: "0 0 8%" },
            display: { xs: "none", md: "flex" },
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <ArrowForward
            sx={{
              fontSize: 64,
              color: theme.palette.primary.main,
              opacity: 0.25,
            }}
          />
        </Box>

        {/* OUTPUTS Column */}
        <Box
          sx={{
            flex: { xs: "1", md: "0 0 28%" },
            width: { xs: "100%", md: "auto" },
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            alignSelf: "flex-start",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 1,
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 600, color: theme.palette.text.secondary }}
            >
              Outputs ({flowData.outputCount})
            </Typography>
          </Box>

          {/* Recipient Outputs */}
          {flowData.recipientOutputs.map((output, idx) => {
            const amount = BigNumber(output.amount);
            return (
              <Box key={`recipient-${idx}`}>
                <Box
                  sx={{
                    background: `linear-gradient(135deg, #ea9c0d 0%, #f4b942 100%)`,
                    borderRadius: 2,
                    p: 2.5,
                    position: "relative",
                    overflow: "hidden",
                    boxShadow: "0 8px 24px rgba(234, 156, 13, 0.3)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      transform: "translateX(-4px)",
                      boxShadow: "0 12px 32px rgba(234, 156, 13, 0.4)",
                    },
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      background:
                        "radial-gradient(circle at top left, rgba(255,255,255,0.3) 0%, transparent 60%)",
                      pointerEvents: "none",
                    },
                  }}
                >
                  <Box
                    display="flex"
                    alignItems="center"
                    gap={1}
                    mb={1}
                    sx={{ position: "relative", zIndex: 1 }}
                  >
                    <CallMade sx={{ fontSize: 20, color: "#fff" }} />
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        color: "#fff",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Recipient
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "rgba(255,255,255,0.95)",
                      fontFamily: "monospace",
                      fontSize: "0.75rem",
                      mb: 1,
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    {formatAddress(output.address)}
                  </Typography>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ position: "relative", zIndex: 1 }}
                  >
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 700, color: "#fff" }}
                    >
                      {amount.toFixed(8)} BTC
                    </Typography>
                    {output.scriptType && (
                      <Chip
                        label={formatScriptType(output.scriptType)}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: "0.7rem",
                          backgroundColor: "rgba(255,255,255,0.25)",
                          color: "#fff",
                          fontWeight: 600,
                          backdropFilter: "blur(10px)",
                        }}
                      />
                    )}
                  </Box>
                </Box>
              </Box>
            );
          })}

          {/* Change Outputs */}
          {flowData.changeOutputs.map((output, idx) => {
            const amount = BigNumber(output.amount);
            return (
              <Box key={`change-${idx}`}>
                <Box
                  sx={{
                    background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.light} 100%)`,
                    borderRadius: 2,
                    p: 2.5,
                    position: "relative",
                    overflow: "hidden",
                    boxShadow: `0 8px 24px ${theme.palette.success.main}40`,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      transform: "translateX(-4px)",
                      boxShadow: `0 12px 32px ${theme.palette.success.main}60`,
                    },
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      background:
                        "radial-gradient(circle at top left, rgba(255,255,255,0.3) 0%, transparent 60%)",
                      pointerEvents: "none",
                    },
                  }}
                >
                  <Box
                    display="flex"
                    alignItems="center"
                    gap={1}
                    mb={1}
                    sx={{ position: "relative", zIndex: 1 }}
                  >
                    <Savings sx={{ fontSize: 20, color: "#fff" }} />
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        color: "#fff",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Change (Back to Wallet)
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "rgba(255,255,255,0.95)",
                      fontFamily: "monospace",
                      fontSize: "0.75rem",
                      mb: 1,
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    {formatAddress(output.address)}
                  </Typography>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ position: "relative", zIndex: 1 }}
                  >
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 700, color: "#fff" }}
                    >
                      {amount.toFixed(8)} BTC
                    </Typography>
                    {output.scriptType && (
                      <Chip
                        label={formatScriptType(output.scriptType)}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: "0.7rem",
                          backgroundColor: "rgba(255,255,255,0.25)",
                          color: "#fff",
                          fontWeight: 600,
                          backdropFilter: "blur(10px)",
                        }}
                      />
                    )}
                  </Box>
                </Box>
              </Box>
            );
          })}

          {/* Fee "Output" */}
          <Box
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.light} 100%)`,
              borderRadius: 2,
              p: 2,
              position: "relative",
              overflow: "hidden",
              boxShadow: `0 6px 20px ${theme.palette.error.main}30`,
              transition: "all 0.2s ease",
              "&:hover": {
                transform: "translateX(-4px)",
                boxShadow: `0 8px 28px ${theme.palette.error.main}40`,
              },
              "&::before": {
                content: '""',
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                background:
                  "radial-gradient(circle at top left, rgba(255,255,255,0.2) 0%, transparent 60%)",
                pointerEvents: "none",
              },
            }}
          >
            <Box
              display="flex"
              alignItems="center"
              gap={1}
              mb={0.5}
              sx={{ position: "relative", zIndex: 1 }}
            >
              <LocalGasStation sx={{ fontSize: 18, color: "#fff" }} />
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  color: "#fff",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Network Fee
              </Typography>
            </Box>
            <Typography
              variant="body2"
              sx={{
                color: "rgba(255,255,255,0.9)",
                fontSize: "0.75rem",
                mb: 0.5,
                position: "relative",
                zIndex: 1,
              }}
            >
              Paid to miners
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: "#fff",
                position: "relative",
                zIndex: 1,
              }}
            >
              {flowData.feeBtc.toFixed(8)} BTC
            </Typography>
          </Box>
        </Box>

        {/* SUMMARY Column */}
        <Box
          sx={{
            flex: { xs: "1", md: "0 0 26%" },
            width: { xs: "100%", md: "auto" },
            display: "flex",
            flexDirection: "column",
            gap: 2,
            alignSelf: "flex-start",
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 600,
              color: theme.palette.text.secondary,
              mb: 0,
            }}
          >
            Summary
          </Typography>

          {/* Summary Cards */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              backgroundColor: theme.palette.grey[50],
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 2,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: theme.palette.text.secondary,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                fontWeight: 600,
              }}
            >
              Total Sending
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: "#ea9c0d",
                mt: 0.5,
              }}
            >
              {flowData.recipientOutputs
                .reduce((sum, o) => sum.plus(BigNumber(o.amount)), BigNumber(0))
                .toFixed(8)}{" "}
              BTC
            </Typography>
          </Paper>

          {flowData.changeOutputs.length > 0 && (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                backgroundColor: theme.palette.grey[50],
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: theme.palette.text.secondary,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  fontWeight: 600,
                }}
              >
                Change Returning
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  color: theme.palette.success.main,
                  mt: 0.5,
                }}
              >
                {flowData.changeOutputs
                  .reduce(
                    (sum, o) => sum.plus(BigNumber(o.amount)),
                    BigNumber(0),
                  )
                  .toFixed(8)}{" "}
                BTC
              </Typography>
            </Paper>
          )}

          <Paper
            elevation={0}
            sx={{
              p: 2,
              backgroundColor: theme.palette.grey[50],
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 2,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: theme.palette.text.secondary,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                fontWeight: 600,
              }}
            >
              Network Fee
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: theme.palette.error.main,
                mt: 0.5,
              }}
            >
              {flowData.feeBtc.toFixed(8)} BTC
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: theme.palette.text.secondary,
                display: "block",
                mt: 0.5,
              }}
            >
              {(flowData.feeBtc.dividedBy(flowData.totalInputBtc).multipliedBy(100).toNumber() || 0).toFixed(2)}% of
              total
            </Typography>
          </Paper>

          <Box
            sx={{
              p: 2,
              backgroundColor: theme.palette.primary.main,
              borderRadius: 2,
              color: "#fff",
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: "rgba(255,255,255,0.8)",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                fontWeight: 600,
              }}
            >
              Total Input
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                mt: 0.5,
              }}
            >
              {flowData.totalInputBtc.toFixed(8)} BTC
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Legend */}
      <Box
        sx={{
          mt: 3,
          pt: 2,
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box
          sx={{
            display: "flex",
            gap: { xs: 2, sm: 3 },
            flexWrap: "wrap",
            justifyContent: "center",
            mb: 2,
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <Box
              sx={{
                width: 24,
                height: 16,
                background: "linear-gradient(135deg, #ea9c0d 0%, #f4b942 100%)",
                borderRadius: 0.5,
              }}
            />
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
              Payment to Recipient
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Box
              sx={{
                width: 24,
                height: 16,
                background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.light} 100%)`,
                borderRadius: 0.5,
              }}
            />
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
              Change (Your Wallet)
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Box
              sx={{
                width: 24,
                height: 16,
                background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.light} 100%)`,
                borderRadius: 0.5,
              }}
            />
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
              Network Fee (Miners)
            </Typography>
          </Box>
        </Box>
        
        {/* Dust Status Explanation */}
        <Box
          sx={{
            mt: 2,
            p: 2,
            backgroundColor: theme.palette.grey[50],
            borderRadius: 1,
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              color: theme.palette.text.secondary,
              display: "block",
              mb: 1,
            }}
          >
            Input Dust Status:
          </Typography>
          <Box display="flex" gap={2} flexWrap="wrap">
            <Box display="flex" alignItems="center" gap={0.5}>
              <Chip label="Economical" color="success" size="small" sx={{ height: 20, fontSize: "0.7rem" }} />
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                = Cost-effective to spend
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={0.5}>
              <Chip label="Warning" color="warning" size="small" sx={{ height: 20, fontSize: "0.7rem" }} />
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                = Consider batching
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={0.5}>
              <Chip label="Dust" color="error" size="small" sx={{ height: 20, fontSize: "0.7rem" }} />
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                = Costs more to spend than value
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default TransactionFlowDiagram;
