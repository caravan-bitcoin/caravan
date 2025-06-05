import React from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Box,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
  Paper,
  Alert,
  AlertTitle,
  Divider,
  Chip,
  Grid,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import ChildCareIcon from "@mui/icons-material/ChildCare";
import { FeeBumpStrategy } from "@caravan/fees";
import { formatFee } from "../utils";
import { setFeeBumpStrategy } from "../../../../../actions/feeBumpingActions";
import {
  getFeeBumpRecommendation,
  getSelectedFeeBumpStrategy,
} from "../../../../../selectors/feeBumping";

/**
 * Component for selecting a fee bumping strategy (RBF or CPFP)
 *
 * This component provides a user-friendly interface for selecting between
 * RBF and CPFP strategies with explanations, current network information,
 * and recommendations based on transaction analysis.
 */
export const FeeStrategySelector: React.FC = () => {
  const dispatch = useDispatch();

  // Get state from Redux
  const recommendation = useSelector(getFeeBumpRecommendation);
  const selectedStrategy = useSelector(getSelectedFeeBumpStrategy);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setFeeBumpStrategy(event.target.value as FeeBumpStrategy));
  };

  if (!recommendation) {
    return null;
  }

  // Create strategy description content
  const getStrategyDescription = (strategy: FeeBumpStrategy) => {
    switch (strategy) {
      case FeeBumpStrategy.RBF:
        return {
          title: "Replace-By-Fee (RBF)",
          description:
            "Creates a new transaction that replaces the original with a higher fee",
          icon: <CompareArrowsIcon fontSize="large" />,
          learnMoreUrl: "https://bitcoinops.org/en/topics/replace-by-fee/",
          disabled: !recommendation.canRBF,
          disabledReason:
            "This transaction does not signal RBF and cannot be replaced",
          minimumFee: recommendation.estimatedRBFFee,
          suggestedFeeRate: recommendation.suggestedRBFFeeRate,
        };
      case FeeBumpStrategy.CPFP:
        return {
          title: "Child-Pays-for-Parent (CPFP)",
          description:
            "Creates a new transaction that spends outputs from the original with a higher fee",
          icon: <ChildCareIcon fontSize="large" />,
          learnMoreUrl: "https://bitcoinops.org/en/topics/cpfp/",
          disabled: !recommendation.canCPFP || true, // Force disable CPFP for now as we'll add it later
          disabledReason: !recommendation.canCPFP
            ? "This transaction doesn't have suitable outputs for CPFP"
            : "CPFP support is coming in a future update",
          minimumFee: recommendation.estimatedCPFPFee,
          suggestedFeeRate: recommendation.suggestedCPFPFeeRate,
        };
      default:
        return {
          title: "Unknown Strategy",
          description: "",
          icon: null,
          learnMoreUrl: "",
          disabled: true,
          disabledReason: "",
          minimumFee: "0",
          suggestedFeeRate: 0,
        };
    }
  };

  const rbfInfo = getStrategyDescription(FeeBumpStrategy.RBF);
  const cpfpInfo = getStrategyDescription(FeeBumpStrategy.CPFP);

  // Show current network fee information
  const networkFeeEstimates = recommendation.networkFeeEstimates;

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        Select Fee Bumping Strategy
      </Typography>

      <Box mb={3}>
        {recommendation.recommendedStrategy === FeeBumpStrategy.NONE ? (
          <Alert severity="info">
            <AlertTitle>No Fee Bump Needed</AlertTitle>
            This transaction doesn&apos;t need fee bumping or no viable strategy
            is available.
          </Alert>
        ) : (
          <Alert severity="info">
            <AlertTitle>Strategy Recommendation</AlertTitle>
            Based on transaction analysis, we recommend using{" "}
            <strong>{recommendation.recommendedStrategy}</strong> to accelerate
            this transaction.
          </Alert>
        )}
      </Box>

      {/* Network fee information */}
      {networkFeeEstimates && (
        <Box mb={3}>
          <Typography variant="subtitle2" gutterBottom>
            Current Network Fee Rates
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Paper variant="outlined" sx={{ p: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  High Priority (~10 min)
                </Typography>
                <Typography variant="h6">
                  {networkFeeEstimates.highPriority} sat/vB
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6}>
              <Paper variant="outlined" sx={{ p: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Medium Priority (~30 min)
                </Typography>
                <Typography variant="h6">
                  {networkFeeEstimates.mediumPriority} sat/vB
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          <Box mt={1}>
            <Typography variant="body2" color="text.secondary">
              Your transaction&apos;s current fee rate:{" "}
              <strong>
                {recommendation.currentFeeRate?.toFixed(1)} sat/vB
              </strong>
            </Typography>
          </Box>
        </Box>
      )}

      <Divider sx={{ my: 2 }} />

      {/* Strategy selection */}
      <FormControl component="fieldset" fullWidth>
        <RadioGroup
          aria-label="fee-bumping-strategy"
          name="fee-bumping-strategy"
          value={selectedStrategy}
          onChange={handleChange}
        >
          {/* RBF Strategy Option */}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              mb: 2,
              opacity: rbfInfo.disabled ? 0.7 : 1,
              border:
                selectedStrategy === FeeBumpStrategy.RBF
                  ? "2px solid #1976d2"
                  : "1px solid rgba(0, 0, 0, 0.12)",
            }}
          >
            <FormControlLabel
              value={FeeBumpStrategy.RBF}
              control={<Radio />}
              label={
                <Box>
                  <Box display="flex" alignItems="center">
                    {rbfInfo.icon}
                    <Box ml={1}>
                      <Typography variant="h6">
                        {rbfInfo.title}
                        {recommendation.recommendedStrategy ===
                          FeeBumpStrategy.RBF && (
                          <Chip
                            label="Recommended"
                            color="primary"
                            size="small"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {rbfInfo.description}
                      </Typography>
                    </Box>
                  </Box>

                  {!rbfInfo.disabled && (
                    <Box mt={2}>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            Minimum fee required:
                          </Typography>
                          <Typography variant="body2">
                            {formatFee(rbfInfo.minimumFee)}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            Suggested fee rate:
                          </Typography>
                          <Typography variant="body2">
                            {rbfInfo.suggestedFeeRate} sat/vB
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  )}

                  {rbfInfo.disabled && (
                    <Typography
                      variant="caption"
                      color="error"
                      sx={{ display: "block", mt: 1 }}
                    >
                      {rbfInfo.disabledReason}
                    </Typography>
                  )}
                </Box>
              }
              disabled={rbfInfo.disabled}
            />
          </Paper>

          {/* CPFP Strategy Option */}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              opacity: cpfpInfo.disabled ? 0.7 : 1,
              border:
                selectedStrategy === FeeBumpStrategy.CPFP
                  ? "2px solid #1976d2"
                  : "1px solid rgba(0, 0, 0, 0.12)",
            }}
          >
            <FormControlLabel
              value={FeeBumpStrategy.CPFP}
              control={<Radio />}
              label={
                <Box>
                  <Box display="flex" alignItems="center">
                    {cpfpInfo.icon}
                    <Box ml={1}>
                      <Typography variant="h6">
                        {cpfpInfo.title}
                        {recommendation.recommendedStrategy ===
                          FeeBumpStrategy.CPFP && (
                          <Chip
                            label="Recommended"
                            color="primary"
                            size="small"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {cpfpInfo.description}
                      </Typography>
                    </Box>
                  </Box>

                  {!cpfpInfo.disabled && (
                    <Box mt={2}>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            Minimum fee required:
                          </Typography>
                          <Typography variant="body2">
                            {formatFee(cpfpInfo.minimumFee)}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            Suggested fee rate:
                          </Typography>
                          <Typography variant="body2">
                            {cpfpInfo.suggestedFeeRate} sat/vB
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  )}

                  {cpfpInfo.disabled && (
                    <Typography
                      variant="caption"
                      color="error"
                      sx={{ display: "block", mt: 1 }}
                    >
                      {cpfpInfo.disabledReason}
                    </Typography>
                  )}
                </Box>
              }
              disabled={cpfpInfo.disabled}
            />
          </Paper>
        </RadioGroup>
      </FormControl>

      {/* Help information */}
      <Box mt={3}>
        <Alert severity="info" icon={<InfoOutlinedIcon />}>
          <AlertTitle>What are fee bumping strategies?</AlertTitle>
          <Typography variant="body2">
            Fee bumping allows you to accelerate a pending transaction by
            increasing its fee. This makes it more attractive to miners and
            increases the chance of faster confirmation.
          </Typography>

          <Typography variant="body2" mt={1}>
            <strong>RBF (Replace-By-Fee):</strong> Creates a new transaction
            that replaces the original one. Requires that the original
            transaction signals RBF.
          </Typography>

          <Typography variant="body2" mt={1}>
            <strong>CPFP (Child-Pays-for-Parent):</strong> Creates a new
            transaction that spends an output from the original transaction. The
            child transaction includes a high enough fee to incentivize miners
            to include both transactions.
          </Typography>
        </Alert>
      </Box>
    </Paper>
  );
};
