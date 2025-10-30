import React from "react";
import { ToggleButtonGroup, ToggleButton, Box, Chip } from "@mui/material";
import CallReceivedIcon from "@mui/icons-material/CallReceived";
import CallMadeIcon from "@mui/icons-material/CallMade";
import AllInclusiveIcon from "@mui/icons-material/AllInclusive";

interface TransactionFilterProps {
  filterType: "all" | "received" | "sent";
  onFilterChange: (newFilter: "all" | "received" | "sent") => void;
  counts: {
    all: number;
    received: number;
    sent: number;
  };
}

export const TransactionFilter: React.FC<TransactionFilterProps> = ({
  filterType,
  onFilterChange,
  counts,
}) => {
  const handleFilterChange = (
    _event: React.MouseEvent<HTMLElement>,
    newFilter: "all" | "received" | "sent" | null,
  ) => {
    if (newFilter !== null) {
      onFilterChange(newFilter);
    }
  };

  return (
    <Box
      sx={{
        mb: 2,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 2,
      }}
    >
      <ToggleButtonGroup
        value={filterType}
        exclusive
        onChange={handleFilterChange}
        aria-label="transaction filter"
        size="small"
      >
        <ToggleButton value="all" aria-label="all transactions">
          <Box display="flex" alignItems="center" gap={1}>
            <AllInclusiveIcon fontSize="small" />
            <span>All</span>
            <Chip
              label={counts.all}
              size="small"
              sx={{
                height: 20,
                minWidth: 28,
                backgroundColor:
                  filterType === "all" ? "primary.main" : "default",
                color: filterType === "all" ? "white" : "inherit",
              }}
            />
          </Box>
        </ToggleButton>

        <ToggleButton value="received" aria-label="received transactions">
          <Box display="flex" alignItems="center" gap={1}>
            <CallReceivedIcon fontSize="small" />
            <span>Received</span>
            <Chip
              label={counts.received}
              size="small"
              sx={{
                height: 20,
                minWidth: 28,
                backgroundColor:
                  filterType === "received" ? "success.main" : "default",
                color: filterType === "received" ? "white" : "inherit",
              }}
            />
          </Box>
        </ToggleButton>

        <ToggleButton value="sent" aria-label="sent transactions">
          <Box display="flex" alignItems="center" gap={1}>
            <CallMadeIcon fontSize="small" />
            <span>Sent</span>
            <Chip
              label={counts.sent}
              size="small"
              sx={{
                height: 20,
                minWidth: 28,
                backgroundColor:
                  filterType === "sent" ? "error.main" : "default",
                color: filterType === "sent" ? "white" : "inherit",
              }}
            />
          </Box>
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
};
