import React from 'react';
import { Chip, Tooltip } from '@mui/material';
import { Fingerprint, Security } from '@mui/icons-material';

interface OutputFingerprintChipProps {
  outputs: Array<{
    scriptType: string;
    amount: number;
    address?: string;
  }>;
  isChange?: boolean;
}

const OutputFingerprintChip: React.FC<OutputFingerprintChipProps> = ({ outputs, isChange = false }) => {
  // Check if outputs have mixed script types
  const scriptTypes = outputs.map(output => output.scriptType);
  const uniqueScriptTypes = [...new Set(scriptTypes)];
  const hasOutputFingerprinting = uniqueScriptTypes.length > 1;

  // Determine primary script type
  const primaryScriptType = scriptTypes.length > 0 ? scriptTypes[0] : 'Unknown';
  
  const getScriptTypeLabel = (scriptType: string): string => {
    const labels = {
      'P2PKH': 'Legacy',
      'P2SH': 'Nested SegWit',
      'P2WPKH': 'Native SegWit',
      'P2WSH': 'SegWit Script',
      'P2TR': 'Taproot'
    };
    return labels[scriptType as keyof typeof labels] || scriptType;
  };

  const tooltipText = hasOutputFingerprinting
    ? `Output fingerprinting detected! Mixed script types: ${uniqueScriptTypes.map(getScriptTypeLabel).join(', ')}. This may compromise privacy.`
    : `All outputs use ${getScriptTypeLabel(primaryScriptType)}. No output fingerprinting detected.`;

  if (hasOutputFingerprinting) {
    return (
      <Tooltip title={tooltipText} arrow>
        <Chip
          icon={<Fingerprint />}
          label="Output Fingerprinting"
          color="warning"
          variant="filled"
          size="small"
          sx={{
            fontSize: '0.75rem',
            height: '24px',
            '& .MuiChip-icon': {
              width: '16px',
              height: '16px'
            }
          }}
        />
      </Tooltip>
    );
  }

  return (
    <Tooltip title={tooltipText} arrow>
      <Chip
        icon={<Security />}
        label={getScriptTypeLabel(primaryScriptType)}
        color="primary"
        variant="outlined"
        size="small"
        sx={{
          fontSize: '0.75rem',
          height: '24px',
          '& .MuiChip-icon': {
            width: '16px',
            height: '16px'
          }
        }}
      />
    </Tooltip>
  );
};

export default OutputFingerprintChip; 