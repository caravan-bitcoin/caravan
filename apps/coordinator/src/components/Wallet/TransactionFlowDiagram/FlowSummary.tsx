import React from "react";
import { Box, Paper, Typography, Chip, useTheme } from "@mui/material";
import BigNumber from "bignumber.js";

interface FlowSummaryProps {
  recipientOutputs: Array<{ amount: string; isChange: boolean }>;
  changeOutputs: Array<{ amount: string; isChange: boolean }>;
  feeBtc: BigNumber;
  totalInputBtc: BigNumber;
}

const FlowSummary: React.FC<FlowSummaryProps> = ({
  recipientOutputs,
  changeOutputs,
  feeBtc,
  totalInputBtc,
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        mt: 3,
        pt: 2,
        borderTop: `1px solid ${theme.palette.divider}`,
      }}
    >
      {/* Legend */}
      <Box
        sx={{
          display: "flex",
          gap: { xs: 2, sm: 3 },
          flexWrap: "wrap",
          justifyContent: "center",
          mb: 2,
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <Box
            sx={{
              width: 12,
              height: 12,
              border: "2px solid #ea9c0d",
              backgroundColor: "#ea9c0d",
              borderRadius: 0.5,
            }}
          />
          <Typography
            variant="caption"
            sx={{ color: theme.palette.text.secondary, fontSize: "0.75rem" }}
          >
            Payment Output
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <Box
            sx={{
              width: 12,
              height: 12,
              border: `2px solid ${theme.palette.primary.main}`,
              backgroundColor: theme.palette.primary.main,
              borderRadius: 0.5,
            }}
          />
          <Typography
            variant="caption"
            sx={{ color: theme.palette.text.secondary, fontSize: "0.75rem" }}
          >
            Change Output
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <Box
            sx={{
              width: 12,
              height: 12,
              border: `1px dashed ${theme.palette.divider}`,
              backgroundColor: theme.palette.text.secondary,
              borderRadius: 0.5,
            }}
          />
          <Typography
            variant="caption"
            sx={{ color: theme.palette.text.secondary, fontSize: "0.75rem" }}
          >
            Network Fee
          </Typography>
        </Box>
      </Box>

      {/* Dust Status Explanation */}
      <Box
        sx={{
          mt: 2,
          p: 2,
          backgroundColor: theme.palette.grey[50],
          borderRadius: 1,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            color: theme.palette.text.secondary,
            display: "block",
            mb: 1,
          }}
        >
          Input Dust Status:
        </Typography>
        <Box display="flex" gap={2} flexWrap="wrap">
          <Box display="flex" alignItems="center" gap={0.5}>
            <Chip
              label="Economical"
              color="success"
              size="small"
              sx={{ height: 20, fontSize: "0.7rem" }}
            />
            <Typography
              variant="caption"
              sx={{ color: theme.palette.text.secondary }}
            >
              = Cost-effective to spend
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Chip
              label="Warning"
              color="warning"
              size="small"
              sx={{ height: 20, fontSize: "0.7rem" }}
            />
            <Typography
              variant="caption"
              sx={{ color: theme.palette.text.secondary }}
            >
              = Consider batching
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Chip
              label="Dust"
              color="error"
              size="small"
              sx={{ height: 20, fontSize: "0.7rem" }}
            />
            <Typography
              variant="caption"
              sx={{ color: theme.palette.text.secondary }}
            >
              = Costs more to spend than value
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* SUMMARY Section */}
      <Box
        sx={{
          mt: 3,
          mb: 3,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: theme.palette.text.primary,
            mb: 2,
          }}
        >
          Transaction Summary
        </Typography>

        {/* Summary Cards in Grid */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(4, 1fr)",
            },
            gap: 2,
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 2,
              backgroundColor: theme.palette.grey[50],
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 2,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: theme.palette.text.secondary,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                fontWeight: 600,
              }}
            >
              Total Sending
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: "#ea9c0d",
                mt: 0.5,
              }}
            >
              {recipientOutputs
                .reduce((sum, o) => sum.plus(BigNumber(o.amount)), BigNumber(0))
                .toFixed(8)}{" "}
              BTC
            </Typography>
          </Paper>

          {changeOutputs.length > 0 && (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                backgroundColor: theme.palette.grey[50],
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: theme.palette.text.secondary,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  fontWeight: 600,
                }}
              >
                Change Returning
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  color: theme.palette.primary.main,
                  mt: 0.5,
                }}
              >
                {changeOutputs
                  .reduce(
                    (sum, o) => sum.plus(BigNumber(o.amount)),
                    BigNumber(0),
                  )
                  .toFixed(8)}{" "}
                BTC
              </Typography>
            </Paper>
          )}

          <Paper
            elevation={0}
            sx={{
              p: 2,
              backgroundColor: theme.palette.grey[50],
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 2,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: theme.palette.text.secondary,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                fontWeight: 600,
              }}
            >
              Network Fee
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: theme.palette.error.main,
                mt: 0.5,
              }}
            >
              {feeBtc.toFixed(8)} BTC
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: theme.palette.text.secondary,
                display: "block",
                mt: 0.5,
              }}
            >
              {(() => {
                const pct =
                  feeBtc
                    .dividedBy(totalInputBtc)
                    .multipliedBy(100)
                    .toNumber() || 0;
                const pctStr = pct.toFixed(2);
                const approx = pct > 0 && pctStr === "0.00" ? "~" : "";
                return `${approx}${pctStr}`;
              })()}
              % of total
            </Typography>
          </Paper>

          <Box
            sx={{
              p: 2,
              backgroundColor: theme.palette.primary.main,
              borderRadius: 2,
              color: "#fff",
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: "rgba(255,255,255,0.8)",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                fontWeight: 600,
              }}
            >
              Total Input
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                mt: 0.5,
              }}
            >
              {totalInputBtc.toFixed(8)} BTC
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default FlowSummary;
