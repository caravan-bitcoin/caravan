import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Divider,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from "@mui/material";
import { useSelector } from "react-redux";

import { TransactionDetails } from "@caravan/clients";

import { useFeeEstimates } from "clients/fees";
import { getChangeAddresses } from "selectors/wallet";
import { FeeLevelType, FEE_LEVELS, FeeBumpResult } from "../../../../types";
import { useAccelerationModal } from "../../../AccelerationModalContext";
import { useCreateCPFP, useAddressInput } from "../../../hooks";
import { FeeComparison } from "../RBF/FeeComparison";
import { ErrorDialog } from "../../../ErrorDialog";
import { CPFPFeeSlider } from "./CPFPFeeSlider";
import { AddressInputSection } from "../AddressInputSection";

// Calculate original fee rate helper function
const calculateOriginalFeeRate = (transaction: TransactionDetails): number => {
  if (!transaction) return 0;
  const txSize = transaction.vsize || transaction.size;
  return txSize ? transaction.fee / txSize : 0;
};

export const CPFPForm: React.FC = () => {
  const {
    transaction,
    analysis,
    changeOutputIndex,
    txHex,
    availableUtxos,
    state: { selectedStrategy },
    setFeeBumpResult,
    nextStep,
    cpfp,
  } = useAccelerationModal();

  const { data: feeEstimates } = useFeeEstimates();
  const changeAddresses = useSelector(getChangeAddresses);
  const [spendableOutputIndex, setSpendableOutputIndex] = useState<number>(
    changeOutputIndex || 0,
  );
  const [, setCurrentFeeLevel] = useState<FeeLevelType>(FEE_LEVELS.MEDIUM);

  // Error state
  const [error, setError] = useState<string>("");
  const [showErrorDetails, setShowErrorDetails] = useState<boolean>(false);

  const { createCPFP } = useCreateCPFP(transaction!, txHex, availableUtxos);
  const changeAddressInput = useAddressInput({
    availableAddresses: changeAddresses,
  });

  const addressOptions = useMemo(() => {
    return changeAddresses.map((addr, index) => ({
      value: addr,
      label: `Address ${index + 1}: ${addr.slice(0, 8)}...${addr.slice(-6)}`,
      type: "predefined" as const,
    }));
  }, [changeAddresses]);

  const originalFee = transaction!.fee;
  const originalFeeRate = calculateOriginalFeeRate(transaction!);

  // CPFP specific calculations
  const parentVsize = analysis?.vsize;
  const estimatedChildVsize = cpfp?.childSize;
  const combinedVsize = cpfp?.estimatedPackageSize;
  const minimumFeeRate = useMemo(() => {
    const cpfpTargetRate = cpfp?.targetFeeRate
      ? parseFloat(cpfp.targetFeeRate.toString())
      : null;

    return Math.ceil(
      cpfpTargetRate || Math.max(originalFeeRate + 1, feeEstimates?.medium, 1),
    );
  }, [cpfp, originalFeeRate, feeEstimates]);

  const minimumChildFeeRate = useMemo(() => {
    return cpfp?.feeRate ? parseFloat(cpfp.feeRate) : 0;
  }, [cpfp]);

  const [childFeeRate, setChildFeeRate] = useState<number>(minimumChildFeeRate);

  const childFee = useMemo(() => {
    if (!estimatedChildVsize) return 0;
    return Math.ceil(childFeeRate * estimatedChildVsize);
  }, [childFeeRate, estimatedChildVsize]);

  const targetCombinedFee = useMemo(() => {
    return originalFee + childFee;
  }, [originalFee, childFee]);

  const childFeeNeeded = Math.max(0, targetCombinedFee - originalFee);

  const combinedEffectiveRate = useMemo(() => {
    if (!combinedVsize || combinedVsize === 0) return 0;
    return targetCombinedFee / combinedVsize;
  }, [targetCombinedFee, combinedVsize]);

  const spendableOutputs = useMemo(() => {
    if (!transaction?.vout) return [];
    return transaction.vout
      .map((output, index) => ({
        index,
        value: output.value,
        address: output.scriptPubkeyAddress || `Output ${index}`,
      }))
      .filter((_, index) => analysis?.outputs?.[index]?.isMalleable);
  }, [transaction, analysis]);

  const handleSliderChange = (_: Event, newValue: number | number[]) => {
    setChildFeeRate(newValue as number);
    setCurrentFeeLevel(FEE_LEVELS.CUSTOM);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    if (!isNaN(value) && value >= minimumFeeRate) {
      setChildFeeRate(value);
    }
  };

  const handleProcessCPFP = () => {
    // Clear any existing errors
    setError("");
    setShowErrorDetails(false);

    // Validate form
    if (childFeeRate < minimumChildFeeRate) {
      setError(
        `Child fee rate must be at least ${minimumChildFeeRate.toFixed(2)} sats/vB`,
      );
      setShowErrorDetails(true);
      return;
    }

    if (!changeAddressInput.address.trim()) {
      setError("Change address is required for CPFP");
      setShowErrorDetails(true);
      return;
    }

    if (spendableOutputs.length === 0) {
      setError("No spendable outputs available for CPFP");
      setShowErrorDetails(true);
      return;
    }

    try {
      const psbtBase64 = createCPFP(
        combinedEffectiveRate,
        spendableOutputIndex,
        changeAddressInput.address,
      );

      const result: FeeBumpResult = {
        psbtBase64,
        newFee: targetCombinedFee.toString(),
        newFeeRate: combinedEffectiveRate,
        strategy: selectedStrategy!,
        isCancel: false,
        createdAt: new Date().toISOString(),
      };

      // Store the PSBT in context
      setFeeBumpResult(result);
      nextStep();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? `Failed to create CPFP transaction: ${error.message}`
          : "An unexpected error occurred while creating the CPFP transaction";
      setError(errorMessage);
      setShowErrorDetails(true);
    }
  };

  // Calculate max fee rate
  const maxFeeRate = useMemo(() => {
    return Math.max(
      originalFeeRate + 1,
      minimumFeeRate + 1,
      1000, // Maximum ceiling of 1000 sats/vB
    );
  }, [minimumFeeRate, feeEstimates]);

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Configure CPFP Transaction
      </Typography>

      {/* Show error dialog if there's an error */}
      {error && (
        <ErrorDialog
          error={error}
          showErrorDetails={showErrorDetails}
          setShowErrorDetails={setShowErrorDetails}
        />
      )}

      {/* CPFP Information Alert */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          Child-Pays-for-Parent (CPFP) creates a new transaction that spends an
          output from your unconfirmed transaction. The child transaction pays a
          high enough fee to incentivize miners to confirm both transactions
          together.
        </Typography>
      </Alert>

      {/* Spendable Output Selection */}
      <Box mb={3}>
        <FormControl fullWidth>
          <InputLabel id="spendable-output-label">
            Select Output to Spend
          </InputLabel>
          <Select
            labelId="spendable-output-label"
            value={spendableOutputIndex}
            onChange={(e) => setSpendableOutputIndex(e.target.value as number)}
            label="Select Output to Spend"
          >
            {spendableOutputs.map((output) => (
              <MenuItem key={output.index} value={output.index}>
                Output {output.index}: {output.value} sats ({output.address})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {spendableOutputs.length === 0 && (
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            No spendable outputs available. CPFP cannot be performed on this
            transaction.
          </Typography>
        )}
      </Box>

      {/* Change Address Input */}
      <AddressInputSection
        title="Change Address"
        description="Select where to receive the remaining funds after fees"
        address={changeAddressInput.address}
        onAddressChange={changeAddressInput.handleAddressChange}
        addressOptions={addressOptions}
        selectionType={changeAddressInput.selectionType}
        onSelectionTypeChange={changeAddressInput.handleSelectionTypeChange}
        required={true}
        infoMessage="The change address receives any leftover funds after the child transaction fee is paid."
      />

      <Divider sx={{ my: 2 }} />

      {/* Fee Rate Selection */}
      <Box mb={3}>
        <CPFPFeeSlider
          feeBumpRate={childFeeRate}
          onSliderChange={handleSliderChange}
          onInputChange={handleInputChange}
          minimumFeeRate={minimumChildFeeRate}
          maxFeeRate={maxFeeRate}
          feeEstimates={feeEstimates || {}}
        />

        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Parent fee rate: {originalFeeRate.toFixed(2)} sats/vB
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Child fee rate: {childFeeRate.toFixed(2)} sats/vB
          </Typography>
          <Typography variant="body2" fontWeight="medium">
            Combined effective rate: {combinedEffectiveRate.toFixed(2)} sats/vB
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Fee comparison */}
      <Box mb={3}>
        <Typography variant="subtitle1" gutterBottom fontWeight="medium">
          CPFP Transaction Details
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Parent transaction: {parentVsize} vBytes
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Estimated child transaction: ~{estimatedChildVsize} vBytes
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Combined size: {combinedVsize} vBytes
        </Typography>
      </Box>

      <FeeComparison
        originalFee={originalFee}
        estimatedNewFee={targetCombinedFee}
        feeDifference={childFeeNeeded}
      />

      {/* Submit button */}
      <Box display="flex" justifyContent="flex-end">
        <Button
          variant="contained"
          color="primary"
          onClick={handleProcessCPFP}
          size="large"
          disabled={
            !changeAddressInput.address.trim() ||
            spendableOutputs.length === 0 ||
            childFeeRate < minimumFeeRate
          }
        >
          Create CPFP Transaction
        </Button>
      </Box>
    </Paper>
  );
};
