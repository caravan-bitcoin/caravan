import React from 'react';
import { Box, Typography, Grid, Tooltip } from '@mui/material';
import { Shield, CleaningServices } from '@mui/icons-material';
import { useTransactionAnalysis } from '../hooks/useTransactionAnalysis';
import DustChip from './DustChip';
import OutputFingerprintChip from './OutputFingerprintChip';
import ScriptTypeChip from './ScriptTypeChip';

interface UTXO {
  txid: string;
  index: number;
  amountSats: number;
  scriptType: string;
  confirmed: boolean;
}

interface Output {
  address: string;
  amountSats: number;
  scriptType: string;
}

interface TransactionAnalysisProps {
  inputs: UTXO[];
  outputs: Output[];
  feeRate: number;
}

/**
 * Shows script type fingerprinting for transaction outputs.
 */
const ScriptTypeAnalysis: React.FC<{ outputs: Output[] }> = ({ outputs }) => {
  const { fingerprinting, summary } = useTransactionAnalysis({ outputs, inputs: [], feeRate: 0 });

  if (fingerprinting.hasFingerprinting) {
    return (
      <Tooltip title={`This transaction uses mixed script types: ${fingerprinting.scriptTypes.join(', ')}`}>
        <span>
          <OutputFingerprintChip outputs={outputs.map(o => ({ ...o, amount: o.amountSats }))} />
        </span>
      </Tooltip>
    );
  }

  if (summary.outputCount > 0 && fingerprinting.primaryScriptType) {
    return <ScriptTypeChip scriptType={fingerprinting.primaryScriptType} />;
  }

  return <Typography variant="body2" color="textSecondary">N/A</Typography>;
};

/**
 * Shows dust analysis for transaction inputs.
 */
const DustAnalysis: React.FC<{ inputs: UTXO[]; feeRate: number }> = ({ inputs, feeRate }) => {
  const { dust } = useTransactionAnalysis({ inputs, outputs: [], feeRate });

  if (!dust.hasDustInputs) {
    return <Typography variant="body2" color="textSecondary">No dust inputs detected.</Typography>;
  }

  return (
    <Box>
      {inputs.map((input) => (
        <DustChip
          key={`${input.txid}-${input.index}`}
          amountSats={input.amountSats}
          feeRate={feeRate}
          scriptType={input.scriptType}
          isDust={dust.inputs.some(d => d.txid === input.txid && d.index === input.index)}
        />
      ))}
    </Box>
  );
};

/**
 * Main component: TransactionAnalysis
 * Shows script type fingerprinting and dust analysis for the current transaction.
 */
const TransactionAnalysis: React.FC<TransactionAnalysisProps> = ({ inputs, outputs, feeRate }) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>Transaction Analysis</Typography>

      {/* Output script type fingerprinting */}
      <Grid container spacing={2} alignItems="center">
        <Grid item>
          <Tooltip title="Analyzes the script types of the transaction outputs for potential privacy leaks (output fingerprinting).">
            <Shield fontSize="small" />
          </Tooltip>
        </Grid>
        <Grid item>
          <Typography variant="subtitle1">Output Script Types</Typography>
        </Grid>
        <Grid item>
          <ScriptTypeAnalysis outputs={outputs} />
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
          <DustAnalysis inputs={inputs} feeRate={feeRate} />
        </Grid>
      </Grid>
    </Box>
  );
};

export default TransactionAnalysis;