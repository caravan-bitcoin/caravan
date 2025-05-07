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
  TrendingUp,
  TrendingDown,
  Speed,
} from "@mui/icons-material";

interface FeeMetricsCardProps {
  relativeFeesScore: number;
  feesToAmountRatio: number;
  weightedWasteScore: number;
}

// Helper function to get score color
const getScoreColor = (score: number, type: "fee" | "ratio" | "waste") => {
  if (type === "fee") {
    if (score >= 0.8) return "#4caf50"; // green
    if (score >= 0.6) return "#8bc34a"; // light green
    if (score >= 0.4) return "#ffeb3b"; // yellow
    if (score >= 0.2) return "#ff9800"; // orange
    return "#f44336"; // red
  } else if (type === "ratio") {
    // Lower is better for fee ratio
    if (score <= 0.001) return "#4caf50"; // green
    if (score <= 0.006) return "#8bc34a"; // light green
    if (score <= 0.0075) return "#ffeb3b"; // yellow
    if (score <= 0.01) return "#ff9800"; // orange
    return "#f44336"; // red
  } else {
    // waste score (higher is better)
    if (score >= 0.8) return "#4caf50"; // green
    if (score >= 0.6) return "#8bc34a"; // light green
    if (score >= 0.4) return "#ffeb3b"; // yellow
    if (score >= 0.2) return "#ff9800"; // orange
    return "#f44336"; // red
  }
};

// Helper function to get score label
const getScoreLabel = (score: number, type: "fee" | "ratio" | "waste") => {
  if (type === "fee") {
    if (score >= 0.8) return "Excellent";
    if (score >= 0.6) return "Good";
    if (score >= 0.4) return "Moderate";
    if (score >= 0.2) return "Poor";
    return "Very Poor";
  } else if (type === "ratio") {
    // Lower is better for fee ratio
    if (score <= 0.001) return "Excellent";
    if (score <= 0.006) return "Good";
    if (score <= 0.0075) return "Moderate";
    if (score <= 0.01) return "Poor";
    return "Very Poor";
  } else {
    // waste score (higher is better)
    if (score >= 0.8) return "Excellent";
    if (score >= 0.6) return "Good";
    if (score >= 0.4) return "Moderate";
    if (score >= 0.2) return "Poor";
    return "Very Poor";
  }
};

// Format scores appropriately
const formatScore = (score: number, type: "fee" | "ratio" | "waste") => {
  if (type === "ratio") {
    // Format as percentage
    return `${(score * 100).toFixed(2)}%`;
  }
  // Format as decimal (0-1)
  return score.toFixed(2);
};

const MetricCard: React.FC<{
  title: string;
  score: number;
  type: "fee" | "ratio" | "waste";
  icon: React.ReactNode;
  description: string;
}> = ({ title, score, type, icon, description }) => {
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
              color: getScoreColor(score, type),
              fontWeight: "bold",
            }}
          >
            {formatScore(score, type)}
          </Typography>
        </Box>

        <Box sx={{ width: "100%", mt: 2 }}>
          <LinearProgress
            variant="determinate"
            value={type === "ratio" ? (1 - score) * 100 : score * 100}
            sx={{
              height: 10,
              borderRadius: 5,
              backgroundColor: "#e0e0e0",
              "& .MuiLinearProgress-bar": {
                borderRadius: 5,
                backgroundColor: getScoreColor(score, type),
              },
            }}
          />
          <Typography
            variant="body2"
            component="div"
            sx={{
              mt: 1,
              color: getScoreColor(score, type),
              fontWeight: "medium",
            }}
          >
            {getScoreLabel(score, type)}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

const FeeMetricsCard: React.FC<FeeMetricsCardProps> = ({
  relativeFeesScore,
  feesToAmountRatio,
  weightedWasteScore,
}) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <MetricCard
          title="Relative Fees Score"
          score={relativeFeesScore}
          type="fee"
          icon={
            <TrendingDown
              sx={{
                color: getScoreColor(relativeFeesScore, "fee"),
                fontSize: 40,
              }}
            />
          }
          description="Compares the fees paid by your wallet transactions relative to other transactions in the same block. Higher scores indicate you're not overpaying for fees."
        />
      </Grid>

      <Grid item xs={12} md={4}>
        <MetricCard
          title="Fees to Amount Ratio"
          score={feesToAmountRatio}
          type="ratio"
          icon={
            <TrendingUp
              sx={{
                color: getScoreColor(feesToAmountRatio, "ratio"),
                fontSize: 40,
              }}
            />
          }
          description="Ratio of fees paid to the amount spent in transactions. Lower percentages indicate better fee efficiency, similar to credit card processing fees."
        />
      </Grid>

      <Grid item xs={12} md={4}>
        <MetricCard
          title="Overall Fee Health"
          score={weightedWasteScore}
          type="waste"
          icon={
            <Speed
              sx={{
                color: getScoreColor(weightedWasteScore, "waste"),
                fontSize: 40,
              }}
            />
          }
          description="Combined score based on relative fees, amount ratio, and UTXO management. Higher scores indicate better overall fee efficiency."
        />
      </Grid>
    </Grid>
  );
};

export default FeeMetricsCard;
