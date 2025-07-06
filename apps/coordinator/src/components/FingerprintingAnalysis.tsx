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
import type { UTXO } from "@caravan/fees";
import { satoshisToBitcoins } from "@caravan/bitcoin";
import type { WalletState } from "../selectors/wallet";

// Local type for transaction outputs (UI only)
type TransactionOutput = {
  address: string;
  amountSats: number;
  scriptType: string;
};

const tooltipSx = {
  "& .MuiTooltip-tooltip": {
    fontSize: "1rem",
    padding: "12px 16px",
    maxWidth: 300,
    backgroundColor: "#222",
    color: "#fff",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
  },
};

/**
 * Main component: TransactionAnalysis
 * Shows wallet fingerprinting and dust analysis for the current transaction.
 */
const FingerprintingAnalysis: React.FC = () => {
  const { dust, privacy, summary } = useTransactionAnalysis();
  // Get config from Redux for script type, signers, etc.
  const addressType = useSelector(
    (state: WalletState) => state.settings?.addressType,
  );
  const {
    inputs = [],
    outputs = [],
    feeRate = 1,
  } = useSelector((state: any) => state.spend?.transaction || {});

  // Wallet fingerprinting analysis UI
  const fixedOutputs = outputs.map((o: TransactionOutput) => ({
    ...o,
    scriptType: o.scriptType ?? "",
  }));
  let fingerprintTooltip = "";
  switch (true) {
    case privacy.hasWalletFingerprinting && fixedOutputs.length === 1:
      fingerprintTooltip =
        "Privacy Warning: You're sending all funds back to an address of your own wallet type. This clearly reveals your wallet's balance and links your transactions together.";
      break;
    case privacy.hasWalletFingerprinting:
      fingerprintTooltip =
        "Privacy Warning: This transaction makes it easy for anyone watching the blockchain to spot your change address and link your future transactions. For better privacy, try to send funds only to addresses of the same type as your wallet, or split your payments if possible.";
      break;
    case summary.outputCount > 0 &&
      privacy.matchingOutputCount === fixedOutputs.length:
      fingerprintTooltip =
        "Great! All outputs match your wallet's address type. Your change stays private and your wallet is harder to track.";
      break;
    case privacy.matchingOutputCount === 0:
      fingerprintTooltip =
        "No privacy risk detected. None of the outputs match your wallet's address type, so your wallet remains private in this transaction.";
      break;
    default:
      fingerprintTooltip =
        "Looking good! The outputs are diverse enough that your change address can't be easily identified. Your privacy is protected in this transaction.";
  }

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
            sx={tooltipSx}
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
            sx={tooltipSx}
          >
            <span style={{ display: "inline-flex" }}>
              {privacy.hasWalletFingerprinting ? (
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
                privacy.matchingOutputCount === fixedOutputs.length ? (
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
      <Box mt={2}>
        <OutputsTable outputs={outputs} privacy={privacy} />
      </Box>

      {/* Input dust analysis */}
      <Grid container spacing={2} alignItems="center" sx={{ mt: 0.5 }}>
        <Grid item>
          <Tooltip
            title="Analyzes transaction inputs to see if any are considered 'dust' (value may be less than the fee to spend it)."
            placement="top"
            arrow
            sx={tooltipSx}
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
                  key={`${input.txid}-${input.vout}`}
                  amountSats={Number(input.value)}
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

// OutputRow component
const OutputRow: React.FC<{
  output: TransactionOutput;
  isPoisoned: boolean;
}> = ({ output, isPoisoned }) => (
  <TableRow style={isPoisoned ? { background: "#fff3e0" } : {}}>
    <TableCell>
      <code>{output.address}</code>
      {isPoisoned && (
        <Tooltip
          title="This output matches your wallet's address type and is likely to be identified as change by an outside observer."
          sx={tooltipSx}
        >
          <WarningAmber
            color="warning"
            fontSize="small"
            style={{ marginLeft: 4, verticalAlign: "middle" }}
          />
        </Tooltip>
      )}
    </TableCell>
    <TableCell>
      <code>{satoshisToBitcoins(output.amountSats)}</code>
    </TableCell>
    <TableCell>
      <ScriptTypeChip scriptType={output.scriptType || ""} />
    </TableCell>
  </TableRow>
);

// OutputsTable component
const OutputsTable: React.FC<{
  outputs: TransactionOutput[];
  privacy: any;
}> = ({ outputs, privacy }) => {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Address</TableCell>
          <TableCell>Amount (BTC)</TableCell>
          <TableCell>Script Type</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {outputs.map((output: TransactionOutput, idx: number) => (
          <OutputRow
            key={output.address}
            output={output}
            isPoisoned={
              privacy.hasWalletFingerprinting &&
              privacy.poisonedOutputIndex === idx
            }
          />
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell>TOTAL:</TableCell>
          <TableCell>
            {satoshisToBitcoins(
              outputs.reduce(
                (sum: number, output: TransactionOutput) =>
                  sum + (output.amountSats || 0),
                0,
              ),
            )}
          </TableCell>
          <TableCell />
        </TableRow>
      </TableFooter>
    </Table>
  );
};

export default FingerprintingAnalysis;
