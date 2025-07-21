import React, { useState, useRef, useMemo } from "react";
import { BCURDecoder2, ExtendedPublicKeyData } from "@caravan/wallets";
import { QrReader } from "react-qr-reader";
import { Box, Button, FormHelperText, Paper, Typography } from "@mui/material";
import { BitcoinNetwork, Network } from "@caravan/bitcoin";

type ScanMode = "xpub" | "psbt";

interface BCUR2ReaderProps {
  onStart?: () => void;
  onSuccess: (data: ExtendedPublicKeyData) => void;
  onPSBTSuccess?: (psbt: string) => void;
  onClear: () => void;
  startText?: string;
  width?: string | number;
  network?: BitcoinNetwork;
  mode?: ScanMode;
  autoStart?: boolean;
}

const BCUR2Reader: React.FC<BCUR2ReaderProps> = ({
  onStart,
  onSuccess,
  onPSBTSuccess,
  onClear,
  startText = "Start QR Scan",
  width = 300,
  network = Network.MAINNET,
  mode = "xpub",
  autoStart = false,
}) => {
  const [isScanning, setIsScanning] = useState(autoStart);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const decoder = useMemo(() => new BCURDecoder2(), []);
  const statusRef = useRef<"idle" | "active" | "complete" | "error">(
    autoStart ? "active" : "idle",
  );

  const handleStart = () => {
    onStart?.();
    setError("");
    setProgress("");
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

      if (decoder.isComplete()) {
        if (mode === "psbt") {
          // Handle PSBT scanning
          const psbtData = decoder.getDecodedPSBT();

          if (!psbtData) {
            throw new Error("Failed to decode PSBT data.");
          }

          statusRef.current = "complete";
          setIsScanning(false);
          setProgress("");

          if (onPSBTSuccess) {
            onPSBTSuccess(psbtData);
          }

          decoder.reset();
        } else {
          // Handle extended public key scanning (original functionality)
          const extendedPublicKeyData = decoder.getDecodedData(network);

          if (!extendedPublicKeyData)
            throw new Error("Failed to decode extended public key data.");
          if (!extendedPublicKeyData.bip32Path)
            throw new Error(
              "BIP32 path is missing in the extended public key data",
            );

          statusRef.current = "complete";
          setIsScanning(false);
          setProgress("");

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
      }
    } catch (e) {
      statusRef.current = "error";
      setError(e instanceof Error ? e.message : String(e));
      setIsScanning(false);
      setProgress("");
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
        <Typography variant="body2" sx={{ mt: 1 }}>
          {mode === "psbt"
            ? "Scanning PSBT QR code... Show all QR parts in sequence."
            : "Scanning... Show all QR parts in sequence."}
          {progress && ` Progress: ${progress}`}
        </Typography>
      )}
    </Box>
  );
};

export default BCUR2Reader;
