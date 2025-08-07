import React from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  AlertTitle,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio,
  Divider,
} from "@mui/material";
import { Download } from "@mui/icons-material";

export interface DownloadSectionProps {
  onDownload: (version: "v0" | "v2") => void;
  downloadClicked: boolean;
  disabled?: boolean;
}

export const DownloadSection: React.FC<DownloadSectionProps> = ({
  onDownload,
  downloadClicked,
  disabled = false,
}) => {
  const [selectedVersion, setSelectedVersion] = React.useState<"v0" | "v2">(
    "v2",
  );

  const handleDownload = () => {
    onDownload(selectedVersion);
  };

  const handleVersionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedVersion(event.target.value as "v0" | "v2");
  };

  return (
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

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Choose the PSBT format and download the file to sign with your hardware
        wallet
      </Typography>

      {/* Version Selector */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
          PSBT Version
        </Typography>

        <FormControl component="fieldset">
          <RadioGroup
            row
            value={selectedVersion}
            onChange={handleVersionChange}
            sx={{ justifyContent: "center" }}
          >
            <FormControlLabel
              value="v2"
              control={<Radio />}
              label={
                <Box textAlign="left">
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    v2 (Recommended)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Latest format, better hardware wallet support
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value="v0"
              control={<Radio />}
              label={
                <Box textAlign="left">
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    v0 (Legacy)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Older format for compatibility
                  </Typography>
                </Box>
              }
            />
          </RadioGroup>
        </FormControl>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Button
        variant="contained"
        size="large"
        onClick={handleDownload}
        startIcon={<Download />}
        disabled={disabled}
        sx={{
          minWidth: 250,
          py: 1.5,
          fontSize: "1rem",
        }}
      >
        Download PSBT {selectedVersion.toUpperCase()}
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
  );
};
