import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  FormHelperText,
  Slider,
  FormControl,
  FormLabel,
  Switch,
  FormControlLabel,
} from "@mui/material";
import { QrCode } from "@mui/icons-material";
import BCUR2Display from "./BCUR2Display";

interface BCUR2PSBTExporterProps {
  psbtBase64?: string;
  onPSBTChange?: (psbt: string) => void;
  width?: string | number;
  title?: string;
  description?: string;
}

const BCUR2PSBTExporter: React.FC<BCUR2PSBTExporterProps> = ({
  psbtBase64 = "",
  onPSBTChange,
  width = 400,
  title = "Export PSBT as QR Codes",
  description = "Convert your PSBT to animated QR codes for hardware wallet signing",
}) => {
  const [psbt, setPsbt] = useState(psbtBase64);
  const [showQR, setShowQR] = useState(false);
  const [maxFragmentLength, setMaxFragmentLength] = useState(100);
  const [autoPlay, setAutoPlay] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState(1000);
  const [error, setError] = useState("");

  const handlePSBTChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newPsbt = event.target.value;
    setPsbt(newPsbt);
    onPSBTChange?.(newPsbt);
    setError("");
    setShowQR(false);
  };

  const handleGenerateQR = () => {
    if (!psbt.trim()) {
      setError("Please enter a PSBT");
      return;
    }

    try {
      // Basic validation - check if it looks like base64
      if (!/^[A-Za-z0-9+/]+=*$/.test(psbt.trim())) {
        throw new Error("PSBT must be in base64 format");
      }
      
      setError("");
      setShowQR(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    }
  };

  const handleQRError = (errorMessage: string) => {
    setError(errorMessage);
    setShowQR(false);
  };

  const handleFragmentLengthChange = (
    _event: Event,
    newValue: number | number[]
  ) => {
    setMaxFragmentLength(newValue as number);
    if (showQR) {
      // Re-generate QR with new fragment length
      setShowQR(false);
      setTimeout(() => setShowQR(true), 100);
    }
  };

  const handleSpeedChange = (_event: Event, newValue: number | number[]) => {
    setAnimationSpeed(newValue as number);
  };

  const handleAutoPlayChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAutoPlay(event.target.checked);
  };

  return (
    <Box sx={{ maxWidth: width, mx: "auto", p: 2 }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      
      {description && (
        <Typography variant="body2" color="textSecondary" gutterBottom>
          {description}
        </Typography>
      )}

      {/* PSBT Input */}
      <TextField
        fullWidth
        multiline
        rows={4}
        label="PSBT (Base64)"
        value={psbt}
        onChange={handlePSBTChange}
        placeholder="Paste your base64-encoded PSBT here..."
        variant="outlined"
        sx={{ mb: 2 }}
        error={!!error}
      />

      {error && (
        <FormHelperText error sx={{ mb: 2 }}>
          {error}
        </FormHelperText>
      )}

      {/* Settings */}
      {!showQR && (
        <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            QR Code Settings
          </Typography>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <FormLabel>Fragment Size: {maxFragmentLength} characters</FormLabel>
            <Slider
              value={maxFragmentLength}
              onChange={handleFragmentLengthChange}
              min={50}
              max={300}
              step={10}
              marks={[
                { value: 50, label: "50" },
                { value: 100, label: "100" },
                { value: 200, label: "200" },
                { value: 300, label: "300" },
              ]}
              valueLabelDisplay="auto"
            />
            <FormHelperText>
              Smaller fragments = more QR codes but better scanning reliability
            </FormHelperText>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <FormLabel>Animation Speed: {animationSpeed}ms</FormLabel>
            <Slider
              value={animationSpeed}
              onChange={handleSpeedChange}
              min={500}
              max={3000}
              step={100}
              marks={[
                { value: 500, label: "Fast" },
                { value: 1000, label: "Normal" },
                { value: 2000, label: "Slow" },
                { value: 3000, label: "Very Slow" },
              ]}
              valueLabelDisplay="auto"
            />
          </FormControl>

          <FormControlLabel
            control={
              <Switch checked={autoPlay} onChange={handleAutoPlayChange} />
            }
            label="Auto-play animation"
          />
        </Paper>
      )}

      {/* Generate Button */}
      {!showQR && (
        <Button
          fullWidth
          variant="contained"
          onClick={handleGenerateQR}
          disabled={!psbt.trim()}
          startIcon={<QrCode />}
          sx={{ mb: 2 }}
        >
          Generate QR Codes
        </Button>
      )}

      {/* QR Code Display */}
      {showQR && (
        <Box>
          <BCUR2Display
            data={psbt.trim()}
            maxFragmentLength={maxFragmentLength}
            autoPlay={autoPlay}
            animationSpeed={animationSpeed}
            width={350}
            onError={handleQRError}
          />
          
          <Button
            fullWidth
            variant="outlined"
            onClick={() => setShowQR(false)}
            sx={{ mt: 2 }}
          >
            Back to Settings
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default BCUR2PSBTExporter;
