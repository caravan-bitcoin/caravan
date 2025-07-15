import React, { useCallback, useMemo, useState } from "react";
import {
  Box,
  Button,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  Paper,
  Radio,
  RadioGroup,
  Slider,
  TextField,
  Typography,
  Alert,
  AlertTitle,
  Tooltip,
  Chip,
} from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import {
  RbfType,
  FeeLevelType,
  RBF_TYPES,
  FEE_LEVEL_COLORS,
  FEE_LEVELS,
} from "../../../types";
import { useFeeEstimates } from "clients/fees";
import { formatFee } from "../../../utils";
import { TransactionDetails } from "@caravan/clients";
import { useAccelerationModal } from "../../AccelerationModalContext";
import { useCreateAcceleratedRBF, useCreateCancelRBF } from "../../hooks";

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
    setFeeBumpPsbt,
    nextStep,
  } = useAccelerationModal();

  const [rbfType, setRbfType] = useState<RbfType>("accelerate");
  const { data: feeEstimates } = useFeeEstimates();
  // const [feeBumpPriority, setFeeBumpPriority] = useState<FeeLevelType>(
  //   FEE_LEVELS.MEDIUM,
  // );
  const [feeBumpRate, setFeeBumpRate] = useState<number>(transaction.size);
  const [cancelAddress, setCancelAddress] = useState<string>("");
  const [changeAddress, setChangeAddress] = useState<string>("");
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

  // Local state for fee level selection (UI state only)
  const [currentFeeLevel, setCurrentFeeLevel] = useState<FeeLevelType>(
    FEE_LEVELS.MEDIUM,
  );

  const originalFee = transaction!.fee;
  const originalFeeRate = calculateOriginalFeeRate(transaction!);

  const handleSubmitRBF = async () => {
    try {
      let psbt: string;

      if (rbfType === RBF_TYPES.CANCEL) {
        psbt = createCancelRBF(feeBumpRate, cancelAddress);
      } else {
        // Handle accelerated RBF case
        psbt = createAcceleratedRBF(feeBumpRate, changeAddress);
      }

      // Store the PSBT in context and move to next step
      setFeeBumpPsbt(psbt);
      nextStep();
    } catch (error) {
      console.error("Error creating RBF transaction:", error);
      // Handle error - you can show error message to user
    }
  };

  const minimumFeeRate = useMemo(
    () => Math.max(originalFeeRate + 1, 1),
    [originalFeeRate],
  );

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

  // Handle form submission
  // const handleSubmit = () => {
  //   if (!isRbfFormValid) return;

  //   handleSubmitRBF({
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

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Configure RBF Transaction
      </Typography>

      <Box mb={3}>
        <Typography variant="subtitle1" gutterBottom fontWeight="medium">
          Transaction Type
        </Typography>
        <FormControl component="fieldset">
          <RadioGroup
            aria-label="rbf-type"
            name="rbf-type"
            value={rbfType}
            onChange={handleRbfTypeChange}
          >
            <FormControlLabel
              value={RBF_TYPES.ACCELERATE}
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body1">
                    Accelerate Transaction
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Keep the same recipient but increase the fee to speed up
                    confirmation
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value={RBF_TYPES.CANCEL}
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body1">Cancel Transaction</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Replace the transaction and redirect all funds to a new
                    address
                  </Typography>
                </Box>
              }
            />
          </RadioGroup>
        </FormControl>
      </Box>

      <Divider sx={{ my: 2 }} />

      {rbfType === RBF_TYPES.CANCEL ? (
        <Box mb={3}>
          <Typography variant="subtitle1" gutterBottom fontWeight="medium">
            Cancel Address
          </Typography>
          <TextField
            fullWidth
            label="Address to send funds to"
            variant="outlined"
            value={cancelAddress}
            onChange={handleCancelAddressChange}
            error={rbfType === RBF_TYPES.CANCEL && !cancelAddress.trim()}
            helperText={
              rbfType === RBF_TYPES.CANCEL && !cancelAddress.trim()
                ? "Cancel address is required"
                : "Enter an address where you want to send all funds"
            }
            sx={{ mb: 1 }}
          />
          <Alert severity="warning">
            This will cancel the original transaction and send all funds (minus
            fees) to this address.
          </Alert>
        </Box>
      ) : (
        <Box mb={3}>
          <Typography variant="subtitle1" gutterBottom fontWeight="medium">
            Change Address (Optional)
          </Typography>
          <TextField
            fullWidth
            label="Change Address"
            variant="outlined"
            value={changeAddress}
            onChange={handleChangeAddressChange}
            helperText="Leave empty to use the default change address"
            sx={{ mb: 1 }}
          />
        </Box>
      )}

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
        <FormControl component="fieldset" sx={{ mb: 2 }}>
          <RadioGroup
            row
            aria-label="fee-level"
            name="fee-level"
            value={currentFeeLevel}
            onChange={handleFeeLevelChange}
          >
            <FormControlLabel
              value={FEE_LEVELS.LOW}
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body2">
                    Economy
                    <Chip
                      label={`${Math.ceil(feeEstimates[FEE_LEVELS.LOW])} sat/vB`}
                      size="small"
                      sx={{ ml: 1 }}
                      style={{
                        backgroundColor: FEE_LEVEL_COLORS[FEE_LEVELS.LOW],
                        color: "white",
                      }}
                    />
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value={FEE_LEVELS.MEDIUM}
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body2">
                    Standard
                    <Chip
                      label={`${Math.ceil(feeEstimates[FEE_LEVELS.MEDIUM])} sat/vB`}
                      size="small"
                      sx={{ ml: 1 }}
                      style={{
                        backgroundColor: FEE_LEVEL_COLORS[FEE_LEVELS.MEDIUM],
                        color: "white",
                      }}
                    />
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value={FEE_LEVELS.HIGH}
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body2">
                    Priority
                    <Chip
                      label={`${Math.ceil(feeEstimates[FEE_LEVELS.HIGH])} sat/vB`}
                      size="small"
                      sx={{ ml: 1 }}
                      style={{
                        backgroundColor: FEE_LEVEL_COLORS[FEE_LEVELS.HIGH],
                        color: "white",
                      }}
                    />
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value={FEE_LEVELS.CUSTOM}
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body2">
                    Custom
                    {currentFeeLevel === FEE_LEVELS.CUSTOM && (
                      <Chip
                        label={`${feeBumpRate} sat/vB`}
                        size="small"
                        sx={{ ml: 1 }}
                        style={{
                          backgroundColor: FEE_LEVEL_COLORS[FEE_LEVELS.CUSTOM],
                          color: "white",
                        }}
                      />
                    )}
                  </Typography>
                </Box>
              }
            />
          </RadioGroup>
        </FormControl>

        {/* Custom fee slider */}
        {showCustomSlider && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Slider
              value={feeBumpRate}
              onChange={handleSliderChange}
              aria-labelledby="fee-rate-slider"
              min={Math.round(minimumFeeRate * 1000) / 1000}
              max={maxFeeRate}
              step={1}
              marks={[
                {
                  value: Math.round(minimumFeeRate * 1000) / 1000,
                  label: `${Math.round(minimumFeeRate * 1000) / 1000}`,
                },
                {
                  value: Math.floor((minimumFeeRate + maxFeeRate) / 2),
                  label: `${Math.floor((minimumFeeRate + maxFeeRate) / 2)}`,
                },
                { value: maxFeeRate, label: `${maxFeeRate}` },
              ]}
              valueLabelDisplay="on"
              sx={{ flexGrow: 1 }}
            />

            {/* Numeric input synced to the slider */}
            <TextField
              value={feeBumpRate}
              onChange={handleInputChange}
              type="number"
              InputProps={{
                inputProps: {
                  min: minimumFeeRate.toFixed(2),
                  max: maxFeeRate.toFixed(2),
                  step: 1,
                },
              }}
              sx={{ width: 100 }}
            />
          </Box>
        )}
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
          onClick={handleSubmitRBF}
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
