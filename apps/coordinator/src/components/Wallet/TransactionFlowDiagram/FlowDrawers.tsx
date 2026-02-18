import React from "react";
import {
  Box,
  Drawer,
  Typography,
  IconButton,
  Divider,
  Chip,
  Tooltip,
  useTheme,
} from "@mui/material";
import { Close, OpenInNew, ContentCopy, CallMade } from "@mui/icons-material";
import BigNumber from "bignumber.js";
import {
  satoshisToBitcoins,
  blockExplorerTransactionURL,
  Network,
} from "@caravan/bitcoin";
import DustChip from "../../ScriptExplorer/DustChip";
import { formatAddress, getScriptTypeColor, formatScriptType } from "./utils";

interface Input {
  txid: string;
  index: number;
  amountSats: string;
  valueUnknown?: boolean;
  multisig?: {
    name?: string;
  };
}

interface Output {
  address: string;
  amount: string;
  scriptType?: string;
  isChange: boolean;
  type: string;
}

interface FlowDrawersProps {
  // Inputs drawer props
  inputsDrawerOpen: boolean;
  setInputsDrawerOpen: (open: boolean) => void;
  inputs: Input[];
  inputCount: number;
  network: string;

  // Outputs drawer props
  outputsDrawerOpen: boolean;
  setOutputsDrawerOpen: (open: boolean) => void;
  recipientOutputs: Output[];

  // Shared props
  copiedAddress: string | null;
  handleCopyAddress: (address: string) => void;
}

const FlowDrawers: React.FC<FlowDrawersProps> = ({
  inputsDrawerOpen,
  setInputsDrawerOpen,
  inputs,
  inputCount,
  network,
  outputsDrawerOpen,
  setOutputsDrawerOpen,
  recipientOutputs,
  copiedAddress,
  handleCopyAddress,
}) => {
  const theme = useTheme();

  return (
    <>
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
            All Inputs ({inputCount})
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
                : input.multisig?.name
                  ? input.multisig.name.toUpperCase()
                  : null;
            const showValueUnknown = input.valueUnknown;
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
                        backgroundColor: getScriptTypeColor(scriptType, theme),
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
            All Payment Outputs ({recipientOutputs.length})
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
          {recipientOutputs.map((output, idx) => {
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
    </>
  );
};

export default FlowDrawers;
