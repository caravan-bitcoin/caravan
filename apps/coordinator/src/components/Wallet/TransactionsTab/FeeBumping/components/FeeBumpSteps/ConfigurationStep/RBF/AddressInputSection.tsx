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
  RadioGroup,
  FormControlLabel,
  Radio,
  Chip,
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
  onCancelSelectionTypeChange: (type: "predefined" | "custom") => void;
  changeAddressSelectionType: "predefined" | "custom";
  onChangeAddressSelectionChange: (value: string) => void;
  onChangeSelectionTypeChange: (type: "predefined" | "custom") => void;
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
      onCancelSelectionTypeChange,
      changeAddressSelectionType,
      onChangeAddressSelectionChange,
      onChangeSelectionTypeChange,
    }) => {
      const isCancel = rbfType === RBF_TYPES.CANCEL;
      const hasAddressError = isCancel && !cancelAddress.trim();

      const predefinedAddresses = addressOptions.filter(
        (opt) => opt.type === "predefined",
      );

      if (isCancel) {
        // Cancel Address Section
        return (
          <Box mb={3}>
            <Typography variant="subtitle1" gutterBottom fontWeight="medium">
              Cancel Address
            </Typography>

            {/* Radio Group for Selection Type */}
            <RadioGroup
              value={cancelAddressSelectionType}
              onChange={(e) => {
                const newType = e.target.value as "predefined" | "custom";
                onCancelSelectionTypeChange(newType);
              }}
              sx={{ mb: 2 }}
            >
              <FormControlLabel
                value="predefined"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body2">Use wallet address</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Select from your change addresses
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="custom"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body2">
                      Enter custom address
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Manually specify a Bitcoin address
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>

            {/* Show dropdown if predefined is selected */}
            {cancelAddressSelectionType === "predefined" && (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="cancel-address-select-label">
                  Select Address
                </InputLabel>
                <Select
                  labelId="cancel-address-select-label"
                  value={cancelAddress}
                  onChange={(e) =>
                    onCancelAddressSelectionChange(e.target.value)
                  }
                  label="Select Address"
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Chip
                        label={`${selected.slice(0, 10)}...${selected.slice(-8)}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Box>
                  )}
                >
                  {predefinedAddresses.map((option, index) => (
                    <MenuItem key={option.value} value={option.value}>
                      <Box>
                        <Typography variant="body2">
                          Address {index + 1}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontFamily: "monospace" }}
                        >
                          {option.value}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Show text field if custom is selected */}
            {cancelAddressSelectionType === "custom" && (
              <TextField
                fullWidth
                label="Custom Cancel Address"
                value={cancelAddress}
                onChange={onCancelAddressChange}
                error={hasAddressError}
                placeholder="bc1q... or 1... or 3..."
                helperText={
                  hasAddressError
                    ? "Cancel address is required"
                    : "Enter a valid Bitcoin address to receive all funds (minus fees)"
                }
                required
                sx={{ mb: 2, fontFamily: "monospace" }}
                inputProps={{
                  style: { fontFamily: "monospace" },
                }}
              />
            )}

            <Alert severity="warning">
              This will cancel the original transaction and send all funds
              (minus fees) to this address.
            </Alert>
          </Box>
        );
      } else {
        // Change Address Section (Accelerate)
        return (
          <Box mb={3}>
            <Typography variant="subtitle1" gutterBottom fontWeight="medium">
              Change Address (Optional)
            </Typography>

            {/* Radio Group for Selection Type */}
            <RadioGroup
              value={changeAddressSelectionType}
              onChange={(e) => {
                const newType = e.target.value as "predefined" | "custom";
                onChangeSelectionTypeChange(newType);
              }}
              sx={{ mb: 2 }}
            >
              <FormControlLabel
                value="predefined"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body2">Use wallet address</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Select from your change addresses
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="custom"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body2">
                      Enter custom address
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Manually specify a Bitcoin address
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>

            {/* Show dropdown if predefined is selected */}
            {changeAddressSelectionType === "predefined" && (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="change-address-select-label">
                  Select Change Address
                </InputLabel>
                <Select
                  labelId="change-address-select-label"
                  value={changeAddress}
                  onChange={(e) =>
                    onChangeAddressSelectionChange(e.target.value)
                  }
                  label="Select Change Address"
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Chip
                        label={`${selected.slice(0, 10)}...${selected.slice(-8)}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Box>
                  )}
                >
                  {predefinedAddresses.map((option, index) => (
                    <MenuItem key={option.value} value={option.value}>
                      <Box>
                        <Typography variant="body2">
                          Change Address {index + 1}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontFamily: "monospace" }}
                        >
                          {option.value}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Show text field if custom is selected */}
            {changeAddressSelectionType === "custom" && (
              <TextField
                fullWidth
                label="Custom Change Address"
                value={changeAddress}
                onChange={onChangeAddressChange}
                placeholder="bc1q... or 1... or 3... (optional)"
                helperText="Leave empty to use the default change address from the transaction"
                sx={{ mb: 2, fontFamily: "monospace" }}
                inputProps={{
                  style: { fontFamily: "monospace" },
                }}
              />
            )}

            {/* Info about change address */}
            <Alert severity="info" sx={{ mt: 1 }}>
              <Typography variant="body2">
                The change address receives any leftover funds after sending the
                payment and fees. Using a custom address is optional.
              </Typography>
            </Alert>
          </Box>
        );
      }
    },
  );

AddressInputSection.displayName = "AddressInputSection";
