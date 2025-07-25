import React from "react";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import {
  Alert,
  AlertTitle,
  Box,
  Collapse,
  IconButton,
  Typography,
} from "@mui/material";

export const ErrorDialog = ({
  error,
  showErrorDetails,
  setShowErrorDetails,
}: {
  error: string;
  showErrorDetails: boolean;
  setShowErrorDetails: (show: boolean) => void;
}) => {
  return (
    <Alert
      severity="error"
      sx={{ mb: 3 }}
      action={
        <IconButton
          aria-label="toggle error details"
          size="small"
          onClick={() => setShowErrorDetails(!showErrorDetails)}
        >
          {showErrorDetails ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      }
    >
      <AlertTitle>Error Processing Transaction</AlertTitle>
      {error}

      <Collapse in={showErrorDetails}>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            If this error persists, please:
          </Typography>
          <ul style={{ margin: "8px 0", paddingLeft: "20px" }}>
            <li>
              <Typography variant="body2" color="text.secondary">
                Check your internet connection and try again
              </Typography>
            </li>
            <li>
              <Typography variant="body2" color="text.secondary">
                Ensure the transaction is still unconfirmed
              </Typography>
            </li>
            <li>
              <Typography variant="body2" color="text.secondary">
                Verify you have sufficient UTXOs for fee bumping
              </Typography>
            </li>
            <li>
              <Typography variant="body2" color="text.secondary">
                Contact support if the issue continues
              </Typography>
            </li>
          </ul>
        </Box>
      </Collapse>
    </Alert>
  );
};
