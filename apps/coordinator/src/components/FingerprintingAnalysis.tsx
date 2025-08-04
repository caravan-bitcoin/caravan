import React from "react";
import { Box, Typography, Grid, Tooltip } from "@mui/material";
import { Shield, CleaningServices } from "@mui/icons-material";
import { useTransactionAnalysis } from "../hooks/transaction";
import DustChip from "./ScriptExplorer/DustChip";
import OutputFingerprintChip from "./OutputFingerprintChip";
import ScriptTypeChip from "./ScriptTypeChip";
import { useSelector } from "react-redux";
import type { UTXO } from "@caravan/fees";
import type { WalletState } from "selectors/wallet";

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

enum PrivacyStatus {
  SingleSelfSend,
  SelfChangeVisible,
  PerfectPrivacy,
  NoMatchButSafe,
  DiverseButSafe,
}

const TOOLTIP_MESSAGES: Record<PrivacyStatus, string> = {
  [PrivacyStatus.SingleSelfSend]:
    "Privacy Warning: You're sending all funds back to an address of your own wallet type. This clearly reveals your wallet's balance and links your transactions together.",
  [PrivacyStatus.SelfChangeVisible]:
    "Privacy Warning: This transaction makes it easy for anyone watching the blockchain to spot your change address and link your future transactions. For better privacy, try to send funds only to addresses of the same type as your wallet, or split your payments if possible.",
  [PrivacyStatus.PerfectPrivacy]:
    "Great! All outputs match your wallet's address type. Your change stays private and your wallet is harder to track.",
  [PrivacyStatus.NoMatchButSafe]:
    "No privacy risk detected. None of the outputs match your wallet's address type, so your wallet remains private in this transaction.",
  [PrivacyStatus.DiverseButSafe]:
    "Looking good! The outputs are diverse enough that your change address can't be easily identified. Your privacy is protected in this transaction.",
};

/**
 * Main component: TransactionAnalysis
 * Shows wallet fingerprinting and dust analysis for the current transaction.
 */
const FingerprintingAnalysis: React.FC = () => {
  const { dust, privacy } = useTransactionAnalysis();
  // Get config from Redux for script type, signers, etc.
  const addressType = useSelector(
    (state: WalletState) => state.settings?.addressType,
  );
  const { inputs = [], outputs = [] } = useSelector(
    (state: any) => state.spend?.transaction || {},
  );

  // Wallet fingerprinting analysis UI
  const fixedOutputs = outputs.map((o: TransactionOutput) => ({
    ...o,
    scriptType: o.scriptType ?? "",
  }));

  function getPrivacyStatus(): PrivacyStatus {
    if (privacy.hasWalletFingerprinting && fixedOutputs.length === 1) {
      return PrivacyStatus.SingleSelfSend;
    }
    if (privacy.hasWalletFingerprinting) {
      return PrivacyStatus.SelfChangeVisible;
    }
    if (
      outputs.length > 0 &&
      privacy.matchingOutputCount === fixedOutputs.length
    ) {
      return PrivacyStatus.PerfectPrivacy;
    }
    if (privacy.matchingOutputCount === 0) {
      return PrivacyStatus.NoMatchButSafe;
    }
    return PrivacyStatus.DiverseButSafe;
  }

  const fingerprintTooltip = TOOLTIP_MESSAGES[getPrivacyStatus()];

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
              ) : outputs.length > 0 &&
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
