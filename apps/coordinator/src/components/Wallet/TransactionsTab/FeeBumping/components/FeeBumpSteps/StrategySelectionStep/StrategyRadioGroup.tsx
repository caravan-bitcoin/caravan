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
} from "@mui/material";
import { FeeBumpStrategy } from "@caravan/fees";
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
    console.log("handleChange called with:", event.target.value);
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
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Minimum fee required:
                        </Typography>
                        <Typography variant="body2">
                          {formatFee(config.minimumFee.toString())}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Suggested fee rate:
                        </Typography>
                        <Typography variant="body2">
                          {config.suggestedFeeRate} sat/vB
                        </Typography>
                      </Grid>
                    </Grid>
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
