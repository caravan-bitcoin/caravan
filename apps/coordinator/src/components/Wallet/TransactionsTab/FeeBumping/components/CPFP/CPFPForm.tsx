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
  MenuItem,
  Select,
  InputLabel,
} from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import { FeePriority } from "../../types";
import { formatFee } from "../../utils";
import {
  useFeeBumpRecommendation,
  useSelectedFeeRate,
  useSelectedFeePriority,
  useSpendableOutputIndex,
  useChangeAddress,
  useMinimumFeeRate,
  useEstimatedNewFee,
  useFeeDifference,
  useIsCpfpFormValid,
  useFeeBumpDispatch,
  setSpendableOutputIndex,
  setChangeAddress,
  setFeeBumpRate,
  setFeeBumpPriority,
} from "../../context";

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

interface CPFPFormProps {
  /**
   * The original transaction that needs fee acceleration via CPFP
   */
  originalTx: any;
  /**
   * Current fee rate of the parent transaction
   */
  originalFeeRate: number;
  /**
   * Current fee of the parent transaction
   */
  originalFee: string;
  /**
   * List of spendable outputs from the parent transaction that can be used for CPFP
   */
  spendableOutputs: Array<{
    index: number;
    address: string;
    value: string;
    belongsToWallet: boolean;
  }>;
  /**
   * Callback when the form is submitted
   */
  onSubmit: (options: {
    spendableOutputIndex: number;
    changeAddress?: string;
  }) => void;
  /**
   * Whether the CPFP transaction is currently being created
   */
  isCreating?: boolean;
}

/**
 * CPFP Form Component
 *
 * This form allows users to create Child-Pays-For-Parent transactions to accelerate
 * confirmation of stuck parent transactions. Unlike RBF, CPFP can be used by anyone
 * who controls an output from the parent transaction, making it useful for both
 * sent and received transactions.
 *
 * Key features:
 * - Output selection: Choose which output from parent to spend
 * - Fee rate configuration: Set the fee rate for the combined package
 * - Change address: Specify where to send the remaining funds
 * - Real-time fee calculations: Shows the effective combined fee rate
 */
