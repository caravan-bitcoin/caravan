import React, { useCallback, useMemo, useState } from "react";
import {
  Box,
  Button,
  Divider,
  Paper,
  Typography,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
} from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import { FeeLevelType, FEE_LEVELS, FeeBumpResult } from "../../../../types";
import { useFeeEstimates } from "clients/fees";
import { TransactionDetails } from "@caravan/clients";
import { useAccelerationModal } from "../../../AccelerationModalContext";
import { useCreateCPFP } from "../../../hooks";
import { FeeLevelSelector } from "../RBF/FeeLevelSelector";
import { CustomFeeSlider } from "../RBF/CustomFeeSlider";
import { FeeComparison } from "../RBF/FeeComparison";
import { ErrorDialog } from "../../../ErrorDialog";

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

  const [feeBumpRate, setFeeBumpRate] = useState<number>(
    feeEstimates?.[FEE_LEVELS.MEDIUM] || 10,
  );
  const [spendableOutputIndex, setSpendableOutputIndex] = useState<number>(
    changeOutputIndex || 0,
  );
  const [changeAddress, setChangeAddress] = useState<string>("");
  const [currentFeeLevel, setCurrentFeeLevel] = useState<FeeLevelType>(
    FEE_LEVELS.MEDIUM,
  );

  // Error state
  const [error, setError] = useState<string>("");
  const [showErrorDetails, setShowErrorDetails] = useState<boolean>(false);

  const { createCPFP } = useCreateCPFP(transaction!, txHex, availableUtxos);

  const originalFee = transaction!.fee;
  const originalFeeRate = calculateOriginalFeeRate(transaction!);

  // CPFP specific calculations
  const parentVsize = analysis?.vsize;
  const estimatedChildVsize = cpfp.childSize;
  const combinedVsize = cpfp.combinedEstimatedSize;

  const targetCombinedFee = Math.ceil(combinedVsize * feeBumpRate);
  const childFeeNeeded = Math.max(0, targetCombinedFee - originalFee);
  const estimatedNewFee = childFeeNeeded;

  const minimumFeeRate = useMemo(
    () => Math.max(originalFeeRate + 1, 1),
    [originalFeeRate],
  );

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

  const handleFeeLevelChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newLevel = event.target.value as FeeLevelType;
      setCurrentFeeLevel(newLevel);

      if (newLevel === FEE_LEVELS.CUSTOM) {
        // For custom, don't change the fee rate - user will set it manually
        return;
      }

      if (feeEstimates && newLevel in feeEstimates) {
        setFeeBumpRate(feeEstimates[newLevel as keyof typeof feeEstimates]);
      }
    },
    [feeEstimates],
  );

  const handleSliderChange = (_: Event, newValue: number | number[]) => {
    setFeeBumpRate(newValue as number);
    setCurrentFeeLevel(FEE_LEVELS.CUSTOM);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    if (!isNaN(value) && value >= minimumFeeRate) {
      setFeeBumpRate(value);
      setCurrentFeeLevel(FEE_LEVELS.CUSTOM);
    }
  };

  const handleProcessCPFP = () => {
    // Clear any existing errors
    setError("");
    setShowErrorDetails(false);

    // Validate form
    if (feeBumpRate < minimumFeeRate) {
      setError(
        `Fee rate must be at least ${minimumFeeRate.toFixed(1)} sats/vB`,
      );
      setShowErrorDetails(true);
      return;
    }

    if (!changeAddress.trim()) {
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
        feeBumpRate,
        spendableOutputIndex,
        changeAddress,
      );

      const result: FeeBumpResult = {
        psbtBase64,
        newFee: estimatedNewFee.toString(),
        newFeeRate: feeBumpRate,
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

  const feeDifference = useMemo(() => {
    return estimatedNewFee;
  }, [estimatedNewFee]);

  // Calculate max fee rate
  const maxFeeRate = useMemo(() => {
    const maxReasonableFee = Math.max(
      minimumFeeRate * 10,
      feeEstimates?.[FEE_LEVELS.HIGH] * 3 || 300,
    );
    return maxReasonableFee;
  }, [minimumFeeRate, feeEstimates]);

  // Check if custom slider should be shown
  const isCustomFeeRate = useMemo(() => {
    if (!feeEstimates) return false;

    // It checks if the current feeBumpRate exists as a value in the feeEstimates object.
    // If it doesn't match any of the standard fee estimates, it's considered custom.
    return !Object.values(feeEstimates).some((rate) => rate === feeBumpRate);
  }, [feeEstimates, feeBumpRate]);

  const showCustomSlider =
    currentFeeLevel === FEE_LEVELS.CUSTOM || isCustomFeeRate;

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
      <Box mb={3}>
        <TextField
          fullWidth
          label="Change Address"
          value={changeAddress}
          onChange={(e) => setChangeAddress(e.target.value)}
          placeholder="Enter the address to receive the change"
          helperText="The address where the remaining funds will be sent after fees"
          required
        />
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Fee Rate Selection */}
      <Box mb={3}>
        <Typography
          variant="subtitle1"
          gutterBottom
          fontWeight="medium"
          display="flex"
          alignItems="center"
        >
          Target Combined Fee Rate
          <Tooltip
            title="This is the desired fee rate for the parent + child transactions combined. Higher rates will confirm faster."
            arrow
          >
            <InfoOutlined fontSize="small" sx={{ ml: 1 }} />
          </Tooltip>
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Parent fee rate: {originalFeeRate.toFixed(1)} sats/vB
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Target combined rate: {feeBumpRate.toFixed(1)} sats/vB
          </Typography>
        </Box>

        {/* Fee level selection */}
        <FeeLevelSelector
          currentFeeLevel={currentFeeLevel}
          onFeeLevelChange={handleFeeLevelChange}
          feeEstimates={feeEstimates || {}}
          feeBumpRate={feeBumpRate}
          disabled={!feeEstimates}
        />

        <Divider sx={{ my: 2 }} />

        {/* Custom fee slider */}
        <CustomFeeSlider
          feeBumpRate={feeBumpRate}
          onSliderChange={handleSliderChange}
          onInputChange={handleInputChange}
          minimumFeeRate={minimumFeeRate}
          maxFeeRate={maxFeeRate}
          show={showCustomSlider}
        />
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
        estimatedNewFee={estimatedNewFee}
        feeDifference={feeDifference}
      />

      {/* Submit button */}
      <Box display="flex" justifyContent="flex-end">
        <Button
          variant="contained"
          color="primary"
          onClick={handleProcessCPFP}
          size="large"
          disabled={
            !changeAddress.trim() ||
            spendableOutputs.length === 0 ||
            feeBumpRate < minimumFeeRate
          }
        >
          Create CPFP Transaction
        </Button>
      </Box>
    </Paper>
  );
};
