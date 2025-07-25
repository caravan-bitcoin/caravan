import React, { useState, useRef, useMemo } from "react";
import { BCURDecoder2, ExtendedPublicKeyData } from "@caravan/wallets";
import { QrReader } from "react-qr-reader";
import {
  Box,
  Button,
  FormHelperText,
  Paper,
  Typography,
  LinearProgress,
} from "@mui/material";
import { BitcoinNetwork, Network } from "@caravan/bitcoin";

interface BCUR2XPubReaderProps {
  onStart?: () => void;
  onSuccess: (data: ExtendedPublicKeyData) => void;
  onClear: () => void;
  startText?: string;
  width?: string | number;
  network?: BitcoinNetwork;
  autoStart?: boolean;
}

const BCUR2XPubReader: React.FC<BCUR2XPubReaderProps> = ({
  onStart,
  onSuccess,
  onClear,
  startText = "Start XPub QR Scan",
  width = 300,
  network = Network.MAINNET,
  autoStart = false,
}) => {
  const [isScanning, setIsScanning] = useState(autoStart);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [progressValue, setProgressValue] = useState(0);
  const decoder = useMemo(() => new BCURDecoder2(), []);
  const statusRef = useRef<"idle" | "active" | "complete" | "error">(
    autoStart ? "active" : "idle",
  );

  const handleStart = () => {
    onStart?.();
    setError("");
    setProgress("");
    setProgressValue(0);
    decoder.reset();
    statusRef.current = "active";
    setIsScanning(true);
  };

  const handleStop = () => {
    decoder.reset();
    onClear();
    setIsScanning(false);
    setError("");
    setProgress("");
    setProgressValue(0);
    statusRef.current = "idle";
  };

  const handleQRResult = (result: any, scanError: any) => {
    if (statusRef.current !== "active") return;

    if (scanError) {
      return;
    }

    const text = result?.getText?.();

    if (!text || !text.toLowerCase().startsWith("ur:")) {
      return;
    }

    try {
      decoder.receivePart(text);

      // Update progress
      const currentProgress = decoder.getProgress();
      setProgress(currentProgress);

      // Parse progress to get numeric value for progress bar
      // Progress format is typically "X of Y" or "X/Y" or percentage
      const progressMatch = currentProgress.match(/(\d+)\s*(?:of|\/)\s*(\d+)/);
      if (progressMatch) {
        const [, current, total] = progressMatch;
        const progressPercent = (parseInt(current) / parseInt(total)) * 100;
        setProgressValue(progressPercent);
      } else {
        // Try to parse as percentage
        const percentMatch = currentProgress.match(/(\d+)%/);
        if (percentMatch) {
          setProgressValue(parseInt(percentMatch[1]));
        }
      }

      if (decoder.isComplete()) {
        const extendedPublicKeyData = decoder.getDecodedData(network);

        if (!extendedPublicKeyData) {
          throw new Error("Failed to decode extended public key data.");
        }
        if (!extendedPublicKeyData.bip32Path) {
          throw new Error(
            "BIP32 path is missing in the extended public key data",
          );
        }

        statusRef.current = "complete";
        setIsScanning(false);
        setProgress("");
        setProgressValue(0);

        // Ensure the bip32Path starts with "m/"
        const data = {
          ...extendedPublicKeyData,
          bip32Path: extendedPublicKeyData.bip32Path.startsWith("m/")
            ? extendedPublicKeyData.bip32Path
            : `m/${extendedPublicKeyData.bip32Path}`,
        };

        onSuccess(data);
        decoder.reset();
      }
    } catch (e) {
      statusRef.current = "error";
      setError(e instanceof Error ? e.message : String(e));
      setIsScanning(false);
      setProgress("");
      setProgressValue(0);
      decoder.reset();
    }
  };

  return (
    <Box display="flex" flexDirection="column" alignItems="center">
      {isScanning ? (
        <>
          <Paper elevation={3} sx={{ width, aspectRatio: "1" }}>
            <QrReader
              onResult={handleQRResult}
              constraints={{ facingMode: "environment" }}
              containerStyle={{ width: "100%", height: "100%" }}
              scanDelay={200}
            />
          </Paper>
          <Button
            variant="outlined"
            color="secondary"
            onClick={handleStop}
            sx={{ mt: 2 }}
          >
            Cancel
          </Button>
        </>
      ) : (
        <>
          {!autoStart && (
            <Button
              variant="contained"
              color="primary"
              onClick={handleStart}
              sx={{ mt: 2 }}
            >
              {startText}
            </Button>
          )}
        </>
      )}

      {error && (
        <FormHelperText error sx={{ mt: 1 }}>
          {error}
        </FormHelperText>
      )}

      {!error && isScanning && (
        <Box width="100%" maxWidth={300} textAlign="center" sx={{ mt: 2 }}>
          <Typography variant="body2" gutterBottom>
            Scanning extended public key QR code... Show all QR parts in
            sequence.
          </Typography>
          {progress && (
            <>
              <LinearProgress
                variant="determinate"
                value={progressValue}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: "rgba(76, 175, 80, 0.2)",
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: "#4caf50",
                    borderRadius: 4,
                  },
                }}
              />
              <Typography
                variant="caption"
                color="textSecondary"
                sx={{ mt: 1, display: "block" }}
              >
                {progress} complete
              </Typography>
            </>
          )}
        </Box>
      )}
    </Box>
  );
};

export default BCUR2XPubReader;
