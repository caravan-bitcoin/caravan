/* eslint-disable react/prop-types */
import React from "react";
import {
  Box,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
  Typography,
  Alert,
  Divider,
} from "@mui/material";
import { RBF_TYPES, RbfType } from "../../../../types";

interface TransactionTypeSelectorProps {
  rbfType: RbfType;
  onRbfTypeChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  cancelAddress: string;
  onCancelAddressChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  changeAddress: string;
  onChangeAddressChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

// Transaction option label component
const TransactionOptionLabel: React.FC<{
  title: string;
  description: string;
}> = React.memo(({ title, description }) => (
  <Box>
    <Typography variant="body1">{title}</Typography>
    <Typography variant="body2" color="text.secondary">
      {description}
    </Typography>
  </Box>
));

TransactionOptionLabel.displayName = "TransactionOptionLabel";

export const TransactionTypeSelector: React.FC<TransactionTypeSelectorProps> =
  React.memo(
    ({
      rbfType,
      onRbfTypeChange,
      cancelAddress,
      onCancelAddressChange,
      changeAddress,
      onChangeAddressChange,
    }) => {
      const hasAddressError =
        rbfType === RBF_TYPES.CANCEL && !cancelAddress.trim();

      return (
        <>
          <Box mb={3}>
            <Typography variant="subtitle1" gutterBottom fontWeight="medium">
              Transaction Type
            </Typography>
            <FormControl component="fieldset">
              <RadioGroup
                aria-label="rbf-type"
                name="rbf-type"
                value={rbfType}
                onChange={onRbfTypeChange}
              >
                <FormControlLabel
                  value={RBF_TYPES.ACCELERATE}
                  control={<Radio />}
                  label={
                    <TransactionOptionLabel
                      title="Accelerate Transaction"
                      description="Keep the same recipient but increase the fee to speed up confirmation"
                    />
                  }
                />
                <FormControlLabel
                  value={RBF_TYPES.CANCEL}
                  control={<Radio />}
                  label={
                    <TransactionOptionLabel
                      title="Cancel Transaction"
                      description="Replace the transaction and redirect all funds to a new address"
                    />
                  }
                />
              </RadioGroup>
            </FormControl>
          </Box>

          <Divider sx={{ my: 2 }} />

          {rbfType === RBF_TYPES.CANCEL ? (
            <Box mb={3}>
              <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                Cancel Address
              </Typography>
              <TextField
                fullWidth
                label="Address to send funds to"
                variant="outlined"
                value={cancelAddress}
                onChange={onCancelAddressChange}
                error={hasAddressError}
                helperText={
                  hasAddressError
                    ? "Cancel address is required"
                    : "Enter an address where you want to send all funds"
                }
                sx={{ mb: 1 }}
              />
              <Alert severity="warning">
                This will cancel the original transaction and send all funds
                (minus fees) to this address.
              </Alert>
            </Box>
          ) : (
            <Box mb={3}>
              <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                Change Address (Optional)
              </Typography>
              <TextField
                fullWidth
                label="Change Address"
                variant="outlined"
                value={changeAddress}
                onChange={onChangeAddressChange}
                helperText="Leave empty to use the default change address"
                sx={{ mb: 1 }}
              />
            </Box>
          )}

          <Divider sx={{ my: 2 }} />
        </>
      );
    },
  );

TransactionTypeSelector.displayName = "TransactionTypeSelector";
