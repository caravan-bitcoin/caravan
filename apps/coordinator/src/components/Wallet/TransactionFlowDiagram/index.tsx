import React, { useMemo, useState, useRef } from "react";
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
  ExpandMore,
  OpenInNew,
  ContentCopy,
} from "@mui/icons-material";
import BigNumber from "bignumber.js";
import {
  satoshisToBitcoins,
  blockExplorerTransactionURL,
  Network,
} from "@caravan/bitcoin";
import DustChip from "../../ScriptExplorer/DustChip";
import { useFlowPaths } from "./hooks";
import {
  formatAddress,
  formatScriptType,
  getScriptTypeColor,
  getStatusDisplay,
} from "./utils";
import FlowDrawers from "./FlowDrawers";
import FlowSummary from "./FlowSummary";

interface TransactionFlowDiagramProps {
  inputs: Array<{
    txid: string;
    index: number;
    amountSats: string;
    valueUnknown?: boolean;
    multisig?: {
      name?: string;
    };
  }>;
  outputs: Array<{
    address: string;
    amount: string;
    scriptType?: string;
  }>;
  fee: string;
  changeAddress?: string;
  inputsTotalSats: any;
  network?: string;
  status?:
    | "draft"
    | "partial"
    | "ready"
    | "broadcast-pending"
    | "unconfirmed"
    | "confirmed"
    | "finalized"
    | "rbf"
    | "dropped"
    | "conflicted"
    | "rejected"
    | "unknown";
  confirmations?: number;
}

