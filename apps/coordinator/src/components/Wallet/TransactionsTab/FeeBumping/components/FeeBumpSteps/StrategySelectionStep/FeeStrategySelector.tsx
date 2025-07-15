import React, { useEffect, useMemo } from "react";
import BigNumber from "bignumber.js";
import {
  Box,
  Typography,
  Paper,
  Alert,
  AlertTitle,
  Divider,
} from "@mui/material";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import ChildCareIcon from "@mui/icons-material/ChildCare";
import { FeeBumpStrategy } from "@caravan/fees";
import { useAccelerationModal } from "../../../components/AccelerationModalContext";
import { FeePriority, useFeeEstimates } from "clients/fees";
import { HelpInformation } from "./HelpInformation";

import { StrategyRadioGroup } from "./StrategyRadioGroup";

/**
 * Component for selecting a fee bumping strategy (RBF or CPFP)
 *
 * This component provides a user-friendly interface for selecting between
 * RBF and CPFP strategies with explanations, current network information,
 * and recommendations based on transaction analysis.
 */
export const FeeStrategySelector: React.FC = () => {
  const {
    setStrategy,
    state: { selectedStrategy },
    analysis,
  } = useAccelerationModal();
  const { data: networkFeeEstimates, isLoading: isLoadingFeeEstimates } =
    useFeeEstimates();

  if (!analysis?.recommendedStrategy || isLoadingFeeEstimates) {
    return null;
  }

  // Memoize strategy configuration array to prevent re-creation on every render
  const strategyConfigs = useMemo(
    () => [
      {
        strategy: FeeBumpStrategy.RBF,
        title: "Replace-By-Fee (RBF)",
        description:
          "Creates a new transaction that replaces the original with a higher fee",
        icon: <CompareArrowsIcon fontSize="large" />,
        learnMoreUrl: "https://bitcoinops.org/en/topics/replace-by-fee/",
        disabled: !analysis.canRBF,
        disabledReason:
          "This transaction does not signal RBF and cannot be replaced",
        minimumFee: new BigNumber(analysis.estimatedRBFFee).toNumber(),
        suggestedFeeRate: new BigNumber(analysis.estimatedRBFFee)
          .dividedBy(new BigNumber(analysis.vsize))
          .toNumber(),
      },
      {
        strategy: FeeBumpStrategy.CPFP,
        title: "Child-Pays-for-Parent (CPFP)",
        description:
          "Creates a new transaction that spends outputs from the original with a higher fee",
        icon: <ChildCareIcon fontSize="large" />,
        learnMoreUrl: "https://bitcoinops.org/en/topics/cpfp/",
        disabled: !analysis.canCPFP || true, // Force disable CPFP for now as we'll add it later
        disabledReason: !analysis.canCPFP
          ? "This transaction doesn't have suitable outputs for CPFP"
          : "CPFP support is coming in a future update",
        minimumFee: new BigNumber(analysis.estimatedCPFPFee).toNumber(),
        suggestedFeeRate: new BigNumber(analysis.estimatedCPFPFee)
          .dividedBy(new BigNumber(analysis.vsize))
          .toNumber(),
      },
    ],
    [analysis],
  );

  // Auto-select the first strategy if none is selected
  useEffect(() => {
    if (!selectedStrategy && strategyConfigs.length > 0) {
      setStrategy(strategyConfigs[0].strategy);
    }
  }, [selectedStrategy, strategyConfigs, setStrategy]);

  if (!analysis) return null;

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        Select Fee Bumping Strategy
      </Typography>

      <Box mb={3}>
        {analysis.recommendedStrategy === FeeBumpStrategy.NONE ? (
          <Alert severity="info">
            <AlertTitle>No Fee Bump Needed</AlertTitle>
            This transaction doesn&apos;t need fee bumping or no viable strategy
            is available.
          </Alert>
        ) : (
          <Alert severity="info">
            <AlertTitle>Strategy Recommendation</AlertTitle>
            Based on transaction analysis, we recommend using{" "}
            <strong>{analysis.recommendedStrategy}</strong> to accelerate this
            transaction.
          </Alert>
        )}
      </Box>

      {/* Network fee information */}
      {networkFeeEstimates && (
        <Box mb={3}>
          <Typography variant="subtitle2" gutterBottom>
            Current Network Fee Rates
          </Typography>
          <Box display="flex" gap={2}>
            <Paper variant="outlined" sx={{ p: 1, flex: 1 }}>
              <Typography variant="body2" color="text.secondary">
                High Priority (~10 min)
              </Typography>
              <Typography variant="h6">
                {networkFeeEstimates[FeePriority.HIGH]} sat/vB
              </Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 1, flex: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Medium Priority (~30 min)
              </Typography>
              <Typography variant="h6">
                {networkFeeEstimates[FeePriority.MEDIUM]} sat/vB
              </Typography>
            </Paper>
          </Box>

          <Box mt={1}>
            <Typography variant="body2" color="text.secondary">
              Your transaction&apos;s current fee rate:{" "}
              <strong>{analysis.feeRate?.toFixed(1)} sat/vB</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your transaction&apos;s current fee :{" "}
              <strong>{analysis.fee} sats</strong>
            </Typography>
          </Box>
        </Box>
      )}

      <Divider sx={{ my: 2 }} />

      {/* Strategy selection */}
      <StrategyRadioGroup
        strategies={strategyConfigs}
        selectedStrategy={selectedStrategy}
        onStrategyChange={setStrategy}
        recommendedStrategy={analysis.recommendedStrategy}
      />

      {/* Help information */}
      <HelpInformation />
    </Paper>
  );
};
