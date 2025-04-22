import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  Box,
  Button,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  InputAdornment,
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
import { FeeBumpRecommendation, FeePriority } from "../../types";
import { formatFee } from "../../utils";

const FEE_LEVELS = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CUSTOM: "custom",
};

const PRIORITY_TO_FEE_LEVEL = {
  [FeePriority.LOW]: FEE_LEVELS.LOW,
  [FeePriority.MEDIUM]: FEE_LEVELS.MEDIUM,
  [FeePriority.HIGH]: FEE_LEVELS.HIGH,
};

const FEE_LEVEL_COLORS = {
  [FEE_LEVELS.LOW]: "#4caf50", // Green
  [FEE_LEVELS.MEDIUM]: "#ff9800", // Orange
  [FEE_LEVELS.HIGH]: "#f44336", // Red
  [FEE_LEVELS.CUSTOM]: "#2196f3", // Blue
};

interface RBFFormProps {
  recommendation: FeeBumpRecommendation;
  originalFeeRate: number;
  originalFee: string;
  selectedFeeRate: number;
  selectedPriority: FeePriority;
  onFeeRateChange: (feeRate: number) => void;
  onPriorityChange?: (priority: FeePriority) => void;
  onSubmit: (options: {
    isCancel: boolean;
    cancelAddress?: string;
    changeAddress?: string;
  }) => void;
  isCreating?: boolean;
}

