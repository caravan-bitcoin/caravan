import React from "react";
import {
  Grid,
  Typography,
  Box,
  Card,
  CardContent,
  LinearProgress,
  Tooltip,
  IconButton,
} from "@mui/material";
import {
  InfoOutlined,
  Security,
  Fingerprint,
  Shuffle,
  Shield,
} from "@mui/icons-material";

interface PrivacyScoreCardProps {
  addressReuseScore: number;
  clusteringRiskScore: number;
  coinJoinParticipation: boolean;
  overallPrivacyScore: number;
}

// Helper function to get score color
const getScoreColor = (score: number) => {
  if (score >= 0.8) return "#4caf50"; // green
  if (score >= 0.6) return "#8bc34a"; // light green
  if (score >= 0.4) return "#ffeb3b"; // yellow
  if (score >= 0.2) return "#ff9800"; // orange
  return "#f44336"; // red
};

// Helper function to get score label
const getScoreLabel = (score: number) => {
  if (score >= 0.8) return "Excellent";
  if (score >= 0.6) return "Good";
  if (score >= 0.4) return "Moderate";
  if (score >= 0.2) return "Poor";
  return "Very Poor";
};

// Helper for coin join participation
const getCoinJoinScore = (hasParticipated: boolean) => {
  return hasParticipated ? 0.9 : 0.2;
};

// Format scores appropriately
const formatScore = (score: number) => {
  return score.toFixed(2);
};

const MetricCard: React.FC<{
  title: string;
  score: number | boolean;
  icon: React.ReactNode;
  description: string;
}> = ({ title, score, icon, description }) => {
  const numericalScore =
    typeof score === "boolean" ? (score ? 0.9 : 0.2) : score;
  const displayText =
    typeof score === "boolean"
      ? score
        ? "Yes"
        : "No"
      : formatScore(numericalScore);

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6" component="div">
            {title}
          </Typography>
          <Tooltip title={description} arrow>
            <IconButton size="small">
              <InfoOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", my: 2 }}>
          {icon}
          <Typography
            variant="h4"
            component="div"
            sx={{
              ml: 1,
              color: getScoreColor(numericalScore),
              fontWeight: "bold",
            }}
          >
            {displayText}
          </Typography>
        </Box>

        <Box sx={{ width: "100%", mt: 2 }}>
          <LinearProgress
            variant="determinate"
            value={numericalScore * 100}
            sx={{
              height: 10,
              borderRadius: 5,
              backgroundColor: "#e0e0e0",
              "& .MuiLinearProgress-bar": {
                borderRadius: 5,
                backgroundColor: getScoreColor(numericalScore),
              },
            }}
          />
          <Typography
            variant="body2"
            component="div"
            sx={{
              mt: 1,
              color: getScoreColor(numericalScore),
              fontWeight: "medium",
            }}
          >
            {typeof score === "boolean"
              ? score
                ? "Enhanced Privacy"
                : "Basic Privacy"
              : getScoreLabel(numericalScore)}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

const PrivacyScoreCard: React.FC<PrivacyScoreCardProps> = ({
  addressReuseScore,
  clusteringRiskScore,
  coinJoinParticipation,
  overallPrivacyScore,
}) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={3}>
        <MetricCard
          title="Address Reuse"
          score={addressReuseScore}
          icon={
            <Fingerprint
              sx={{ color: getScoreColor(addressReuseScore), fontSize: 40 }}
            />
          }
          description="Measures how frequently addresses in your wallet are reused. Higher scores indicate better practices with minimal address reuse."
        />
      </Grid>

      <Grid item xs={12} md={3}>
        <MetricCard
          title="Clustering Risk"
          score={clusteringRiskScore}
          icon={
            <Security
              sx={{ color: getScoreColor(clusteringRiskScore), fontSize: 40 }}
            />
          }
          description="Evaluates the risk of your addresses being clustered together through blockchain analysis. Higher scores indicate lower clustering risk."
        />
      </Grid>

      <Grid item xs={12} md={3}>
        <MetricCard
          title="CoinJoin Usage"
          score={coinJoinParticipation}
          icon={
            <Shuffle
              sx={{
                color: getScoreColor(getCoinJoinScore(coinJoinParticipation)),
                fontSize: 40,
              }}
            />
          }
          description="Indicates whether your wallet has participated in CoinJoin transactions, which enhance privacy by mixing your coins with others."
        />
      </Grid>

      <Grid item xs={12} md={3}>
        <MetricCard
          title="Overall Privacy"
          score={overallPrivacyScore}
          icon={
            <Shield
              sx={{ color: getScoreColor(overallPrivacyScore), fontSize: 40 }}
            />
          }
          description="Combined score based on address reuse, clustering risk, and CoinJoin participation. Higher scores indicate better overall privacy practices."
        />
      </Grid>
    </Grid>
  );
};

export default PrivacyScoreCard;
