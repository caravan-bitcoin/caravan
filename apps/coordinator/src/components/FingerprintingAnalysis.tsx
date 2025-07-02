import React from "react";
import {
  Box,
  Typography,
  Grid,
  Tooltip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableFooter,
} from "@mui/material";
import { Shield, CleaningServices, WarningAmber } from "@mui/icons-material";
import { useTransactionAnalysis } from "../hooks/useTransactionAnalysis";
import DustChip from "./ScriptExplorer/DustChip";
import OutputFingerprintChip from "./OutputFingerprintChip";
import ScriptTypeChip from "./ScriptTypeChip";
import { useSelector } from "react-redux";
import type { UTXO, TransactionOutput } from "./transaction";
import { BigNumber } from "bignumber.js";

/**
 * Main component: TransactionAnalysis
 * Shows wallet fingerprinting and dust analysis for the current transaction.
 */
const FingerprintingAnalysis: React.FC = () => {
  const { dust, walletFingerprinting, summary } = useTransactionAnalysis();
  // Get config from Redux for script type, signers, etc.
  const addressType = useSelector((state: any) => state.settings?.addressType);
  const inputs = useSelector(
    (state: any) => state.spend?.transaction?.inputs || [],
  );
  const outputs = useSelector(
    (state: any) => state.spend?.transaction?.outputs || [],
  );
  const feeRate = useSelector(
    (state: any) => state.spend?.transaction?.feeRate || 1,
  );

  // Wallet fingerprinting analysis UI
  const fixedOutputs = outputs.map((o: TransactionOutput) => ({
    ...o,
    scriptType: o.scriptType ?? "",
  }));
  let fingerprintTooltip = "";
  if (walletFingerprinting.hasWalletFingerprinting) {
    if (fixedOutputs.length === 1) {
      fingerprintTooltip =
        "Privacy Warning: You're sending all funds back to an address of your own wallet type. This clearly reveals your wallet's balance and links your transactions together.";
    } else {
      fingerprintTooltip =
        "Privacy Warning: This transaction makes it easy for anyone watching the blockchain to spot your change address and link your future transactions. For better privacy, try to send funds only to addresses of the same type as your wallet, or split your payments if possible.";
    }
  } else if (
    summary.outputCount > 0 &&
    walletFingerprinting.matchingOutputCount === fixedOutputs.length
  ) {
    fingerprintTooltip =
      "Great! All outputs match your wallet's address type. Your change stays private and your wallet is harder to track.";
  } else if (walletFingerprinting.matchingOutputCount === 0) {
    fingerprintTooltip =
      "No privacy risk detected. None of the outputs match your wallet's address type, so your wallet remains private in this transaction.";
  } else {
    fingerprintTooltip =
      "Looking good! The outputs are diverse enough that your change address can't be easily identified. Your privacy is protected in this transaction.";
  }

  // Outputs table with privacy highlighting
  const buildOutputRows = () => {
    return outputs.map((output: TransactionOutput, idx: number) => {
      const isPoisoned =
        walletFingerprinting.hasWalletFingerprinting &&
        walletFingerprinting.poisonedOutputIndex === idx;
      return (
        <TableRow
          key={output.address}
          style={isPoisoned ? { background: "#fff3e0" } : {}}
        >
          <TableCell>
            <code>{output.address}</code>
            {isPoisoned && (
              <Tooltip title="This output matches your wallet's address type and is likely to be identified as change by an outside observer.">
                <WarningAmber
                  color="warning"
                  fontSize="small"
                  style={{ marginLeft: 4, verticalAlign: "middle" }}
                />
              </Tooltip>
            )}
          </TableCell>
          <TableCell>
            <code>{BigNumber(output.amountSats).toFixed(8)}</code>
          </TableCell>
          <TableCell>
            <ScriptTypeChip scriptType={output.scriptType || ""} />
          </TableCell>
        </TableRow>
      );
    });
  };

  const buildOutputsTable = () => {
    return (
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Address</TableCell>
            <TableCell>Amount (BTC)</TableCell>
            <TableCell>Script Type</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>{buildOutputRows()}</TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>TOTAL:</TableCell>
            <TableCell>
              {outputs.reduce(
                (sum: number, output: TransactionOutput) =>
                  sum + (output.amountSats || 0),
                0,
              ) / 1e8}
            </TableCell>
            <TableCell />
          </TableRow>
        </TableFooter>
      </Table>
    );
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Transaction Analysis
      </Typography>

      {/* Wallet fingerprinting analysis */}
      <Grid container spacing={2} alignItems="center">
        <Grid item>
          <Tooltip
            title="Analyzes the outputs for wallet fingerprinting privacy leaks (change detection)."
            placement="top"
            arrow
            sx={{
              "& .MuiTooltip-tooltip": {
                fontSize: "1rem",
                padding: "12px 16px",
                maxWidth: 300,
                backgroundColor: "#222",
                color: "#fff",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              },
            }}
          >
            <Shield fontSize="small" />
          </Tooltip>
        </Grid>
        <Grid item>
          <Typography variant="subtitle1">Wallet Fingerprinting</Typography>
        </Grid>
        <Grid item>
          <Tooltip
            title={fingerprintTooltip}
            placement="bottom"
            arrow
            sx={{
              "& .MuiTooltip-tooltip": {
                fontSize: "1rem",
                padding: "12px 16px",
                maxWidth: 300,
                backgroundColor: "#222",
                color: "#fff",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              },
            }}
          >
            <span style={{ display: "inline-flex" }}>
              {walletFingerprinting.hasWalletFingerprinting ? (
                <OutputFingerprintChip
                  outputs={fixedOutputs.map((o: TransactionOutput) => ({
                    ...o,
                    amount: o.amountSats,
                    scriptType: o.scriptType ?? "",
                  }))}
                  label={
                    fixedOutputs.length === 1
                      ? addressType
                      : "Output Fingerprinting"
                  }
                />
              ) : summary.outputCount > 0 &&
                walletFingerprinting.matchingOutputCount ===
                  fixedOutputs.length ? (
                <ScriptTypeChip
                  scriptType={addressType}
                  color="success"
                  icon={undefined}
                  variant="filled"
                />
              ) : (
                <ScriptTypeChip
                  scriptType="N/A"
                  color="default"
                  icon={undefined}
                  variant="outlined"
                />
              )}
            </span>
          </Tooltip>
        </Grid>
      </Grid>

      {/* Outputs Table with privacy highlighting */}
      <Box mt={2}>{buildOutputsTable()}</Box>

      {/* Input dust analysis */}
      <Grid container spacing={2} alignItems="center" sx={{ mt: 0.5 }}>
        <Grid item>
          <Tooltip
            title="Analyzes transaction inputs to see if any are considered 'dust' (value may be less than the fee to spend it)."
            placement="top"
            arrow
            sx={{
              "& .MuiTooltip-tooltip": {
                fontSize: "1rem",
                padding: "12px 16px",
                maxWidth: 300,
                backgroundColor: "#222",
                color: "#fff",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              },
            }}
          >
            <CleaningServices fontSize="small" />
          </Tooltip>
        </Grid>
        <Grid item>
          <Typography variant="subtitle1">Input Dust</Typography>
        </Grid>
        <Grid item>
          {dust.hasDustInputs ? (
            <Box>
              {inputs.map((input: UTXO) => (
                <DustChip
                  key={`${input.txid}-${input.index}`}
                  amountSats={input.amountSats}
                  feeRate={feeRate}
                />
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="textSecondary">
              No dust inputs detected.
            </Typography>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default FingerprintingAnalysis;
