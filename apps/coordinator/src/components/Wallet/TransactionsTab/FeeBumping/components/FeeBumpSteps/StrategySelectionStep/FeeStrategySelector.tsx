import React, { useEffect, useMemo } from "react";
import BigNumber from "bignumber.js";
import {
  Box,
  Typography,
  Paper,
  Alert,
  AlertTitle,
  Divider,
  Tooltip,
} from "@mui/material";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import ChildCareIcon from "@mui/icons-material/ChildCare";
import { InfoOutlined } from "@mui/icons-material";
import { FeeBumpStrategy } from "@caravan/transactions";
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
    setEnableFullRBF,
    state: { selectedStrategy, enableFullRBF },
    analysis,
    cpfp,
  } = useAccelerationModal();
  const { data: networkFeeEstimates, isLoading: isLoadingFeeEstimates } =
    useFeeEstimates();

  if (!analysis?.recommendedStrategy || isLoadingFeeEstimates) {
    return null;
  }
  const signalsRBF = analysis?.isRBFSignaled ?? false;
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
        disabled: !analysis.canRBF && !enableFullRBF,
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
        disabled: !analysis.canCPFP || !cpfp?.feeRate, // Disable if no CPFP data
        disabledReason:
          "This transaction doesn't have suitable outputs for CPFP",
        minimumFee: new BigNumber(analysis.estimatedCPFPFee).toNumber(),
        suggestedFeeRate: cpfp?.feeRate
          ? new BigNumber(cpfp.feeRate).toNumber()
          : new BigNumber(analysis.estimatedCPFPFee)
              .dividedBy(new BigNumber(analysis.vsize))
              .toNumber(),
      },
    ],
    [analysis, enableFullRBF],
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

      {!signalsRBF && (
        <Box
          sx={{
            mb: 3,
            p: 2,
            backgroundColor: "rgba(255, 152, 0, 0.1)",
            borderRadius: 1,
            border: "1px solid rgba(255, 152, 0, 0.3)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
            <input
              type="checkbox"
              checked={enableFullRBF}
              onChange={(e) => setEnableFullRBF(e.target.checked)}
              id="enable-full-rbf"
              style={{ marginRight: 8, cursor: "pointer" }}
            />
            <label
              htmlFor="enable-full-rbf"
              style={{ cursor: "pointer", fontWeight: 500 }}
            >
              Enable Full RBF (Override RBF signaling)
            </label>
            <Tooltip title="This transaction does not signal RBF. Enabling Full RBF attempts to replace it anyway, but success depends on miner/node policies.">
              <InfoOutlined
                sx={{ ml: 1, fontSize: 18, color: "action.active" }}
              />
            </Tooltip>
          </Box>

          {enableFullRBF && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              <AlertTitle>Full RBF Warning</AlertTitle>
              <Typography variant="body2">
                This transaction did not signal RBF. Using Full RBF may not be
                accepted by all nodes. Success depends on miner and node
                policies.
              </Typography>
            </Alert>
          )}
        </Box>
      )}

      <Box mb={3}>
        {analysis.recommendedStrategy === FeeBumpStrategy.NONE && (
          <Alert severity="info">
            <AlertTitle>No Fee Bump Needed</AlertTitle>
            This transaction doesn&apos;t need fee bumping or no viable strategy
            is available.
          </Alert>
        )}
      </Box>

      {/* Strategy selection */}
      <StrategyRadioGroup
        strategies={strategyConfigs}
        selectedStrategy={selectedStrategy}
        onStrategyChange={setStrategy}
        recommendedStrategy={analysis.recommendedStrategy}
      />

      <Divider sx={{ my: 2 }} />

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
              <Typography>
                {networkFeeEstimates[FeePriority.HIGH]} sat/vB
              </Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 1, flex: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Medium Priority (~30 min)
              </Typography>
              <Typography>
                {networkFeeEstimates[FeePriority.MEDIUM]} sats/vB
              </Typography>
            </Paper>
          </Box>

          <Box mt={1}>
            <Typography variant="body2" color="text.secondary">
              Your transaction&apos;s current fee rate:{" "}
              <strong>{analysis.feeRate?.toFixed(1)} sats/vB</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your transaction&apos;s current fee :{" "}
              <strong>{analysis.fee} sats</strong>
            </Typography>
          </Box>
        </Box>
      )}

      {/* Help information */}
      <HelpInformation />
    </Paper>
  );
};
