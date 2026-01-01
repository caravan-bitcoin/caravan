import React from "react";
import {
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Box,
  Typography,
  Grid,
  Chip,
  Paper,
  Tooltip,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import { FeeBumpStrategy } from "@caravan/transactions";
import { formatFee } from "../../../utils";

interface StrategyConfig {
  strategy: FeeBumpStrategy;
  title: string;
  description: string;
  icon: React.ReactNode;
  learnMoreUrl: string;
  disabled: boolean;
  disabledReason?: string;
  minimumFee: number;
  suggestedFeeRate: number;
  targetFeeRate?: number;
}

interface StrategyRadioOptionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  isSelected: boolean;
  isRecommended: boolean;
  isDisabled: boolean;
  disabledReason?: string;
  minimumFee: number;
  suggestedFeeRate: number;
}

export const StrategyRadioOption: React.FC<StrategyRadioOptionProps> = ({
  title,
  description,
  icon,
  isSelected,
  isRecommended,
  isDisabled,
  disabledReason,
  minimumFee,
  suggestedFeeRate,
}) => {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        mb: 2,
        opacity: isDisabled ? 0.7 : 1,
        border: isSelected
          ? "2px solid #1976d2"
          : "1px solid rgba(0, 0, 0, 0.12)",
      }}
    >
      <Box>
        <Box display="flex" alignItems="center">
          {icon}
          <Box ml={1}>
            <Typography variant="h6">
              {title}
              {isRecommended && (
                <Chip
                  label="Recommended"
                  color="primary"
                  size="small"
                  sx={{ ml: 1 }}
                />
              )}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          </Box>
        </Box>

        {!isDisabled && (
          <Box mt={2}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Minimum fee required:
                </Typography>
                <Typography variant="body2">
                  {formatFee(minimumFee.toString())}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Suggested fee rate:
                </Typography>
                <Typography variant="body2">
                  {suggestedFeeRate} sat/vB
                </Typography>
              </Grid>
            </Grid>
          </Box>
        )}

        {isDisabled && disabledReason && (
          <Typography
            variant="caption"
            color="error"
            sx={{ display: "block", mt: 1 }}
          >
            {disabledReason}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

interface StrategyRadioGroupProps {
  strategies: StrategyConfig[];
  selectedStrategy: FeeBumpStrategy | null;
  onStrategyChange: (strategy: FeeBumpStrategy) => void;
  recommendedStrategy?: FeeBumpStrategy;
}

export const StrategyRadioGroup: React.FC<StrategyRadioGroupProps> = ({
  strategies,
  selectedStrategy,
  onStrategyChange,
  recommendedStrategy,
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onStrategyChange(event.target.value as FeeBumpStrategy);
  };

  return (
    <FormControl component="fieldset" fullWidth>
      <RadioGroup
        aria-label="fee-bumping-strategy"
        name="fee-bumping-strategy"
        value={selectedStrategy || ""}
        onChange={handleChange}
      >
        {strategies.map((config) => (
          <FormControlLabel
            key={config.strategy}
            value={config.strategy}
            control={<Radio disabled={config.disabled} />}
            disabled={config.disabled}
            label={
              <Box>
                <Box display="flex" alignItems="center">
                  {config.icon}
                  <Box ml={1}>
                    <Typography variant="h6">
                      {config.title}
                      {recommendedStrategy === config.strategy && (
                        <Chip
                          label="Recommended"
                          color="primary"
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {config.description}
                    </Typography>
                  </Box>
                </Box>

                {!config.disabled && (
                  <Box mt={2}>
                    {config.strategy === "CPFP" ? (
                      <>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Child transaction fee:
                              </Typography>
                              <Tooltip title="The fee the new child transaction must pay to accelerate confirmation of the stuck parent transaction">
                                <InfoIcon fontSize="small" color="action" />
                              </Tooltip>
                            </Box>
                            <Typography variant="body2" fontWeight="medium">
                              {formatFee(config.minimumFee.toString())}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Child transaction fee rate:
                              </Typography>
                              <Tooltip
                                title={
                                  <Box>
                                    <Typography
                                      variant="caption"
                                      display="block"
                                      gutterBottom
                                    >
                                      <strong>CPFP Formula:</strong>
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      display="block"
                                      gutterBottom
                                      fontFamily="monospace"
                                    >
                                      (TargetRate × TotalSize - ParentFee) /
                                      ChildSize
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      display="block"
                                      gutterBottom
                                    >
                                      Target: {config.targetFeeRate?.toFixed(2)}{" "}
                                      sat/vB (current network medium rate)
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      display="block"
                                    >
                                      The child pays a higher fee rate so that
                                      when miners evaluate parent + child
                                      together, the combined effective fee rate
                                      reaches the target.
                                    </Typography>
                                  </Box>
                                }
                              >
                                <InfoIcon fontSize="small" color="action" />
                              </Tooltip>
                            </Box>
                            <Typography variant="body2" fontWeight="medium">
                              {config.suggestedFeeRate.toFixed(1)} sat/vB
                            </Typography>
                          </Grid>
                        </Grid>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block", mt: 1 }}
                        >
                          Creates a new transaction spending the stuck
                          transaction&apos;s output to achieve{" "}
                          {config.targetFeeRate?.toFixed(2)} sat/vB combined
                          effective rate for both transactions
                        </Typography>
                      </>
                    ) : (
                      // RBF or other strategies
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            Minimum fee required:
                          </Typography>
                          <Typography variant="body2" fontWeight="medium">
                            {formatFee(config.minimumFee.toString())}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            Suggested fee rate:
                          </Typography>
                          <Typography variant="body2" fontWeight="medium">
                            {config.suggestedFeeRate.toFixed(1)} sat/vB
                          </Typography>
                        </Grid>
                      </Grid>
                    )}
                  </Box>
                )}

                {config.disabled && config.disabledReason && (
                  <Typography
                    variant="caption"
                    color="error"
                    sx={{ display: "block", mt: 1 }}
                  >
                    {config.disabledReason}
                  </Typography>
                )}
              </Box>
            }
            sx={{
              width: "100%",
              margin: 0,
              padding: 2,
              border:
                selectedStrategy === config.strategy
                  ? "2px solid #1976d2"
                  : "1px solid rgba(0, 0, 0, 0.12)",
              borderRadius: 1,
              opacity: config.disabled ? 0.7 : 1,
              marginBottom: 2,
            }}
          />
        ))}
      </RadioGroup>
    </FormControl>
  );
};
