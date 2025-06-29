import React, { useCallback, useMemo, useEffect, useState } from "react";
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
import { FeePriority } from "../../types";
import { formatFee } from "../../utils";
import {
  useFeeBumpRecommendation,
  useSelectedFeeRate,
  useSelectedFeePriority,
  useRbfType,
  useCancelAddress,
  useChangeAddress,
  useMinimumFeeRate,
  useEstimatedNewFee,
  useFeeDifference,
  useIsRbfFormValid,
  useFeeBumpDispatch,
  setRbfType,
  setCancelAddress,
  setChangeAddress,
  setFeeBumpRate,
  setFeeBumpPriority,
} from "../../context";

export type RbfType = "accelerate" | "cancel";

export const RBF_TYPES = {
  ACCELERATE: "accelerate",
  CANCEL: "cancel",
} as const;

export type RbfTypeValues = (typeof RBF_TYPES)[keyof typeof RBF_TYPES];

const FEE_LEVELS = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CUSTOM: "custom",
};

type FeeLevelType = (typeof FEE_LEVELS)[keyof typeof FEE_LEVELS];

const PRIORITY_TO_FEE_LEVEL = {
  [FeePriority.LOW]: FEE_LEVELS.LOW,
  [FeePriority.MEDIUM]: FEE_LEVELS.MEDIUM,
  [FeePriority.HIGH]: FEE_LEVELS.HIGH,
};

const FEE_LEVEL_TO_PRIORITY_MAP = {
  [FEE_LEVELS.LOW]: FeePriority.LOW,
  [FEE_LEVELS.MEDIUM]: FeePriority.MEDIUM,
  [FEE_LEVELS.HIGH]: FeePriority.HIGH,
} as const;

const FEE_LEVEL_COLORS = {
  [FEE_LEVELS.LOW]: "#4caf50", // Green
  [FEE_LEVELS.MEDIUM]: "#ff9800", // Orange
  [FEE_LEVELS.HIGH]: "#f44336", // Red
  [FEE_LEVELS.CUSTOM]: "#2196f3", // Blue
};

interface RBFFormProps {
  originalFeeRate: number;
  originalFee: string;
  onSubmit: (options: {
    isCancel: boolean;
    cancelAddress?: string;
    changeAddress?: string;
  }) => void;
  isCreating?: boolean;
}