export const RBFForm: React.FC<RBFFormProps> = ({
  recommendation,
  originalFeeRate,
  originalFee,
  selectedFeeRate,
  selectedPriority,
  onFeeRateChange,
  onPriorityChange,
  onSubmit,
  isCreating = false,
}) => {
  // States for form fields
  const [rbfType, setRbfType] = useState<"accelerate" | "cancel">("accelerate");
  const [cancelAddress, setCancelAddress] = useState<string>("");
  const [changeAddress, setChangeAddress] = useState<string>("");
  const [addressError, setAddressError] = useState<string>("");

  // State for fee selection
  const [feeLevel, setFeeLevel] = useState<string>(
    PRIORITY_TO_FEE_LEVEL[selectedPriority] || FEE_LEVELS.MEDIUM,
  );
  const [customFeeRate, setCustomFeeRate] = useState<number>(selectedFeeRate);

  // Refs to prevent infinite renders
  const isInitialRender = useRef(true);
  const isUpdatingFeeLevel = useRef(false);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate min and max fee rates
  // Min fee rate must be at least 1 higher than original (per RBF rules)
  const minFeeRate = Math.max(originalFeeRate + 1, 1);

  // Calculate max fee rate - use network recommendations with safety margin
  const maxFeeRate = useMemo(() => {
    // Use the highest of our calculated values
    const highestRecommended = Math.max(
      recommendation.suggestedRBFFeeRate || 0,
      recommendation.networkFeeEstimates?.highPriority || 0,
    );

    return Math.max(
      originalFeeRate + 1,
      highestRecommended,
      100, // Minimum ceiling of 100 sat/vB
    );
  }, [originalFeeRate, recommendation]);

  // Calculate fee levels based on network estimates
  const feeLevels = useMemo(() => {
    const networkEstimates = recommendation.networkFeeEstimates;

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

  // Calculate estimated new fee based on transaction size and selected fee rate
  const estimatedNewFee = useMemo(() => {
    const txVsize = recommendation.vsize || 250; // Use default if not available
    return Math.ceil(txVsize * selectedFeeRate).toString();
  }, [selectedFeeRate, recommendation]);

  // Update parent component
  const updateParentWithDebounce = useCallback(
    (newFeeLevel: string, newFeeRate: number) => {
      // Clear any existing timeout to avoid multiple updates
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      // Mark that we're in the process of updating
      isUpdatingFeeLevel.current = true;

      // Set a debounced update
      updateTimeoutRef.current = setTimeout(() => {
        // For custom fee level, just update the fee rate
        if (newFeeLevel === FEE_LEVELS.CUSTOM) {
          onFeeRateChange(newFeeRate);
        }
        // For predefined levels, update priority first, then fee rate if needed ( else there is a conflict)
        else if (feeLevels[newFeeLevel]) {
          const calculatedFeeRate = Math.ceil(feeLevels[newFeeLevel]);

          // Determine new priority
          let newPriority: FeePriority = selectedPriority;
          if (newFeeLevel === FEE_LEVELS.LOW) {
            newPriority = FeePriority.LOW;
          } else if (newFeeLevel === FEE_LEVELS.MEDIUM) {
            newPriority = FeePriority.MEDIUM;
          } else if (newFeeLevel === FEE_LEVELS.HIGH) {
            newPriority = FeePriority.HIGH;
          }

          // Update priority if it changed and update callback exists
          if (onPriorityChange && newPriority !== selectedPriority) {
            onPriorityChange(newPriority);
          }

          // Update fee rate if different from current
          if (calculatedFeeRate !== selectedFeeRate) {
            onFeeRateChange(calculatedFeeRate);
          }
        }

        // Reset updating flag
        isUpdatingFeeLevel.current = false;
        updateTimeoutRef.current = null;
      }, 100); // 100ms debounce
    },
    [
      feeLevels,
      onFeeRateChange,
      onPriorityChange,
      selectedFeeRate,
      selectedPriority,
    ],
  );

  // Sync local customFeeRate with selectedFeeRate prop changes (coming from parent)
  useEffect(() => {
    // Don't update if we're in the middle of our own update process
    if (!isUpdatingFeeLevel.current) {
      setCustomFeeRate(selectedFeeRate);
    }
  }, [selectedFeeRate]);

  // Set initial fee level based on priority
  useEffect(() => {
    if (isInitialRender.current && selectedPriority) {
      setFeeLevel(PRIORITY_TO_FEE_LEVEL[selectedPriority]);
      isInitialRender.current = false;
    }
  }, [selectedPriority]);

  // Handle RBF type change
  const handleRbfTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRbfType(event.target.value as "accelerate" | "cancel");
    setAddressError("");
  };

  // Handle fee level change
  const handleFeeLevelChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newFeeLevel = event.target.value;
      setFeeLevel(newFeeLevel);

      // Calculate the fee rate for this level
      let newFeeRate = customFeeRate;
      if (newFeeLevel !== FEE_LEVELS.CUSTOM && feeLevels[newFeeLevel]) {
        newFeeRate = Math.ceil(feeLevels[newFeeLevel]);
      }

      // Update parent with debounce
      updateParentWithDebounce(newFeeLevel, newFeeRate);
    },
    [feeLevels, customFeeRate, updateParentWithDebounce],
  );

  // Handle slider change
  const handleSliderChange = useCallback(
    (_event: Event, newValue: number | number[]) => {
      const value = newValue as number;
      setCustomFeeRate(value);
      setFeeLevel(FEE_LEVELS.CUSTOM);

      // Update parent with debounce
      updateParentWithDebounce(FEE_LEVELS.CUSTOM, value);
    },
    [updateParentWithDebounce],
  );

  // Handle custom fee input change
  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(event.target.value);
      if (!isNaN(value) && value >= minFeeRate) {
        setCustomFeeRate(value);
        setFeeLevel(FEE_LEVELS.CUSTOM);

        // Update parent with debounce
        updateParentWithDebounce(FEE_LEVELS.CUSTOM, value);
      }
    },
    [minFeeRate, updateParentWithDebounce],
  );

  // Handle address input changes
  const handleCancelAddressChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setCancelAddress(event.target.value);
    setAddressError("");
  };

  const handleChangeAddressChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setChangeAddress(event.target.value);
    setAddressError("");
  };

  // Handle form submission
  const handleSubmit = () => {
    // Validate form
    if (rbfType === "cancel" && !cancelAddress) {
      setAddressError("Please enter a cancel address");
      return;
    }

    onSubmit({
      isCancel: rbfType === "cancel",
      cancelAddress: rbfType === "cancel" ? cancelAddress : undefined,
      changeAddress:
        rbfType === "accelerate" && changeAddress ? changeAddress : undefined,
    });
  };

  // Calculate fee difference
  const feeDifference = parseInt(estimatedNewFee) - parseInt(originalFee);

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
              value="accelerate"
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
              value="cancel"
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

      {rbfType === "cancel" ? (
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
            error={!!addressError}
            helperText={
              addressError ||
              "Enter an address where you want to send all funds"
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
            Minimum required: {minFeeRate.toFixed(1)} sat/vB (per RBF rules)
          </Typography>
        </Box>

        {/* Fee level selection */}
        <FormControl component="fieldset" sx={{ mb: 2 }}>
          <RadioGroup
            row
            aria-label="fee-level"
            name="fee-level"
            value={feeLevel}
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
                    {feeLevel === FEE_LEVELS.CUSTOM && (
                      <Chip
                        label={`${customFeeRate} sat/vB`}
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
        {feeLevel === FEE_LEVELS.CUSTOM && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 2 }}>
            <Slider
              value={customFeeRate}
              onChange={handleSliderChange}
              aria-labelledby="fee-rate-slider"
              min={minFeeRate}
              max={maxFeeRate}
              step={1}
              valueLabelDisplay="auto"
              sx={{ flexGrow: 1 }}
            />
            <TextField
              value={customFeeRate}
              onChange={handleInputChange}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">sat/vB</InputAdornment>
                ),
              }}
              type="number"
              inputProps={{
                min: minFeeRate,
                step: 1,
              }}
              sx={{ width: "120px" }}
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
              {formatFee(estimatedNewFee)}
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
            : `Create ${rbfType === "cancel" ? "Cancel" : "Accelerated"} Transaction`}
        </Button>
      </Box>
    </Paper>
  );
};
