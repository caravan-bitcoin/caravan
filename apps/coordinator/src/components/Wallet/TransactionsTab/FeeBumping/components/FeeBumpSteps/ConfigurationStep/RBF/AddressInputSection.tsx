/* eslint-disable react/prop-types */
import React from "react";
import { Box, TextField, Typography, Alert } from "@mui/material";
import { RBF_TYPES, RbfType } from "../../../../types";

interface AddressInputSectionProps {
  rbfType: RbfType;
  cancelAddress: string;
  onCancelAddressChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  changeAddress: string;
  onChangeAddressChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const AddressInputSection: React.FC<AddressInputSectionProps> =
  React.memo(
    ({
      rbfType,
      cancelAddress,
      onCancelAddressChange,
      changeAddress,
      onChangeAddressChange,
    }) => {
      const isCancel = rbfType === RBF_TYPES.CANCEL;
      const hasAddressError = isCancel && !cancelAddress.trim();

      // Dynamic configuration based on transaction type
      const config = isCancel
        ? {
            title: "Cancel Address",
            label: "Address to send funds to",
            value: cancelAddress,
            onChange: onCancelAddressChange,
            helperText: hasAddressError
              ? "Cancel address is required"
              : "Enter an address where you want to send all funds",
            showAlert: true,
            alertMessage:
              "This will cancel the original transaction and send all funds (minus fees) to this address.",
          }
        : {
            title: "Change Address (Optional)",
            label: "Change Address",
            value: changeAddress,
            onChange: onChangeAddressChange,
            helperText: "Leave empty to use the default change address",
            showAlert: false,
            alertMessage: "",
          };

      return (
        <Box mb={3}>
          <Typography variant="subtitle1" gutterBottom fontWeight="medium">
            {config.title}
          </Typography>

          <TextField
            fullWidth
            label={config.label}
            variant="outlined"
            value={config.value}
            onChange={config.onChange}
            error={hasAddressError}
            helperText={config.helperText}
            sx={{ mb: 1 }}
          />

          {config.showAlert && (
            <Alert severity="warning">{config.alertMessage}</Alert>
          )}
        </Box>
      );
    },
  );

AddressInputSection.displayName = "AddressInputSection";
