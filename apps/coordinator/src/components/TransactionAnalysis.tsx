import React from "react";
import { Box, Typography, Grid, Tooltip } from "@mui/material";
import { Shield, CleaningServices } from "@mui/icons-material";
import { analyzeTransaction } from "../hooks/useTransactionAnalysis";
import DustChip from "./ScriptExplorer/DustChip";
import OutputFingerprintChip from "./OutputFingerprintChip";
import ScriptTypeChip from "./ScriptTypeChip";
import { useSelector } from "react-redux";
import type { UTXO, TransactionOutput } from "./transaction";

interface TransactionAnalysisProps {
  inputs: UTXO[];
  outputs: TransactionOutput[];
  feeRate: number;
}

/**
 * Shows wallet fingerprinting for transaction outputs.
 */
const WalletFingerprintAnalysis: React.FC<{ outputs: TransactionOutput[]; addressType: string; requiredSigners: number; totalSigners: number }> = ({ outputs, addressType, requiredSigners, totalSigners }) => {
  // Ensure scriptType is always a string
  const fixedOutputs = outputs.map((o) => ({
    ...o,
    scriptType: o.scriptType ?? "",
  }));
  const { walletFingerprinting, summary } = analyzeTransaction({
    outputs: fixedOutputs,
    inputs: [],
    feeRate: 0,
    addressType,
    requiredSigners,
    totalSigners,
  });

  //  tooltips for each case
  let tooltip = '';
  if (walletFingerprinting.hasWalletFingerprinting) {
    if (fixedOutputs.length === 1) {
      tooltip = "Privacy Warning: You're sending all funds back to an address of your own wallet type. This clearly reveals your wallet's balance and links your transactions together.";
    } else {
      tooltip = "Privacy Warning: This transaction makes it easy for anyone watching the blockchain to spot your change address and link your future transactions. For better privacy, try to send funds only to addresses of the same type as your wallet, or split your payments if possible.";
    }
    return (
      <Tooltip title={tooltip}>
        <span>
          <OutputFingerprintChip
            outputs={fixedOutputs.map((o) => ({
              ...o,
              amount: o.amountSats,
            }))}
            warning
            label={fixedOutputs.length === 1 ? addressType : "Output Fingerprinting"}
          />
        </span>
      </Tooltip>
    );
  }

  if (summary.outputCount > 0 && walletFingerprinting.matchingOutputCount === fixedOutputs.length) {
    tooltip = "Great! All outputs match your wallet's address type. Your change stays private and your wallet is harder to track.";
    return (
      <Tooltip title={tooltip}>
        <span>
          <ScriptTypeChip scriptType={addressType} color="success" icon={undefined} variant="filled" />
        </span>
      </Tooltip>
    );
  }

  if (walletFingerprinting.matchingOutputCount === 0) {
    tooltip = "No privacy risk detected. None of the outputs match your wallet's address type, so your wallet remains private in this transaction.";
  } else {
    tooltip = "Looking good! The outputs are diverse enough that your change address can't be easily identified. Your privacy is protected in this transaction.";
  }
  return (
    <Tooltip title={tooltip}>
      <span>
        <ScriptTypeChip scriptType="N/A" color="default" icon={undefined} variant="outlined" />
      </span>
    </Tooltip>
  );
};

/**
 * Shows dust analysis for transaction inputs.
 */
const DustAnalysis: React.FC<{ inputs: UTXO[]; feeRate: number; addressType: string; requiredSigners: number; totalSigners: number }> = ({
  inputs,
  feeRate,
  addressType,
  requiredSigners,
  totalSigners,
}) => {
  const { dust } = analyzeTransaction({ inputs, outputs: [], feeRate, addressType, requiredSigners, totalSigners });

  if (!dust.hasDustInputs) {
    return (
      <Typography variant="body2" color="textSecondary">
        No dust inputs detected.
      </Typography>
    );
  }

  return (
    <Box>
      {inputs.map((input) => (
        <DustChip
          key={`${input.txid}-${input.index}`}
          amountSats={input.amountSats}
          feeRate={feeRate}
        />
      ))}
    </Box>
  );
};

/**
 * Main component: TransactionAnalysis
 * Shows wallet fingerprinting and dust analysis for the current transaction.
 */
const TransactionAnalysis: React.FC<TransactionAnalysisProps> = ({
  inputs,
  outputs,
  feeRate,
}) => {
  // Get required config from Redux
  const { addressType, requiredSigners, totalSigners } = useSelector((state: any) => ({
    addressType: state.settings?.addressType,
    requiredSigners: state.settings?.requiredSigners,
    totalSigners: state.settings?.totalSigners,
  }));

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Transaction Analysis
      </Typography>

      {/* Wallet fingerprinting analysis */}
      <Grid container spacing={2} alignItems="center">
        <Grid item>
          <Tooltip title="Analyzes the outputs for wallet fingerprinting privacy leaks (change detection).">
            <Shield fontSize="small" />
          </Tooltip>
        </Grid>
        <Grid item>
          <Typography variant="subtitle1">Wallet Fingerprinting</Typography>
        </Grid>
        <Grid item>
          <WalletFingerprintAnalysis outputs={outputs} addressType={addressType} requiredSigners={requiredSigners} totalSigners={totalSigners} />
        </Grid>
      </Grid>

      {/* Input dust analysis */}
      <Grid container spacing={2} alignItems="center" sx={{ mt: 0.5 }}>
        <Grid item>
          <Tooltip title="Analyzes transaction inputs to see if any are considered 'dust' (value may be less than the fee to spend it).">
            <CleaningServices fontSize="small" />
          </Tooltip>
        </Grid>
        <Grid item>
          <Typography variant="subtitle1">Input Dust</Typography>
        </Grid>
        <Grid item>
          <DustAnalysis inputs={inputs} feeRate={feeRate} addressType={addressType} requiredSigners={requiredSigners} totalSigners={totalSigners} />
        </Grid>
      </Grid>
    </Box>
  );
};

export default TransactionAnalysis;
