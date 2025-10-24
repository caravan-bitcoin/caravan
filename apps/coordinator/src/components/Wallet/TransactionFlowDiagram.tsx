import React, {
  useMemo,
  useState,
  useRef,
  useLayoutEffect,
  useEffect,
} from "react";
import {
  Box,
  Paper,
  Typography,
  Chip,
  Tooltip,
  useTheme,
  Button,
  IconButton,
  Drawer,
  Divider,
} from "@mui/material";
import {
  ArrowForward,
  CallMade,
  Savings,
  LocalGasStation,
  ExpandMore,
  OpenInNew,
  ContentCopy,
  Close,
} from "@mui/icons-material";
import BigNumber from "bignumber.js";
import {
  satoshisToBitcoins,
  blockExplorerTransactionURL,
  Network,
} from "@caravan/bitcoin";
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
  const svgRef = useRef<SVGSVGElement | null>(null);
  const centerRef = useRef<HTMLDivElement | null>(null);
  const inputRefs = useRef<(HTMLDivElement | null)[]>([]);
  const recipientOutputRefs = useRef<(HTMLDivElement | null)[]>([]);
  const changeOutputRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [inputPaths, setInputPaths] = useState<string[]>([]);
  const [outputPaths, setOutputPaths] = useState<string[]>([]);
  const [svgSize, setSvgSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const feeRef = useRef<HTMLDivElement | null>(null);

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

  // Build smooth cubic-bezier path from (x1,y1) to (x2,y2)
  const buildCurvePath = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = Math.abs(x2 - x1);
    const control = Math.max(dx * 0.25, 40);
    const c1x = x1 + (x2 > x1 ? control : -control);
    const c2x = x2 - (x2 > x1 ? control : -control);
    return `M ${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${x2} ${y2}`;
  };

  // Measure DOM and compute all paths
  const computePaths = () => {
    const svgEl = svgRef.current;
    const centerEl = centerRef.current;
    if (!svgEl || !centerEl) return;

    const containerRect = svgEl.getBoundingClientRect();
    const centerRect = centerEl.getBoundingClientRect();

    setSvgSize({ width: containerRect.width, height: containerRect.height });

    const centerLeftX = centerRect.left - containerRect.left;
    const centerRightX = centerRect.right - containerRect.left;
    const centerY = centerRect.top - containerRect.top + centerRect.height / 2;

    const newInputPaths: string[] = [];
    inputRefs.current.forEach((el) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x1 = r.right - containerRect.left;
      const y1 = r.top - containerRect.top + r.height / 2;
      newInputPaths.push(buildCurvePath(x1, y1, centerLeftX, centerY));
    });

    const newOutputPaths: string[] = [];
    const allOutputs = [
      ...recipientOutputRefs.current,
      ...changeOutputRefs.current,
      feeRef.current || null,
    ];
    allOutputs.forEach((el) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x2 = r.left - containerRect.left;
      const y2 = r.top - containerRect.top + r.height / 2;
      newOutputPaths.push(buildCurvePath(centerRightX, centerY, x2, y2));
    });

    setInputPaths(newInputPaths);
    setOutputPaths(newOutputPaths);
  };

  useLayoutEffect(() => {
    computePaths();
  }, [inputs.length, outputs.length]);

  useEffect(() => {
    const onResize = () => computePaths();
    window.addEventListener("resize", onResize);
    const id = window.setTimeout(() => computePaths(), 0);
    return () => {
      window.removeEventListener("resize", onResize);
      window.clearTimeout(id);
    };
  }, []);

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

  const getStatusDisplay = () => {
    switch (status) {
      case "draft":
        return { label: "Draft", color: theme.palette.grey[500] };
      case "partial":
        return { label: "Partially Signed", color: theme.palette.info.main };
      case "ready":
        return {
          label: "Ready to Broadcast",
          color: theme.palette.primary.main,
        };
      case "broadcast-pending":
        return { label: "Broadcast Pending", color: theme.palette.info.light };
      case "unconfirmed":
        return { label: "Unconfirmed", color: theme.palette.warning.main };
      case "confirmed":
        return {
          label: `Confirmed${confirmations ? ` (${confirmations})` : ""}`,
          color: theme.palette.success.main,
        };
      case "finalized":
        return { label: "Finalized", color: theme.palette.success.dark };
      case "rbf":
        return {
          label: "Replaced by Fee",
          color: theme.palette.secondary.main,
        };
      case "dropped":
        return { label: "Dropped", color: theme.palette.grey[400] };
      case "conflicted":
        return { label: "Conflicted", color: theme.palette.error.main };
      case "rejected":
        return { label: "Rejected", color: theme.palette.error.dark };
      default:
        return { label: "Unknown", color: theme.palette.grey[500] };
    }
  };

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
                  : "Unknown";

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
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                  >
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
                        "& .MuiChip-root": { height: 22, fontSize: "0.7rem" },
                      }}
                    >
                      <DustChip
                        amountSats={parseInt(input.amountSats)}
                        scriptType={input.multisig?.name}
                      />
                    </Box>
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
              const sd = getStatusDisplay();
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

                {/* Inputs Drawer */}
                <Drawer
                  anchor="right"
                  open={inputsDrawerOpen}
                  onClose={() => setInputsDrawerOpen(false)}
                  PaperProps={{ sx: { width: { xs: "100vw", sm: 420 } } }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      p: 2,
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      All Inputs ({flowData.inputCount})
                    </Typography>
                    <IconButton
                      onClick={() => setInputsDrawerOpen(false)}
                      sx={{ color: "inherit" }}
                    >
                      <Close />
                    </IconButton>
                  </Box>
                  <Divider />
                  <Box
                    sx={{
                      p: 2,
                      display: "flex",
                      flexDirection: "column",
                      gap: 1.5,
                    }}
                  >
                    {inputs.map((input, idx) => {
                      const inputAmount = BigNumber(
                        satoshisToBitcoins(input.amountSats.toString()),
                      );
                      const scriptType = input.multisig?.name?.includes("p2wsh")
                        ? "P2WSH"
                        : input.multisig?.name?.includes("p2sh")
                          ? "P2SH"
                          : "Unknown";
                      return (
                        <Box
                          key={`drawer-input-${input.txid}-${input.index}-${idx}`}
                          sx={{
                            backgroundColor: "#fff",
                            border: `2px solid ${theme.palette.divider}`,
                            borderRadius: 1,
                            p: 1.5,
                          }}
                        >
                          <Box
                            display="flex"
                            justifyContent="space-between"
                            alignItems="flex-start"
                            mb={0.5}
                          >
                            <Box
                              display="flex"
                              alignItems="center"
                              gap={0.5}
                              flex={1}
                            >
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
                          <Box
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                          >
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
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                </Drawer>

                {/* Outputs Drawer (recipient outputs only) */}
                <Drawer
                  anchor="right"
                  open={outputsDrawerOpen}
                  onClose={() => setOutputsDrawerOpen(false)}
                  PaperProps={{ sx: { width: { xs: "100vw", sm: 420 } } }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      p: 2,
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      All Payment Outputs ({flowData.recipientOutputs.length})
                    </Typography>
                    <IconButton
                      onClick={() => setOutputsDrawerOpen(false)}
                      sx={{ color: "inherit" }}
                    >
                      <Close />
                    </IconButton>
                  </Box>
                  <Divider />
                  <Box
                    sx={{
                      p: 2,
                      display: "flex",
                      flexDirection: "column",
                      gap: 1.5,
                    }}
                  >
                    {flowData.recipientOutputs.map((output, idx) => {
                      const amount = BigNumber(output.amount);
                      return (
                        <Box
                          key={`drawer-recipient-${idx}`}
                          sx={{
                            backgroundColor: "#fff",
                            border: `2px solid #ea9c0d`,
                            borderRadius: 1,
                            p: 2,
                          }}
                        >
                          <Box
                            display="flex"
                            alignItems="center"
                            gap={1}
                            mb={1}
                          >
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
                          <Box
                            display="flex"
                            alignItems="center"
                            gap={0.5}
                            mb={1}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                color: theme.palette.text.secondary,
                                fontFamily: "monospace",
                                fontSize: "0.75rem",
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
                                onClick={() =>
                                  handleCopyAddress(output.address)
                                }
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
                      );
                    })}
                  </Box>
                </Drawer>
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
                width: 12,
                height: 12,
                border: "2px solid #ea9c0d",
                backgroundColor: "#ea9c0d",
                borderRadius: 0.5,
              }}
            />
            <Typography
              variant="caption"
              sx={{ color: theme.palette.text.secondary, fontSize: "0.75rem" }}
            >
              Payment Output
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Box
              sx={{
                width: 12,
                height: 12,
                border: `2px solid ${theme.palette.primary.main}`,
                backgroundColor: theme.palette.primary.main,
                borderRadius: 0.5,
              }}
            />
            <Typography
              variant="caption"
              sx={{ color: theme.palette.text.secondary, fontSize: "0.75rem" }}
            >
              Change Output
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Box
              sx={{
                width: 12,
                height: 12,
                border: `1px dashed ${theme.palette.divider}`,
                backgroundColor: theme.palette.text.secondary,
                borderRadius: 0.5,
              }}
            />
            <Typography
              variant="caption"
              sx={{ color: theme.palette.text.secondary, fontSize: "0.75rem" }}
            >
              Network Fee
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
              <Chip
                label="Economical"
                color="success"
                size="small"
                sx={{ height: 20, fontSize: "0.7rem" }}
              />
              <Typography
                variant="caption"
                sx={{ color: theme.palette.text.secondary }}
              >
                = Cost-effective to spend
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={0.5}>
              <Chip
                label="Warning"
                color="warning"
                size="small"
                sx={{ height: 20, fontSize: "0.7rem" }}
              />
              <Typography
                variant="caption"
                sx={{ color: theme.palette.text.secondary }}
              >
                = Consider batching
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={0.5}>
              <Chip
                label="Dust"
                color="error"
                size="small"
                sx={{ height: 20, fontSize: "0.7rem" }}
              />
              <Typography
                variant="caption"
                sx={{ color: theme.palette.text.secondary }}
              >
                = Costs more to spend than value
              </Typography>
            </Box>
          </Box>
        </Box>
        {/* SUMMARY Section - Moved Below */}
        <Box
          sx={{
            mt: 3,
            mb: 3,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              color: theme.palette.text.primary,
              mb: 2,
            }}
          >
            Transaction Summary
          </Typography>

          {/* Summary Cards in Grid */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(4, 1fr)",
              },
              gap: 2,
            }}
          >
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
                  .reduce(
                    (sum, o) => sum.plus(BigNumber(o.amount)),
                    BigNumber(0),
                  )
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
                    color: theme.palette.primary.main,
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
                {(
                  flowData.feeBtc
                    .dividedBy(flowData.totalInputBtc)
                    .multipliedBy(100)
                    .toNumber() || 0
                ).toFixed(2)}
                % of total
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
      </Box>
    </Paper>
  );
};

export default TransactionFlowDiagram;
