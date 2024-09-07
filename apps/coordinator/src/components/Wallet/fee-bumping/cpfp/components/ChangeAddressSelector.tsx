import React from "react";
import { Typography, FormControlLabel, Switch, TextField } from "@mui/material";
import { StyledPaper } from "../styles";

interface ChangeAddressSelectorProps {
  useCustomAddress: boolean;
  setUseCustomAddress: (use: boolean) => void;
  customAddress: string;
  setCustomAddress: (address: string) => void;
  defaultChangeAddress: string;
}

const ChangeAddressSelector: React.FC<ChangeAddressSelectorProps> = ({
  useCustomAddress,
  setUseCustomAddress,
  customAddress,
  setCustomAddress,
  defaultChangeAddress,
}) => {
  return (
    <StyledPaper elevation={3}>
      <Typography variant="h6" gutterBottom>
        Change Address
      </Typography>
      <FormControlLabel
        control={
          <Switch
            checked={useCustomAddress}
            onChange={(e) => setUseCustomAddress(e.target.checked)}
          />
        }
        label="Use custom change address"
      />
      {useCustomAddress && (
        <TextField
          fullWidth
          label="Custom Change Address"
          value={customAddress}
          onChange={(e) => setCustomAddress(e.target.value)}
          margin="normal"
          variant="outlined"
        />
      )}
      {!useCustomAddress && (
        <Typography variant="body2">
          Using default change address: {defaultChangeAddress}
        </Typography>
      )}
    </StyledPaper>
  );
};

export default ChangeAddressSelector;
