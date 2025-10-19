/* eslint-disable react/prop-types */
import React from "react";
import {
  Box,
  TextField,
  Typography,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { RBF_TYPES, RbfType } from "../../../../types";

interface AddressOption {
  value: string;
  label: string;
  type: "predefined" | "custom";
}

interface AddressInputSectionProps {
  rbfType: RbfType;
  cancelAddress: string;
  onCancelAddressChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  changeAddress: string;
  onChangeAddressChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  addressOptions: AddressOption[];
  cancelAddressSelectionType: "predefined" | "custom";
  onCancelAddressSelectionChange: (value: string) => void;
  changeAddressSelectionType: "predefined" | "custom";
  onChangeAddressSelectionChange: (value: string) => void;
}

export const AddressInputSection: React.FC<AddressInputSectionProps> =
  React.memo(
    ({
      rbfType,
      cancelAddress,
      onCancelAddressChange,
      changeAddress,
      onChangeAddressChange,
      addressOptions,
      cancelAddressSelectionType,
      onCancelAddressSelectionChange,
      changeAddressSelectionType,
      onChangeAddressSelectionChange,
    }) => {
      const isCancel = rbfType === RBF_TYPES.CANCEL;
      const hasAddressError = isCancel && !cancelAddress.trim();

      if (isCancel) {
        // Cancel Address Section with Dropdown
        return (
          <Box mb={3}>
            <Typography variant="subtitle1" gutterBottom fontWeight="medium">
              Cancel Address
            </Typography>

            {/* Dropdown for address selection */}
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="cancel-address-select-label">
                Select Cancel Address
              </InputLabel>
              <Select
                labelId="cancel-address-select-label"
                value={
                  cancelAddressSelectionType === "custom"
                    ? "custom"
                    : cancelAddress
                }
                onChange={(e) => onCancelAddressSelectionChange(e.target.value)}
                label="Select Cancel Address"
              >
                {addressOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Custom Address Input */}
            {cancelAddressSelectionType === "custom" && (
              <TextField
                fullWidth
                label="Custom Cancel Address"
                value={cancelAddress}
                onChange={onCancelAddressChange}
                error={hasAddressError}
                placeholder="Enter the address to send all funds to"
                helperText={
                  hasAddressError
                    ? "Cancel address is required"
                    : "Enter an address where you want to send all funds (minus fees)"
                }
                required
                sx={{ mb: 1 }}
              />
            )}

            {/* Selected Address Display */}
            {cancelAddressSelectionType === "predefined" && cancelAddress && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Selected: {cancelAddress}
              </Typography>
            )}

            <Alert severity="warning" sx={{ mt: 2 }}>
              This will cancel the original transaction and send all funds
              (minus fees) to this address.
            </Alert>
          </Box>
        );
      } else {
        return (
          <Box mb={3}>
            <Typography variant="subtitle1" gutterBottom fontWeight="medium">
              Change Address (Optional)
            </Typography>

            {/* Dropdown for address selection */}
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="change-address-select-label">
                Select Change Address
              </InputLabel>
              <Select
                labelId="change-address-select-label"
                value={
                  changeAddressSelectionType === "custom"
                    ? "custom"
                    : changeAddress || "custom"
                }
                onChange={(e) => onChangeAddressSelectionChange(e.target.value)}
                label="Select Change Address"
              >
                {addressOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Custom Address Input */}
            {changeAddressSelectionType === "custom" && (
              <TextField
                fullWidth
                label="Custom Change Address"
                value={changeAddress}
                onChange={onChangeAddressChange}
                placeholder="Enter custom change address (optional)"
                helperText="Leave empty to use the default change address from the transaction"
                sx={{ mb: 1 }}
              />
            )}

            {/* Selected Address Display */}
            {changeAddressSelectionType === "predefined" && changeAddress && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Selected: {changeAddress}
              </Typography>
            )}
          </Box>
        );
      }
    },
  );

AddressInputSection.displayName = "AddressInputSection";
