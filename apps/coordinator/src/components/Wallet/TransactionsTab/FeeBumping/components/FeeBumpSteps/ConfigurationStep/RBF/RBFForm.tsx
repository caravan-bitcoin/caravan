import React, { useCallback, useMemo, useState } from "react";
import {
  Box,
  Button,
  Divider,
  Grid,
  Paper,
  Slider,
  TextField,
  Typography,
  Alert,
  AlertTitle,
  Tooltip,
} from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import {
  FeeLevelType,
  RBF_TYPES,
  RbfType,
  FEE_LEVELS,
} from "../../../../types";
import { useFeeEstimates } from "clients/fees";
import { formatFee } from "../../../../utils";
import { TransactionDetails } from "@caravan/clients";
import { useAccelerationModal } from "../../../AccelerationModalContext";
import { useCreateAcceleratedRBF, useCreateCancelRBF } from "../../../hooks";
import { FeeLevelSelector } from "./FeeLevelSelector";
import { TransactionTypeSelector } from "./TransactionTypeSelector";
import { CustomFeeSlider } from "./CustomFeeSlider";

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
    state: { rbfType },
    setRbfType,
    setFeeBumpPsbt,
    nextStep,
  } = useAccelerationModal();
  console.log("rbfform-1");
  const { data: feeEstimates } = useFeeEstimates();
  // const [feeBumpPriority, setFeeBumpPriority] = useState<FeeLevelType>(
  //   FEE_LEVELS.MEDIUM,
  // );
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
      return false;
    }

    if (rbfType === RBF_TYPES.CANCEL && !cancelAddress.trim()) {
      console.error("Cancel address is required for cancel RBF");
      return false;
    }

    try {
      let psbt: string;

      if (rbfType === RBF_TYPES.CANCEL) {
        psbt = createCancelRBF(feeBumpRate, cancelAddress);
      } else {
        // Handle accelerated RBF case
        psbt = createAcceleratedRBF(feeBumpRate, changeAddress);
      }

      // Store the PSBT in context
      setFeeBumpPsbt(psbt);
      nextStep();
    } catch (error) {
      console.error("Error creating RBF transaction:", error);
    }
  };

  // const isRbfFormValid = useMemo(() => {
  //   if (selectedFeeRate < minimumFeeRate) return false;
  //   if (rbfType === "cancel" && !cancelAddress.trim()) return false;
  //   return true;
  // }, [selectedFeeRate, minimumFeeRate, rbfType, cancelAddress]);

  const estimatedNewFee = useMemo(() => {
    if (!transaction || !feeBumpRate) return 0;
    const txVsize = transaction.vsize || transaction.size;
    return Math.ceil(txVsize * feeBumpRate);
  }, [transaction, feeBumpRate]);

  const feeDifference = useMemo(() => {
    if (!transaction) return 0;
    return estimatedNewFee - transaction.fee;
  }, [transaction, estimatedNewFee]);

  // Calculate fee levels based on network estimates
  // const feeLevels = useMemo(() => {
  //   const networkEstimates = recommendation?.networkFeeEstimates;

  //   // If we have network estimates, use them for accurate fee levels
  //   if (networkEstimates) {
  //     return {
  //       [FEE_LEVELS.LOW]: networkEstimates.lowPriority,
  //       [FEE_LEVELS.MEDIUM]: networkEstimates.mediumPriority,
  //       [FEE_LEVELS.HIGH]: networkEstimates.highPriority,
  //     };
  //   }

  // Fallback if network estimates are not available
  // Fallback values based on :
  // https://b10c.me/blog/003-a-list-of-public-bitcoin-feerate-estimation-apis/
  // These values are reasonable defaults but will be less accurate
  //   return {
  //     [FEE_LEVELS.LOW]: Math.max(originalFeeRate * 1.5, 20.09),
  //     [FEE_LEVELS.MEDIUM]: Math.max(originalFeeRate * 2, 32.75),
  //     [FEE_LEVELS.HIGH]: Math.max(originalFeeRate * 3, 32.75),
  //   };
  // }, [originalFeeRate, recommendation]);

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
  console.log("rbfform-2");
  // Handle form submission
  // const handleSubmit = () => {
  //   if (!isRbfFormValid) return;

  //   handleProcessRBF({
  //     isCancel: rbfType === RBF_TYPES.CANCEL,
  //     cancelAddress: rbfType === RBF_TYPES.CANCEL ? cancelAddress : undefined,
  //     changeAddress:
  //       rbfType === RBF_TYPES.ACCELERATE && changeAddress
  //         ? changeAddress
  //         : undefined,
  //   });
  // };

  // Update local fee level when priority changes from Redux
  // useEffect(() => {
  //   const priorityFeeLevel = PRIORITY_TO_FEE_LEVEL[selectedPriority];
  //   if (priorityFeeLevel) {
  //     setCurrentFeeLevel(priorityFeeLevel);
  //   }
  // }, [selectedPriority]);

  // Check if current fee rate matches any predefined level
  const isCustomFeeRate = !Object.values(feeEstimates).some(
    (level) => Math.ceil(level) === feeBumpRate,
  );

  // Show custom slider if:
  // 1. Custom is explicitly selected, OR
  // 2. The current fee rate doesn't match any preset level
  const showCustomSlider =
    currentFeeLevel === FEE_LEVELS.CUSTOM || isCustomFeeRate;
  console.log("rbfform-3");
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
      <Box mb={3}>
        <Typography variant="subtitle1" gutterBottom fontWeight="medium">
          Fee Comparison
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={4}>
            <Typography variant="body2" color="text.secondary">
              Original fee:
            </Typography>
            <Typography variant="body1">
              {formatFee(originalFee.toString())}
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="body2" color="text.secondary">
              Estimated new fee:
            </Typography>
            <Typography variant="body1">
              {formatFee(estimatedNewFee.toString())}
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="body2" color="text.secondary">
              Additional fee:
            </Typography>
            <Typography
              variant="body1"
              color={feeDifference > 0 ? "error.main" : "success.main"}
            >
              {formatFee(feeDifference.toString())}
            </Typography>
          </Grid>
        </Grid>

        {/* Fee explanation */}
        <Alert severity="info" sx={{ mt: 2 }}>
          <AlertTitle>How are fees calculated?</AlertTitle>
          <Typography variant="body2">
            Transaction fees are calculated as{" "}
            <strong>fee rate × transaction size</strong>. Higher fee rates make
            your transaction more attractive to miners, resulting in faster
            confirmation times.
          </Typography>
        </Alert>
      </Box>

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
