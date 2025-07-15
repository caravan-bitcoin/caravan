/* eslint-disable react/prop-types */
import React from "react";
import { Typography, Button, Paper, Alert, AlertTitle } from "@mui/material";
import { Download } from "@mui/icons-material";

export interface DownloadSectionProps {
  onDownload: () => void;
  downloadClicked: boolean;
  disabled?: boolean;
}

export const DownloadSection: React.FC<DownloadSectionProps> = React.memo(
  ({ onDownload, downloadClicked, disabled = false }) => (
    <Paper
      sx={{
        p: 3,
        mt: 3,
        textAlign: "center",
        bgcolor: "primary.50",
        border: "1px solid",
        borderColor: "primary.200",
      }}
    >
      <Typography variant="h6" gutterBottom>
        Download Transaction
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Download the PSBT file to sign with your hardware wallet
      </Typography>

      <Button
        variant="contained"
        size="large"
        onClick={onDownload}
        startIcon={<Download />}
        disabled={disabled}
        sx={{
          minWidth: 200,
          py: 1.5,
          fontSize: "1rem",
        }}
      >
        Download PSBT
      </Button>

      {downloadClicked && (
        <Alert severity="success" sx={{ mt: 2, maxWidth: 400, mx: "auto" }}>
          <AlertTitle>PSBT Downloaded Successfully</AlertTitle>
          <Typography variant="body2">
            You can now sign the transaction using your hardware wallet or
            upload it to the Sign tab.
          </Typography>
        </Alert>
      )}
    </Paper>
  ),
);

DownloadSection.displayName = "DownloadSection";
