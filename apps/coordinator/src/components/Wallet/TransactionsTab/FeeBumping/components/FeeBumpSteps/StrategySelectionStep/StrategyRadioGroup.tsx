import React from "react";
import {
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Box,
  Typography,
  Chip,
} from "@mui/material";
import { FeeBumpStrategy } from "@caravan/transactions";
import { CpfpStrategyDetails } from "./CpfpStrategyDetails";
import { StandardStrategyDetails } from "./StandardStrategyDetails";

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
                      <CpfpStrategyDetails
                        minimumFee={config.minimumFee}
                        suggestedFeeRate={config.suggestedFeeRate}
                        targetFeeRate={config.targetFeeRate!}
                      />
                    ) : (
                      // RBF or other strategies
                      <StandardStrategyDetails
                        minimumFee={config.minimumFee}
                        suggestedFeeRate={config.suggestedFeeRate}
                      />
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
