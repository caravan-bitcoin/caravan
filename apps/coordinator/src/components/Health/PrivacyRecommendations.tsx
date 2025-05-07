import React from "react";
import { Box, Typography, Paper, Chip, Grid } from "@mui/material";
import {
  TipsAndUpdates,
  Security,
  Fingerprint,
  Shuffle,
  Visibility,
  CheckCircle,
  LocalOffer,
  Shield,
} from "@mui/icons-material";

interface PrivacyRecommendationsProps {
  addressReuseScore: number;
  clusteringRiskScore: number;
  coinJoinParticipation: boolean;
  overallPrivacyScore: number;
  walletType: string;
}

const PrivacyRecommendations: React.FC<PrivacyRecommendationsProps> = ({
  addressReuseScore,
  clusteringRiskScore,
  coinJoinParticipation,
  overallPrivacyScore,
  walletType,
}) => {
  const hasAddressReuseIssues = addressReuseScore < 0.7;
  const hasClusteringIssues = clusteringRiskScore < 0.7;
  const hasCoinJoinOpportunity = !coinJoinParticipation;

  // Get relevant recommendations based on scores
  const getRecommendations = () => {
    const recommendations = [];

    // Address reuse recommendations
    if (hasAddressReuseIssues) {
      recommendations.push({
        title: "Avoid Address Reuse",
        description:
          "Generate and use a new address for each transaction. Address reuse links your transactions together on the blockchain.",
        icon: <Fingerprint color="primary" />,
        priority: "High",
        tags: ["Address Management", "Basic Privacy"],
      });
    }

    // Clustering risk recommendations
    if (hasClusteringIssues) {
      recommendations.push({
        title: "Improve Transaction Patterns",
        description:
          "Avoid patterns that link your transactions together, such as sending to multiple recipients in round numbers or predictable time intervals.",
        icon: <Security color="primary" />,
        priority: "Medium",
        tags: ["Transaction Pattern", "Advanced Privacy"],
      });

      recommendations.push({
        title: "Use a Lightning Network Channel",
        description:
          "Consider using Lightning Network for small payments to avoid on-chain fingerprinting and improve privacy.",
        icon: <LocalOffer color="primary" />,
        priority: "Medium",
        tags: ["Off-Chain", "Lightning Network"],
      });
    }

    // CoinJoin recommendations
    if (hasCoinJoinOpportunity) {
      recommendations.push({
        title: "Consider Using CoinJoin",
        description: `Enhance your privacy by using CoinJoin for selected transactions. Tools like Wasabi Wallet or JoinMarket can help you mix your coins with others.`,
        icon: <Shuffle color="primary" />,
        priority: "Medium",
        tags: ["CoinJoin", "Advanced Privacy"],
      });
    }

    // General privacy recommendations
    recommendations.push({
      title: "Use Tor or VPN",
      description:
        "Connect to the Bitcoin network through Tor or a trusted VPN service to mask your IP address from network observers.",
      icon: <Visibility color="primary" />,
      priority: "Medium",
      tags: ["Network Privacy", "Advanced Privacy"],
    });

    if (walletType !== "P2WSH") {
      recommendations.push({
        title: "Upgrade to Native SegWit",
        description:
          "Consider migrating to native SegWit addresses (P2WSH) for improved privacy fingerprinting and lower fees.",
        icon: <Shield color="primary" />,
        priority: "Low",
        tags: ["Wallet Structure", "Basic Privacy"],
      });
    }

    // Congratulatory message if scores are good
    if (overallPrivacyScore >= 0.8) {
      recommendations.push({
        title: "Great Privacy Practices!",
        description:
          "Your wallet demonstrates good privacy practices. Continue to monitor and apply privacy best practices as you use Bitcoin.",
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
          Privacy Optimization Recommendations
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
        Note: These recommendations are general privacy best practices. The
        right privacy approach depends on your specific threat model and use
        case.
      </Typography>
    </Box>
  );
};

export default PrivacyRecommendations;
