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

interface AddressOption {
  value: string;
  label: string;
  type: "predefined" | "custom";
}

interface AddressInputSectionProps {
  title: string;
  description?: string;
  address: string;
  onAddressChange: (value: string) => void;
  addressOptions: AddressOption[];
  selectionType: "predefined" | "custom";
  onSelectionTypeChange: (type: "predefined" | "custom") => void;
  required?: boolean;
  helperText?: string;
  warningMessage?: string;
  infoMessage?: string;
}

export const AddressInputSection: React.FC<AddressInputSectionProps> =
  React.memo(
    ({
      title,
      description,
      address,
      onAddressChange,
      addressOptions,
      selectionType,
      onSelectionTypeChange,
      required = false,
      helperText,
      warningMessage,
      infoMessage,
    }) => {
      const hasAddressError = required && !address.trim();

      const predefinedAddresses = addressOptions.filter(
        (opt) => opt.type === "predefined",
      );

      return (
        <Box mb={3}>
          <Typography variant="subtitle1" gutterBottom fontWeight="medium">
            {title}
          </Typography>
          {description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {description}
            </Typography>
          )}

          {/* Radio Group for Selection Type */}
          <RadioGroup
            value={selectionType}
            onChange={(e) => {
              const newType = e.target.value as "predefined" | "custom";
              onSelectionTypeChange(newType);
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
                  <Typography variant="body2">Enter custom address</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Manually specify a Bitcoin address
                  </Typography>
                </Box>
              }
            />
          </RadioGroup>

          {/* Show dropdown if predefined is selected */}
          {selectionType === "predefined" && (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="address-select-label">Select Address</InputLabel>
              <Select
                labelId="address-select-label"
                value={address}
                onChange={(e) => onAddressChange(e.target.value)}
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
          {selectionType === "custom" && (
            <TextField
              fullWidth
              label={`Custom ${title}`}
              value={address}
              onChange={(e) => onAddressChange(e.target.value)}
              error={hasAddressError}
              placeholder="bc1q... or 1... or 3..."
              helperText={
                hasAddressError
                  ? `${title} is required`
                  : helperText || "Enter a valid Bitcoin address"
              }
              required={required}
              sx={{ mb: 2, fontFamily: "monospace" }}
              inputProps={{
                style: { fontFamily: "monospace" },
              }}
            />
          )}

          {/* Optional selected address display for predefined */}
          {selectionType === "predefined" && address && (
            <Box
              sx={{
                mt: 2,
                p: 2,
                backgroundColor: "rgba(25, 118, 210, 0.08)",
                borderRadius: 1,
                border: "1px solid rgba(25, 118, 210, 0.3)",
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mb: 0.5, display: "block" }}
              >
                Selected Address:
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontFamily: "monospace",
                  fontWeight: 500,
                  wordBreak: "break-all",
                }}
              >
                {address}
              </Typography>
            </Box>
          )}

          {/* Conditional alerts */}
          {warningMessage && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {warningMessage}
            </Alert>
          )}
          {infoMessage && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">{infoMessage}</Typography>
            </Alert>
          )}

          {predefinedAddresses.length === 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              No change addresses available in your wallet
            </Alert>
          )}
        </Box>
      );
    },
  );

AddressInputSection.displayName = "AddressInputSection";