export const RBFForm: React.FC<RBFFormProps> = ({
  originalFeeRate,
  originalFee,
  onSubmit,
  isCreating = false,
}) => {
  const dispatch = useFeeBumpDispatch();

  // Get all state from Context - no more props!
  const recommendation = useFeeBumpRecommendation();
  const selectedFeeRate = useSelectedFeeRate();
  const selectedPriority = useSelectedFeePriority();
  const rbfType = useRbfType();
  const cancelAddress = useCancelAddress();
  const changeAddress = useChangeAddress();
  const minimumFeeRate = useMinimumFeeRate();
  const estimatedNewFee = useEstimatedNewFee();
  const feeDifference = useFeeDifference();
  const isFormValid = useIsRbfFormValid();

  // Local state for fee level selection (UI state only)
  const [currentFeeLevel, setCurrentFeeLevel] = useState<FeeLevelType>(
    PRIORITY_TO_FEE_LEVEL[selectedPriority] || FEE_LEVELS.MEDIUM,
  );

  // Calculate fee levels based on network estimates
  const feeLevels = useMemo(() => {
    const networkEstimates = recommendation?.networkFeeEstimates;

    // If we have network estimates, use them for accurate fee levels
    if (networkEstimates) {
      return {
        [FEE_LEVELS.LOW]: networkEstimates.lowPriority,
        [FEE_LEVELS.MEDIUM]: networkEstimates.mediumPriority,
        [FEE_LEVELS.HIGH]: networkEstimates.highPriority,
      };
    }

    // Fallback if network estimates are not available
    // Fallback values based on :
    // https://b10c.me/blog/003-a-list-of-public-bitcoin-feerate-estimation-apis/
    // These values are reasonable defaults but will be less accurate
    return {
      [FEE_LEVELS.LOW]: Math.max(originalFeeRate * 1.5, 20.09),
      [FEE_LEVELS.MEDIUM]: Math.max(originalFeeRate * 2, 32.75),
      [FEE_LEVELS.HIGH]: Math.max(originalFeeRate * 3, 32.75),
    };
  }, [originalFeeRate, recommendation]);

  // Calculate max fee rate
  const maxFeeRate = useMemo(() => {
    const highestRecommended = Math.max(
      recommendation?.suggestedRBFFeeRate || 0,
      recommendation?.networkFeeEstimates?.highPriority || 0,
    );

    return Math.max(
      originalFeeRate + 1,
      highestRecommended,
      100, // Maximum ceiling of 100 sat/vB
    );
  }, [originalFeeRate, recommendation]);

  // Update local fee level when priority changes from Redux
  useEffect(() => {
    const priorityFeeLevel = PRIORITY_TO_FEE_LEVEL[selectedPriority];
    if (priorityFeeLevel) {
      setCurrentFeeLevel(priorityFeeLevel);
    }
  }, [selectedPriority]);

  // Handle RBF type change
  const handleRbfTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value as RbfType;
    dispatch(setRbfType(value));
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

      // For predefined levels, update priority and fee rate
      const newPriority: FeePriority =
        FEE_LEVEL_TO_PRIORITY_MAP[newFeeLevel] || selectedPriority;

      if (feeLevels[newFeeLevel]) {
        const newFeeRate = Math.ceil(feeLevels[newFeeLevel]);
        dispatch(setFeeBumpPriority(newPriority));
        dispatch(setFeeBumpRate(newFeeRate));
      }
    },
    [feeLevels, selectedPriority, dispatch],
  );

  // Handle slider change
  const handleSliderChange = useCallback(
    (_event: Event, newValue: number | number[]) => {
      const value = newValue as number;
      setCurrentFeeLevel(FEE_LEVELS.CUSTOM); // Switch to custom when using slider
      dispatch(setFeeBumpRate(value));
    },
    [dispatch],
  );

  // Handle custom fee input change
  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(event.target.value);
      if (!isNaN(value) && value >= minimumFeeRate) {
        setCurrentFeeLevel(FEE_LEVELS.CUSTOM); // Switch to custom when using slider
        dispatch(setFeeBumpRate(value));
      }
    },
    [minimumFeeRate, dispatch],
  );

  // Handle address input changes
  const handleCancelAddressChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    dispatch(setCancelAddress(event.target.value));
  };

  const handleChangeAddressChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    dispatch(setChangeAddress(event.target.value));
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!isFormValid) return;

    onSubmit({
      isCancel: rbfType === RBF_TYPES.CANCEL,
      cancelAddress: rbfType === RBF_TYPES.CANCEL ? cancelAddress : undefined,
      changeAddress:
        rbfType === RBF_TYPES.ACCELERATE && changeAddress
          ? changeAddress
          : undefined,
    });
  };

  // Check if current fee rate matches any predefined level
  const isCustomFeeRate = !Object.values(feeLevels).some(
    (level) => Math.ceil(level) === selectedFeeRate,
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
                      label={`${Math.ceil(feeLevels[FEE_LEVELS.LOW])} sat/vB`}
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
                      label={`${Math.ceil(feeLevels[FEE_LEVELS.MEDIUM])} sat/vB`}
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
                      label={`${Math.ceil(feeLevels[FEE_LEVELS.HIGH])} sat/vB`}
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
                        label={`${selectedFeeRate} sat/vB`}
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
              value={selectedFeeRate}
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
              value={selectedFeeRate}
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
            <Typography variant="body1">{formatFee(originalFee)}</Typography>
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
          onClick={handleSubmit}
          size="large"
          disabled={isCreating}
        >
          {isCreating
            ? "Creating Transaction..."
            : `Create ${rbfType === RBF_TYPES.CANCEL ? "Cancel" : "Accelerated"} Transaction`}
        </Button>
      </Box>
    </Paper>
  );
};
