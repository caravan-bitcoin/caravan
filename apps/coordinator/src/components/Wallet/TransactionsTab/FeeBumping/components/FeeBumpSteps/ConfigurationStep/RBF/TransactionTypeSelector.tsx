/* eslint-disable react/prop-types */
import React, { useMemo } from "react";
import {
  Box,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
  Divider,
} from "@mui/material";
import { AddressInputSection } from "../AddressInputSection";
import { RBF_TYPES, RbfType } from "../../../../types";

interface AddressOption {
  value: string;
  label: string;
  type: "predefined" | "custom";
}

interface AddressInputHook {
  address: string;
  selectionType: "predefined" | "custom";
  handleSelectionTypeChange: (type: "predefined" | "custom") => void;
  handleAddressChange: (value: string) => void;
}

interface TransactionTypeSelectorProps {
  rbfType: RbfType;
  onRbfTypeChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  cancelAddressInput: AddressInputHook;
  changeAddressInput: AddressInputHook;
  addressOptions: AddressOption[];
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
      cancelAddressInput,
      changeAddressInput,
      addressOptions,
    }) => {
      const isCancel = rbfType === RBF_TYPES.CANCEL;
      const addressInputProps = useMemo(() => {
        if (isCancel) {
          // Configuration for cancel transactions
          return {
            title: "Cancel Address",
            description: "Select where to receive all funds (minus fees)",
            address: cancelAddressInput.address,
            onAddressChange: cancelAddressInput.handleAddressChange,
            addressOptions,
            selectionType: cancelAddressInput.selectionType,
            onSelectionTypeChange: cancelAddressInput.handleSelectionTypeChange,
            required: true,
            helperText:
              "Enter a valid Bitcoin address to receive all funds (minus fees)",
            warningMessage:
              "This will cancel the original transaction and send all funds (minus fees) to this address.",
          };
        } else {
          // Configuration for accelerate transactions
          return {
            title: "Change Address",
            description:
              "Select where to receive the remaining funds after fees (optional)",
            address: changeAddressInput.address,
            onAddressChange: changeAddressInput.handleAddressChange,
            addressOptions,
            selectionType: changeAddressInput.selectionType,
            onSelectionTypeChange: changeAddressInput.handleSelectionTypeChange,
            required: false,
            helperText:
              "Leave empty to use the default change address from the transaction",
            infoMessage:
              "The change address receives any leftover funds after sending the payment and fees. Using a custom address is optional.",
          };
        }
      }, [isCancel, cancelAddressInput, changeAddressInput, addressOptions]);

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

          <AddressInputSection {...addressInputProps} />

          <Divider sx={{ my: 2 }} />
        </>
      );
    },
  );

TransactionTypeSelector.displayName = "TransactionTypeSelector";
