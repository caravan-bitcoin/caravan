import React from "react";
import { Box, Typography, Paper, Chip, Grid } from "@mui/material";
import {
  TipsAndUpdates,
  HourglassTop,
  Shuffle,
  BarChart,
  AttachMoney,
  LowPriority,
  PriorityHigh,
  CheckCircle,
} from "@mui/icons-material";

interface HealthRecommendationsProps {
  relativeFeesScore: number;
  feesToAmountRatio: number;
  weightedWasteScore: number;
  currentFeeRate: number;
}

const HealthRecommendations: React.FC<HealthRecommendationsProps> = ({
  relativeFeesScore,
  feesToAmountRatio,
  weightedWasteScore,
  currentFeeRate,
}) => {
  const hasHighFeeRatio = feesToAmountRatio > 0.01; // More than 1%
  const hasLowRelativeFeeScore = relativeFeesScore < 0.4;
  const hasLowOverallScore = weightedWasteScore < 0.4;

  // Get relevant recommendations based on scores
  const getRecommendations = () => {
    const recommendations = [];

    // Fee rate recommendations
    if (hasLowRelativeFeeScore) {
      recommendations.push({
        title: "Optimize Fee Selection",
        description:
          "Your transactions often pay higher fees than necessary. Consider using a fee estimator to select appropriate fee rates.",
        icon: <BarChart color="primary" />,
        priority: "High",
        tags: ["Fees", "Transactions"],
      });

      recommendations.push({
        title: "Use RBF (Replace-By-Fee)",
        description:
          "Enable Replace-By-Fee for your transactions to start with lower fees and increase them only if needed.",
        icon: <Shuffle color="primary" />,
        priority: "Medium",
        tags: ["Fees", "Transactions"],
      });
    }

    // Fee to amount ratio recommendations
    if (hasHighFeeRatio) {
      recommendations.push({
        title: "Batch Transactions",
        description:
          "Consider batching multiple payments into a single transaction to reduce the overall fee-to-amount ratio.",
        icon: <AttachMoney color="primary" />,
        priority: "High",
        tags: ["Efficiency", "Transactions"],
      });
    }

    // Fee market timing
    recommendations.push({
      title: "Time Your Transactions",
      description: `Current fee rate is ${currentFeeRate} sat/vB. If not urgent, consider sending during weekends or off-peak hours when fees are typically lower.`,
      icon: <HourglassTop color="primary" />,
      priority: currentFeeRate > 20 ? "High" : "Medium",
      tags: ["Timing", "Fees"],
    });

    // UTXO management
    recommendations.push({
      title: "Consolidate UTXOs",
      description:
        "Consider consolidating smaller UTXOs during low fee periods to prevent dust accumulation and improve future transaction efficiency.",
      icon: <Shuffle color="primary" />,
      priority: "Medium",
      tags: ["UTXOs", "Maintenance"],
    });

    // Congratulatory message if scores are good
    if (!hasLowRelativeFeeScore && !hasHighFeeRatio && !hasLowOverallScore) {
      recommendations.push({
        title: "Great Fee Management!",
        description:
          "Your wallet demonstrates good fee management practices. Continue monitoring the fee market for optimal transaction timing.",
        icon: <CheckCircle color="success" />,
        priority: "Low",
        tags: ["Healthy"],
      });
    }

    return recommendations;
  };

  const recommendations = getRecommendations();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "error";
      case "Medium":
        return "warning";
      case "Low":
        return "success";
      default:
        return "default";
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <TipsAndUpdates color="primary" sx={{ mr: 1 }} />
        <Typography variant="subtitle1">
          Fee Optimization Recommendations
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {recommendations.map((recommendation, index) => (
          <Grid item xs={12} key={index}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                mb: 1,
                borderLeft: `4px solid ${
                  getPriorityColor(recommendation.priority) === "error"
                    ? "#f44336"
                    : getPriorityColor(recommendation.priority) === "warning"
                      ? "#ff9800"
                      : "#4caf50"
                }`,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 1,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  {recommendation.icon}
                  <Typography variant="h6" sx={{ ml: 1 }}>
                    {recommendation.title}
                  </Typography>
                </Box>
                <Chip
                  label={recommendation.priority}
                  size="small"
                  color={
                    getPriorityColor(recommendation.priority) as
                      | "error"
                      | "warning"
                      | "success"
                      | "default"
                  }
                  icon={
                    recommendation.priority === "High" ? (
                      <PriorityHigh />
                    ) : recommendation.priority === "Medium" ? (
                      <AttachMoney />
                    ) : (
                      <LowPriority />
                    )
                  }
                />
              </Box>

              <Typography variant="body2" sx={{ mt: 1, mb: 2 }}>
                {recommendation.description}
              </Typography>

              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {recommendation.tags.map((tag, tagIndex) => (
                  <Chip
                    key={tagIndex}
                    label={tag}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Typography
        variant="caption"
        sx={{ display: "block", mt: 2, fontStyle: "italic" }}
      >
        Note: These recommendations are based on your wallet&apos;s fee metrics
        and current market conditions. Adjust your strategy based on your
        specific transaction requirements and urgency.
      </Typography>
    </Box>
  );
};

export default HealthRecommendations;
