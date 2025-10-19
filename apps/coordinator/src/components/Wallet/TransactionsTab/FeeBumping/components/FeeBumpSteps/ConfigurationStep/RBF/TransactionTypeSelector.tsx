/* eslint-disable react/prop-types */
import React from "react";
import {
  Box,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
  Divider,
} from "@mui/material";
import { AddressInputSection } from "./AddressInputSection";
import { RBF_TYPES, RbfType } from "../../../../types";

interface AddressOption {
  value: string;
  label: string;
  type: "predefined" | "custom";
}

interface TransactionTypeSelectorProps {
  rbfType: RbfType;
  onRbfTypeChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
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
      addressOptions,
      cancelAddressSelectionType,
      onCancelAddressSelectionChange,
      onCancelSelectionTypeChange,
      changeAddressSelectionType,
      onChangeAddressSelectionChange,
      onChangeSelectionTypeChange,
    }) => {
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

          <AddressInputSection
            rbfType={rbfType}
            cancelAddress={cancelAddress}
            onCancelAddressChange={onCancelAddressChange}
            changeAddress={changeAddress}
            onChangeAddressChange={onChangeAddressChange}
            addressOptions={addressOptions}
            cancelAddressSelectionType={cancelAddressSelectionType}
            onCancelAddressSelectionChange={onCancelAddressSelectionChange}
            changeAddressSelectionType={changeAddressSelectionType}
            onChangeAddressSelectionChange={onChangeAddressSelectionChange}
            onCancelSelectionTypeChange={onCancelSelectionTypeChange}
            onChangeSelectionTypeChange={onChangeSelectionTypeChange}
          />

          <Divider sx={{ my: 2 }} />
        </>
      );
    },
  );

TransactionTypeSelector.displayName = "TransactionTypeSelector";
