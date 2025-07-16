import React, { useCallback, useMemo, useState } from "react";
import {
  Box,
  Button,
  Divider,
  Paper,
  Typography,
  Tooltip,
} from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import {
  FeeLevelType,
  RBF_TYPES,
  RbfType,
  FEE_LEVELS,
  FeeBumpResult,
} from "../../../../types";
import { useFeeEstimates } from "clients/fees";
import { TransactionDetails } from "@caravan/clients";
import { useAccelerationModal } from "../../../AccelerationModalContext";
import { useCreateAcceleratedRBF, useCreateCancelRBF } from "../../../hooks";

import { FeeLevelSelector } from "./FeeLevelSelector";
import { TransactionTypeSelector } from "./TransactionTypeSelector";
import { CustomFeeSlider } from "./CustomFeeSlider";
import { FeeComparison } from "./FeeComparison";

// Calculate original fee rate helper function
const calculateOriginalFeeRate = (transaction: TransactionDetails): number => {
  if (!transaction) return 0;
  const txSize = transaction.vsize || transaction.size;
  return txSize ? transaction.fee / txSize : 0;
};

export const RBFForm: React.FC = () => {
  const {
    transaction,
    analysis,
    txHex,
    availableUtxos,
    state: { rbfType, selectedStrategy },
    setRbfType,
    setFeeBumpResult,
    nextStep,
  } = useAccelerationModal();

  const { data: feeEstimates } = useFeeEstimates();

  const [feeBumpRate, setFeeBumpRate] = useState<number>(
    feeEstimates[FEE_LEVELS.MEDIUM],
  );
  const [cancelAddress, setCancelAddress] = useState<string>("");
  const [changeAddress, setChangeAddress] = useState<string>("");
  // Local state for fee level selection (UI state only)
  const [currentFeeLevel, setCurrentFeeLevel] = useState<FeeLevelType>(
    FEE_LEVELS.MEDIUM,
  );

  const { createCancelRBF } = useCreateCancelRBF(
    transaction,
    txHex,
    availableUtxos,
  );
  const { createAcceleratedRBF } = useCreateAcceleratedRBF(
    transaction,
    txHex,
    availableUtxos,
  );

  const originalFee = transaction!.fee;
  const originalFeeRate = calculateOriginalFeeRate(transaction!);

  const minimumFeeRate = useMemo(
    () => Math.max(originalFeeRate + 1, 1),
    [originalFeeRate],
  );

  const handleProcessRBF = () => {
    // Validate form before proceeding
    if (feeBumpRate < minimumFeeRate) {
      console.error("Fee rate is below minimum required");
      alert(`Fee rate must be at least ${minimumFeeRate.toFixed(1)} sat/vB`);
      return false;
    }

    if (rbfType === RBF_TYPES.CANCEL && !cancelAddress.trim()) {
      console.error("Cancel address is required for cancel RBF");
      alert("Cancel address is required");
      return false;
    }

    try {
      let result: FeeBumpResult;
      const txVsize = transaction.vsize || transaction.size;
      const estimatedNewFee = Math.ceil(txVsize * feeBumpRate).toString();

      if (rbfType === RBF_TYPES.CANCEL) {
        const cancelPsbt = createCancelRBF(feeBumpRate, cancelAddress);

        result = {
          psbtBase64: cancelPsbt,
          newFee: estimatedNewFee,
          newFeeRate: feeBumpRate,
          strategy: selectedStrategy!,
          isCancel: true,
          createdAt: new Date().toISOString(),
        };
      } else {
        // Handle accelerated RBF case
        const acceleratedPsbt = createAcceleratedRBF(
          feeBumpRate,
          changeAddress,
        );

        result = {
          psbtBase64: acceleratedPsbt,
          newFee: estimatedNewFee,
          newFeeRate: feeBumpRate,
          strategy: selectedStrategy!,
          isCancel: false,
          createdAt: new Date().toISOString(),
        };
      }

      // Store the PSBT in context
      setFeeBumpResult(result);
      nextStep();
    } catch (error) {
      console.error("Error creating RBF transaction:", error);
    }
  };

  const estimatedNewFee = useMemo(() => {
    if (!transaction || !feeBumpRate) return 0;
    const txVsize = transaction.vsize || transaction.size;
    return Math.ceil(txVsize * feeBumpRate);
  }, [transaction, feeBumpRate]);

  const feeDifference = useMemo(() => {
    if (!transaction) return 0;
    return estimatedNewFee - transaction.fee;
  }, [transaction, estimatedNewFee]);

  // Calculate max fee rate
  const maxFeeRate = useMemo(() => {
    const vsize = analysis?.vsize ?? 1; // Prevent division by undefined/zero
    const estimatedRbfFee = Number(analysis?.estimatedRBFFee) || 0;
    const highestRecommended = Math.max(
      vsize > 0 ? estimatedRbfFee / vsize : 0,
      feeEstimates[FEE_LEVELS.HIGH] || 0,
    );

    return Math.max(
      originalFeeRate + 1,
      highestRecommended,
      100, // Maximum ceiling of 100 sat/vB
    );
  }, [originalFeeRate, analysis, feeEstimates]);

  // Handle RBF type change
  const handleRbfTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value as RbfType;
    setRbfType(value);
  };

  // Handle fee level change
  const handleFeeLevelChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newFeeLevel = event.target.value as FeeLevelType;
      setCurrentFeeLevel(newFeeLevel); // To update  update the local UI state

      if (newFeeLevel === FEE_LEVELS.CUSTOM) {
        // For custom, don't change the fee rate - user will set it manually
        return;
      }

      if (feeEstimates[newFeeLevel]) {
        const newFeeRate = Math.ceil(feeEstimates[newFeeLevel]);
        setFeeBumpRate(newFeeRate);
      }
    },
    [feeEstimates],
  );

  // Handle slider change
  const handleSliderChange = useCallback(
    (_event: Event, newValue: number | number[]) => {
      const value = newValue as number;
      setCurrentFeeLevel(FEE_LEVELS.CUSTOM); // Switch to custom when using slider
      setFeeBumpRate(value);
    },
    [],
  );

  // Handle custom fee input change
  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(event.target.value);
      if (!isNaN(value) && value >= minimumFeeRate) {
        setCurrentFeeLevel(FEE_LEVELS.CUSTOM); // Switch to custom when using slider
        setFeeBumpRate(value);
      }
    },
    [minimumFeeRate],
  );

  const handleCancelAddressChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setCancelAddress(event.target.value);
  };

  const handleChangeAddressChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setChangeAddress(event.target.value);
  };

  // Check if current fee rate matches any predefined level
  const isCustomFeeRate = !Object.values(feeEstimates).some(
    (level) => Math.ceil(level) === feeBumpRate,
  );

  // Show custom slider if:
  // 1. Custom is explicitly selected, OR
  // 2. The current fee rate doesn't match any preset level
  const showCustomSlider =
    currentFeeLevel === FEE_LEVELS.CUSTOM || isCustomFeeRate;

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Configure RBF Transaction
      </Typography>

      <TransactionTypeSelector
        rbfType={rbfType}
        onRbfTypeChange={handleRbfTypeChange}
        cancelAddress={cancelAddress}
        onCancelAddressChange={handleCancelAddressChange}
        changeAddress={changeAddress}
        onChangeAddressChange={handleChangeAddressChange}
      />

      <Divider sx={{ my: 2 }} />

      <Box mb={3}>
        <Typography
          variant="subtitle1"
          gutterBottom
          fontWeight="medium"
          display="flex"
          alignItems="center"
        >
          Fee Rate
          <Tooltip
            title="Higher fee rates will make your transaction confirm faster, but cost more in fees"
            arrow
          >
            <InfoOutlined fontSize="small" sx={{ ml: 1 }} />
          </Tooltip>
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Current fee rate: {originalFeeRate.toFixed(1)} sat/vB
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Minimum required: {minimumFeeRate.toFixed(1)} sat/vB (per RBF rules)
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
          onClick={handleProcessRBF}
          size="large"
          disabled={
            rbfType === RBF_TYPES.CANCEL
              ? !cancelAddress.trim() || feeBumpRate < minimumFeeRate
              : feeBumpRate < minimumFeeRate
          }
        >
          {`Create ${rbfType === RBF_TYPES.CANCEL ? "Cancel" : "Accelerated"} Transaction`}
        </Button>
      </Box>
    </Paper>
  );
};