export const CPFPForm: React.FC<CPFPFormProps> = ({
  originalTx,
  originalFeeRate,
  originalFee,
  spendableOutputs,
  onSubmit,
  isCreating = false,
}) => {
  const dispatch = useFeeBumpDispatch();

  // Get state from Context
  const recommendation = useFeeBumpRecommendation();
  const selectedFeeRate = useSelectedFeeRate();
  const selectedPriority = useSelectedFeePriority();
  const spendableOutputIndex = useSpendableOutputIndex();
  const changeAddress = useChangeAddress();
  const minimumFeeRate = useMinimumFeeRate();
  const estimatedNewFee = useEstimatedNewFee();
  const feeDifference = useFeeDifference();
  const isFormValid = useIsCpfpFormValid();

  // Local state for fee level UI
  const [currentFeeLevel, setCurrentFeeLevel] = useState<FeeLevelType>(
    PRIORITY_TO_FEE_LEVEL[selectedPriority] || FEE_LEVELS.MEDIUM,
  );
  const [customFeeRate, setCustomFeeRate] = useState(selectedFeeRate);

  // Sync custom fee rate with selected fee rate when not in custom mode
  useEffect(() => {
    if (currentFeeLevel !== FEE_LEVELS.CUSTOM) {
      setCustomFeeRate(selectedFeeRate);
    }
  }, [selectedFeeRate, currentFeeLevel]);

  // Get network fee estimates from recommendation
  const networkFeeEstimates = useMemo(() => {
    if (!recommendation) return null;
    return {
      low: recommendation.suggestedCPFPFeeRate! * 0.7, // Estimate lower rate
      medium: recommendation.suggestedCPFPFeeRate!,
      high: recommendation.suggestedCPFPFeeRate! * 1.5, // Estimate higher rate
    };
  }, [recommendation]);

  // Handle fee level changes
  const handleFeeLevelChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newLevel = event.target.value as FeeLevelType;
      setCurrentFeeLevel(newLevel);

      if (newLevel !== FEE_LEVELS.CUSTOM && networkFeeEstimates) {
        const priority = FEE_LEVEL_TO_PRIORITY_MAP[newLevel];
        if (priority) {
          dispatch(setFeeBumpPriority(priority));
          // Set fee rate based on level
          const feeRate =
            newLevel === FEE_LEVELS.LOW
              ? networkFeeEstimates.low
              : newLevel === FEE_LEVELS.MEDIUM
                ? networkFeeEstimates.medium
                : networkFeeEstimates.high;
          dispatch(setFeeBumpRate(Math.max(minimumFeeRate, feeRate)));
        }
      }
    },
    [dispatch, networkFeeEstimates, minimumFeeRate],
  );

  // Handle custom fee rate input
  const handleCustomFeeRateChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(event.target.value) || 0;
      setCustomFeeRate(value);
      if (currentFeeLevel === FEE_LEVELS.CUSTOM) {
        dispatch(setFeeBumpRate(Math.max(minimumFeeRate, value)));
      }
    },
    [dispatch, minimumFeeRate, currentFeeLevel],
  );

  // Handle custom fee rate slider
  const handleCustomFeeRateSlider = useCallback(
    (_: Event, value: number | number[]) => {
      const feeRate = Array.isArray(value) ? value[0] : value;
      setCustomFeeRate(feeRate);
      if (currentFeeLevel === FEE_LEVELS.CUSTOM) {
        dispatch(setFeeBumpRate(feeRate));
      }
    },
    [dispatch, currentFeeLevel],
  );

  // Handle spendable output selection
  const handleSpendableOutputChange = useCallback(
    (event: React.ChangeEvent<{ value: unknown }>) => {
      const index = event.target.value as number;
      dispatch(setSpendableOutputIndex(index));
    },
    [dispatch],
  );

  // Handle change address input
  const handleChangeAddressChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      dispatch(setChangeAddress(event.target.value));
    },
    [dispatch],
  );

  // Handle form submission
  const handleSubmit = useCallback(() => {
    if (!isFormValid) return;

    onSubmit({
      spendableOutputIndex,
      changeAddress: changeAddress.trim() || undefined,
    });
  }, [isFormValid, onSubmit, spendableOutputIndex, changeAddress]);

  // Calculate combined package fee rate
  const combinedFeeRate = useMemo(() => {
    if (!originalTx || !selectedFeeRate) return 0;

    const parentVsize = originalTx.vsize || originalTx.size;
    const parentFee = originalTx.fee;

    // Estimate child transaction size (simplified: 1 input + 1 output ≈ 150-200 vBytes)
    const estimatedChildVsize = 180;
    const estimatedChildFee = selectedFeeRate * estimatedChildVsize;

    const combinedVsize = parentVsize + estimatedChildVsize;
    const combinedFee = parentFee + estimatedChildFee;

    return combinedFee / combinedVsize;
  }, [originalTx, selectedFeeRate]);

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Child-Pays-For-Parent (CPFP) Configuration
      </Typography>

      {/* Information Alert */}
      <Box mb={3}>
        <Alert severity="info">
          <AlertTitle>How CPFP Works</AlertTitle>
          <Typography variant="body2">
            CPFP creates a new transaction (child) that spends an output from
            the original transaction (parent). The child transaction includes a
            higher fee to incentivize miners to confirm both transactions
            together.
          </Typography>
          <Typography variant="body2" mt={1}>
            <strong>Current parent fee rate:</strong>{" "}
            {originalFeeRate.toFixed(1)} sat/vB
          </Typography>
          <Typography variant="body2">
            <strong>Target combined rate:</strong> {combinedFeeRate.toFixed(1)}{" "}
            sat/vB
          </Typography>
        </Alert>
      </Box>

      {/* Spendable Output Selection */}
      <Box mb={3}>
        <Typography variant="subtitle1" gutterBottom fontWeight="medium">
          Select Output to Spend
        </Typography>
        <FormControl fullWidth>
          <InputLabel>Spendable Output</InputLabel>
          <Select
            value={spendableOutputIndex}
            onChange={handleSpendableOutputChange}
            label="Spendable Output"
          >
            {spendableOutputs.map((output) => (
              <MenuItem key={output.index} value={output.index}>
                <Box>
                  <Typography variant="body2">
                    Output {output.index}: {formatFee(output.value)}
                    {output.belongsToWallet && " (Your wallet)"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {output.address.substring(0, 20)}...
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography
          variant="caption"
          color="text.secondary"
          mt={1}
          display="block"
        >
          Choose which output from the parent transaction to spend in the child
          transaction
        </Typography>
      </Box>

      {/* Change Address */}
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

      <Divider sx={{ my: 2 }} />

      {/* Fee Rate Configuration */}
      <Box mb={3}>
        <Typography
          variant="subtitle1"
          gutterBottom
          fontWeight="medium"
          display="flex"
          alignItems="center"
        >
          Fee Rate for Child Transaction
          <Tooltip
            title="This is the fee rate for the child transaction. The combined package rate will be calculated automatically."
            arrow
          >
            <InfoOutlined fontSize="small" sx={{ ml: 1 }} />
          </Tooltip>
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Parent fee rate: {originalFeeRate.toFixed(1)} sat/vB
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Minimum child rate: {minimumFeeRate.toFixed(1)} sat/vB
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            fontWeight="medium"
          >
            Combined package rate: {combinedFeeRate.toFixed(1)} sat/vB
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
                <Box textAlign="center">
                  <Chip
                    label="Low"
                    size="small"
                    sx={{
                      backgroundColor: FEE_LEVEL_COLORS[FEE_LEVELS.LOW],
                      color: "white",
                      mb: 0.5,
                    }}
                  />
                  <Typography variant="caption" display="block">
                    ~30 min
                  </Typography>
                  <Typography variant="caption" display="block">
                    {networkFeeEstimates?.low.toFixed(1)} sat/vB
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value={FEE_LEVELS.MEDIUM}
              control={<Radio />}
              label={
                <Box textAlign="center">
                  <Chip
                    label="Medium"
                    size="small"
                    sx={{
                      backgroundColor: FEE_LEVEL_COLORS[FEE_LEVELS.MEDIUM],
                      color: "white",
                      mb: 0.5,
                    }}
                  />
                  <Typography variant="caption" display="block">
                    ~10 min
                  </Typography>
                  <Typography variant="caption" display="block">
                    {networkFeeEstimates?.medium.toFixed(1)} sat/vB
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value={FEE_LEVELS.HIGH}
              control={<Radio />}
              label={
                <Box textAlign="center">
                  <Chip
                    label="High"
                    size="small"
                    sx={{
                      backgroundColor: FEE_LEVEL_COLORS[FEE_LEVELS.HIGH],
                      color: "white",
                      mb: 0.5,
                    }}
                  />
                  <Typography variant="caption" display="block">
                    ~1 block
                  </Typography>
                  <Typography variant="caption" display="block">
                    {networkFeeEstimates?.high.toFixed(1)} sat/vB
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value={FEE_LEVELS.CUSTOM}
              control={<Radio />}
              label={
                <Box textAlign="center">
                  <Chip
                    label="Custom"
                    size="small"
                    sx={{
                      backgroundColor: FEE_LEVEL_COLORS[FEE_LEVELS.CUSTOM],
                      color: "white",
                      mb: 0.5,
                    }}
                  />
                  <Typography variant="caption" display="block">
                    Custom
                  </Typography>
                </Box>
              }
            />
          </RadioGroup>
        </FormControl>

        {/* Custom fee rate input */}
        {currentFeeLevel === FEE_LEVELS.CUSTOM && (
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Custom Fee Rate (sat/vB)"
                  type="number"
                  value={customFeeRate}
                  onChange={handleCustomFeeRateChange}
                  fullWidth
                  inputProps={{ min: minimumFeeRate, step: 0.1 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Slider
                  value={customFeeRate}
                  onChange={handleCustomFeeRateSlider}
                  min={minimumFeeRate}
                  max={Math.max(50, minimumFeeRate * 3)}
                  step={0.1}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => `${value.toFixed(1)} sat/vB`}
                />
              </Grid>
            </Grid>
          </Box>
        )}
      </Box>

      {/* Fee Summary */}
      <Box mb={3}>
        <Alert severity="info">
          <Typography variant="body2" gutterBottom>
            <strong>Child Transaction Fee:</strong> {formatFee(estimatedNewFee)}
          </Typography>
          <Typography variant="body2" gutterBottom>
            <strong>Additional Cost:</strong> {formatFee(feeDifference)}
          </Typography>
          <Typography variant="body2">
            <strong>Combined Package Rate:</strong> {combinedFeeRate.toFixed(1)}{" "}
            sat/vB
          </Typography>
        </Alert>
      </Box>

      {/* Educational note */}
      <Box mb={3}>
        <Alert severity="success">
          <Typography variant="body2">
            The child transaction will pay a higher fee to incentivize miners to
            confirm both the parent and child transactions together. This will
            effectively "bump" the fee rate of the original transaction.
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
          disabled={!isFormValid || isCreating}
        >
          {isCreating
            ? "Creating CPFP Transaction..."
            : "Create CPFP Transaction"}
        </Button>
      </Box>
    </Paper>
  );
};