const TransactionFlowDiagram: React.FC<TransactionFlowDiagramProps> = ({
  inputs,
  outputs,
  fee,
  changeAddress,
  inputsTotalSats,
  network = "mainnet",
  status = "draft",
  confirmations,
}) => {
  const theme = useTheme();
  const [inputsDrawerOpen, setInputsDrawerOpen] = useState(false);
  const [outputsDrawerOpen, setOutputsDrawerOpen] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // Refs for SVG path calculations
  const svgRef = useRef<SVGSVGElement | null>(null);
  const centerRef = useRef<HTMLDivElement | null>(null);
  const inputRefs = useRef<(HTMLDivElement | null)[]>([]);
  const recipientOutputRefs = useRef<(HTMLDivElement | null)[]>([]);
  const changeOutputRefs = useRef<(HTMLDivElement | null)[]>([]);
  const feeRef = useRef<HTMLDivElement | null>(null);

  // Use custom hook for SVG path calculations
  const { inputPaths, outputPaths, svgSize } = useFlowPaths(
    inputRefs,
    recipientOutputRefs,
    changeOutputRefs,
    feeRef,
    centerRef,
    svgRef,
    inputs.length,
    outputs.length,
  );

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  // Calculate totals and categorize outputs
  const flowData = useMemo(() => {
    const totalInputSats = BigNumber(inputsTotalSats.toString());
    const totalInputBtc = BigNumber(
      satoshisToBitcoins(totalInputSats.toString()),
    );
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

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        backgroundColor: "#fff",
        border: `2px solid ${theme.palette.divider}`,
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={3}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: theme.palette.text.primary,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          Transaction Flow Diagram
        </Typography>
        <Chip
          label={`${flowData.inputCount} Input${flowData.inputCount > 1 ? "s" : ""} → ${flowData.outputCount} Output${flowData.outputCount > 1 ? "s" : ""}`}
          size="small"
          variant="outlined"
          sx={{
            fontWeight: 500,
            borderColor: theme.palette.divider,
          }}
        />
      </Box>

      {/* Main Flow Visualization */}
      <Box
        sx={{
          position: "relative",
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          justifyContent: "space-between",
          alignItems: "stretch",
          minHeight: { xs: "auto", md: 450 },
          gap: { xs: 3, md: 3 },
          width: "100%",
          mb: 3,
        }}
      >
        {/* SVG for connecting lines - desktop only */}
        <Box
          component="svg"
          ref={svgRef}
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 0,
            display: { xs: "none", md: "block" },
          }}
          viewBox={`0 0 ${Math.max(svgSize.width, 1)} ${Math.max(svgSize.height, 1)}`}
          preserveAspectRatio="none"
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="12"
              markerHeight="12"
              refX="10"
              refY="6"
              orient="auto"
            >
              <polygon
                points="0 0, 12 6, 0 12"
                fill={theme.palette.text.secondary}
              />
            </marker>
          </defs>
          {inputPaths.map((d, i) => (
            <path
              key={`in-${i}`}
              d={d}
              stroke={theme.palette.text.secondary}
              strokeWidth={2}
              fill="none"
            />
          ))}
          {outputPaths.map((d, i) => (
            <path
              key={`out-${i}`}
              d={d}
              stroke={theme.palette.text.secondary}
              strokeWidth={2}
              fill="none"
            />
          ))}
        </Box>

        {/* INPUTS Column */}
        <Box
          sx={{
            flex: { xs: "1", md: "0 0 30%" },
            width: { xs: "100%", md: "auto" },
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            alignSelf: "flex-start",
            position: "relative",
            zIndex: 1,
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

          {(() => {
            inputRefs.current = [];
            return null;
          })()}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
            }}
          >
            {inputs.slice(0, 4).map((input, idx) => {
              const inputAmount = BigNumber(
                satoshisToBitcoins(input.amountSats.toString()),
              );
              const scriptType = input.multisig?.name?.includes("p2wsh")
                ? "P2WSH"
                : input.multisig?.name?.includes("p2sh")
                  ? "P2SH"
                  : input.multisig?.name
                    ? input.multisig.name.toUpperCase()
                    : null;
              const showValueUnknown = input.valueUnknown;

              return (
                <Box
                  key={`${input.txid}-${input.index}`}
                  sx={{
                    backgroundColor: "#fff",
                    border: `2px solid ${theme.palette.divider}`,
                    borderRadius: 1,
                    p: 1.5,
                    position: "relative",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      borderColor: theme.palette.primary.main,
                      boxShadow: `0 2px 8px rgba(0,0,0,0.08)`,
                    },
                    "&::after": {
                      content: '""',
                      position: "absolute",
                      right: -10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      backgroundColor: theme.palette.text.secondary,
                      border: "2px solid #fff",
                      display: { xs: "none", md: "block" },
                      zIndex: 2,
                    },
                  }}
                  ref={(el: HTMLDivElement | null) => {
                    inputRefs.current[idx] = el;
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
                        href={blockExplorerTransactionURL(
                          input.txid,
                          network as Network,
                        )}
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
                    {scriptType && (
                      <Chip
                        label={scriptType}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: "0.65rem",
                          backgroundColor: getScriptTypeColor(
                            scriptType,
                            theme,
                          ),
                          color: "#fff",
                          fontWeight: 600,
                        }}
                      />
                    )}
                  </Box>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    {showValueUnknown ? (
                      <Tooltip title="Input value not available for historical transactions. Total is calculated from outputs + fee.">
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 500,
                            color: theme.palette.text.secondary,
                            fontStyle: "italic",
                          }}
                        >
                          Value from prev tx
                        </Typography>
                      </Tooltip>
                    ) : (
                      <>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            color: theme.palette.primary.main,
                          }}
                        >
                          {inputAmount.toFixed(8)} BTC
                        </Typography>
                        <Box
                          sx={{
                            "& .MuiChip-root": {
                              height: 22,
                              fontSize: "0.7rem",
                            },
                          }}
                        >
                          <DustChip
                            amountSats={parseInt(input.amountSats)}
                            scriptType={input.multisig?.name}
                          />
                        </Box>
                      </>
                    )}
                  </Box>
                </Box>
              );
            })}

            {inputs.length > 4 && (
              <Button
                onClick={() => setInputsDrawerOpen(true)}
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
                <Box
                  display="flex"
                  alignItems="center"
                  gap={1}
                  justifyContent="center"
                >
                  <ExpandMore />
                  <Typography
                    variant="body2"
                    sx={{
                      color: theme.palette.text.secondary,
                      fontWeight: 600,
                    }}
                  >
                    {`+${inputs.length - 4} more input${inputs.length - 4 > 1 ? "s" : ""}`}
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

        {/* FLOW Diagram - Center */}
        <Box
          sx={{
            flex: { xs: "0", md: "0 0 14%" },
            display: { xs: "none", md: "flex" },
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            gap: 2,
          }}
        >
          {/* Transaction Node */}
          <Box
            sx={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              border: `2px solid ${theme.palette.divider}`,
              backgroundColor: "#fff",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 0.5,
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            }}
            ref={centerRef}
          >
            {(() => {
              const sd = getStatusDisplay(status, confirmations, theme);
              return (
                <>
                  <Typography
                    variant="caption"
                    sx={{
                      color: theme.palette.text.secondary,
                      fontWeight: 600,
                      fontSize: "0.7rem",
                    }}
                  >
                    STATUS
                  </Typography>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 800,
                      color: sd.color,
                      textAlign: "center",
                    }}
                  >
                    {sd.label}
                  </Typography>
                </>
              );
            })()}
          </Box>
        </Box>

        {/* OUTPUTS Column */}
        <Box
          sx={{
            flex: { xs: "1", md: "0 0 30%" },
            width: { xs: "100%", md: "auto" },
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            alignSelf: "flex-start",
            position: "relative",
            zIndex: 1,
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

          {/* Recipient Outputs (cap 4 inline) */}
          {(() => {
            recipientOutputRefs.current = [];
            return null;
          })()}
          {flowData.recipientOutputs.slice(0, 4).map((output, idx) => {
            const amount = BigNumber(output.amount);
            return (
              <Box key={`recipient-${idx}`}>
                <Box
                  sx={{
                    backgroundColor: "#fff",
                    border: `2px solid #ea9c0d`,
                    borderRadius: 1,
                    p: 2,
                    position: "relative",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      backgroundColor: "#fffbf5",
                      boxShadow: `0 2px 8px rgba(234, 156, 13, 0.15)`,
                    },
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      left: -10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      backgroundColor: "#ea9c0d",
                      border: "2px solid #fff",
                      display: { xs: "none", md: "block" },
                      zIndex: 2,
                    },
                  }}
                  ref={(el: HTMLDivElement | null) => {
                    recipientOutputRefs.current[idx] = el;
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <CallMade sx={{ fontSize: 18, color: "#ea9c0d" }} />
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        color: theme.palette.text.secondary,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        fontSize: "0.7rem",
                      }}
                    >
                      Payment
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={0.5} mb={1}>
                    <Typography
                      variant="body2"
                      sx={{
                        color: theme.palette.text.secondary,
                        fontFamily: "monospace",
                        fontSize: "0.75rem",
                        mb: 1,
                        position: "relative",
                        zIndex: 1,
                      }}
                    >
                      {formatAddress(output.address)}
                    </Typography>
                    <Tooltip
                      title={
                        copiedAddress === output.address
                          ? "Copied!"
                          : "Copy address"
                      }
                    >
                      <IconButton
                        size="small"
                        onClick={() => handleCopyAddress(output.address)}
                        sx={{
                          padding: 0.25,
                          color: theme.palette.text.secondary,
                          "&:hover": {
                            color: theme.palette.primary.main,
                          },
                          "& svg": { fontSize: "0.75rem" },
                        }}
                      >
                        <ContentCopy fontSize="inherit" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ position: "relative", zIndex: 1 }}
                  >
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 700, color: "#ea9c0d" }}
                    >
                      {amount.toFixed(8)} BTC
                    </Typography>
                    {output.scriptType && (
                      <Chip
                        label={formatScriptType(output.scriptType)}
                        size="small"
                        variant="outlined"
                        sx={{
                          height: 22,
                          fontSize: "0.65rem",
                          borderColor: theme.palette.divider,
                          color: theme.palette.text.secondary,
                        }}
                      />
                    )}
                  </Box>
                </Box>
              </Box>
            );
          })}

          {flowData.recipientOutputs.length > 4 && (
            <Button
              onClick={() => setOutputsDrawerOpen(true)}
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
              <Box
                display="flex"
                alignItems="center"
                gap={1}
                justifyContent="center"
              >
                <ExpandMore />
                <Typography
                  variant="body2"
                  sx={{
                    color: theme.palette.text.secondary,
                    fontWeight: 600,
                  }}
                >
                  {`+${flowData.recipientOutputs.length - 4} more output${flowData.recipientOutputs.length - 4 > 1 ? "s" : ""}`}
                </Typography>
              </Box>
            </Button>
          )}

          {/* Change Outputs */}
          {flowData.changeOutputs.map((output, idx) => {
            const amount = BigNumber(output.amount);
            return (
              <Box key={`change-${idx}`}>
                <Box
                  sx={{
                    backgroundColor: "#fff",
                    border: `2px solid ${theme.palette.primary.main}`,
                    borderRadius: 1,
                    p: 2,
                    position: "relative",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      backgroundColor: "#f0f7ff",
                      boxShadow: `0 2px 8px ${theme.palette.primary.main}20`,
                    },
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      left: -10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      backgroundColor: theme.palette.primary.main,
                      border: "2px solid #fff",
                      display: { xs: "none", md: "block" },
                      zIndex: 2,
                    },
                  }}
                  ref={(el: HTMLDivElement | null) => {
                    changeOutputRefs.current[idx] = el;
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Savings
                      sx={{ fontSize: 18, color: theme.palette.primary.main }}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        color: theme.palette.text.secondary,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        fontSize: "0.7rem",
                      }}
                    >
                      Change
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={0.5} mb={1}>
                    <Typography
                      variant="body2"
                      sx={{
                        color: theme.palette.text.secondary,
                        fontFamily: "monospace",
                        fontSize: "0.7rem",
                      }}
                    >
                      {formatAddress(output.address)}
                    </Typography>
                    <Tooltip
                      title={
                        copiedAddress === output.address
                          ? "Copied!"
                          : "Copy address"
                      }
                    >
                      <IconButton
                        size="small"
                        onClick={() => handleCopyAddress(output.address)}
                        sx={{
                          padding: 0.25,
                          color: theme.palette.text.secondary,
                          "&:hover": {
                            color: theme.palette.primary.main,
                          },
                          "& svg": { fontSize: "0.75rem" },
                        }}
                      >
                        <ContentCopy fontSize="inherit" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        color: theme.palette.primary.main,
                      }}
                    >
                      {amount.toFixed(8)} BTC
                    </Typography>
                    {output.scriptType && (
                      <Chip
                        label={formatScriptType(output.scriptType)}
                        size="small"
                        variant="outlined"
                        sx={{
                          height: 22,
                          fontSize: "0.65rem",
                          borderColor: theme.palette.divider,
                          color: theme.palette.text.secondary,
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
              backgroundColor: "#fff",
              border: `1px dashed ${theme.palette.divider}`,
              borderRadius: 1,
              p: 2,
              position: "relative",
              transition: "all 0.2s ease",
              "&:hover": {
                backgroundColor: theme.palette.grey[50],
              },
              "&::before": {
                content: '""',
                position: "absolute",
                left: -10,
                top: "50%",
                transform: "translateY(-50%)",
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: theme.palette.text.secondary,
                border: "2px solid #fff",
                opacity: 0.5,
                display: { xs: "none", md: "block" },
                zIndex: 2,
              },
            }}
            ref={feeRef}
          >
            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
              <LocalGasStation
                sx={{ fontSize: 16, color: theme.palette.text.secondary }}
              />
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  color: theme.palette.text.secondary,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  fontSize: "0.7rem",
                }}
              >
                Network Fee
              </Typography>
            </Box>
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.text.secondary,
                fontSize: "0.7rem",
                mb: 0.5,
              }}
            >
              To miners
            </Typography>
            <Typography
              variant="body1"
              sx={{
                fontWeight: 700,
                color: theme.palette.text.primary,
              }}
            >
              {flowData.feeBtc.toFixed(8)} BTC
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Drawers */}
      <FlowDrawers
        inputsDrawerOpen={inputsDrawerOpen}
        setInputsDrawerOpen={setInputsDrawerOpen}
        inputs={inputs}
        inputCount={flowData.inputCount}
        network={network}
        outputsDrawerOpen={outputsDrawerOpen}
        setOutputsDrawerOpen={setOutputsDrawerOpen}
        recipientOutputs={flowData.recipientOutputs}
        copiedAddress={copiedAddress}
        handleCopyAddress={handleCopyAddress}
      />

      {/* Summary */}
      <FlowSummary
        recipientOutputs={flowData.recipientOutputs}
        changeOutputs={flowData.changeOutputs}
        feeBtc={flowData.feeBtc}
        totalInputBtc={flowData.totalInputBtc}
      />
    </Paper>
  );
};

export default TransactionFlowDiagram;
