import React from 'react';
import { Chip, Tooltip } from '@mui/material';
import { Warning, CheckCircle } from '@mui/icons-material';

interface DustChipProps {
  amountSats: number;
  feeRate: number;
  scriptType?: string;
  isDust: boolean;
}

const DustChip: React.FC<DustChipProps> = ({ amountSats, feeRate, scriptType = 'P2WPKH', isDust }) => {

  const tooltipText = isDust 
    ? `This UTXO (${amountSats} sats) may be considered dust at the current fee rate.`
    : `This UTXO (${amountSats} sats) is spendable at the current fee rate.`;

  return (
    <Tooltip title={tooltipText} arrow>
      <Chip
        icon={isDust ? <Warning /> : <CheckCircle />}
        label={isDust ? 'Dust' : 'Spendable'}
        color={isDust ? 'error' : 'success'}
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

export default DustChip; 