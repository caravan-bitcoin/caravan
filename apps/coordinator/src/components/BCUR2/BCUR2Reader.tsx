import React, { useState, useRef, useMemo, useEffect } from "react";
import { BCURDecoder2 } from "@caravan/wallets";
import { QrReader } from "react-qr-reader";
import {
  Box,
  Button,
  FormHelperText,
  Paper,
  Typography,
} from "@mui/material";

interface DecodedData {
  type: string;
  xpub: string;
  xfp: string;
  path: string;
}

interface BCUR2ReaderProps {
  onStart?: () => void;
  onSuccess: (data: DecodedData) => void;
  onClear: () => void;
  startText?: string;
  width?: string | number;
}

const BCUR2Reader: React.FC<BCUR2ReaderProps> = ({
  onStart,
  onSuccess,
  onClear,
  startText = "Start QR Scan",
  width = 300,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState("");
  const decoder = useMemo(() => new BCURDecoder2(), []);
  const statusRef = useRef<"idle" | "active" | "complete" | "error">("idle");

  const handleStart = () => {
    onStart?.();
    setError("");
    decoder.reset();
    statusRef.current = "active";
    setIsScanning(true);
  };

  const handleStop = () => {
    decoder.reset();
    onClear();
    setIsScanning(false);
    setError("");
    statusRef.current = "idle";
  };

  const handleQRResult = (result: any, scanError: any) => {
    if (statusRef.current !== "active") return;

    if (scanError) return;

    const text = result?.getText?.();
    if (!text || !text.toLowerCase().startsWith("ur:")) return;

    try {
      console.log("Received QR part:", text);     
      decoder.receivePart(text);

      if (decoder.isComplete()) {
        console.log("QR decoding complete."); 
        const decodedData = decoder.getDecodedData();
        if (!decodedData) throw new Error("Failed to decode data.");
        if (!decodedData.path) throw new Error("BIP32 path is missing in the decoded data");
        
        statusRef.current = "complete";
        setIsScanning(false);
        
        // Ensure the path starts with "m/"
        const data = {
          ...decodedData,
          path: decodedData.path.startsWith('m/') ? decodedData.path : `m/${decodedData.path}`
        };
        
        console.log("Decoded data:", data);
        onSuccess(data as DecodedData);
        
        decoder.reset();
      }
    } catch (e) {
      console.error(e);
      statusRef.current = "error";
      setError(e instanceof Error ? e.message : String(e));
      setIsScanning(false);
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
        <Button
          variant="contained"
          color="primary"
          onClick={handleStart}
          sx={{ mt: 2 }}
        >
          {startText}
        </Button>
      )}

      {error && (
        <FormHelperText error sx={{ mt: 1 }}>
          {error}
        </FormHelperText>
      )}

      {!error && isScanning && (
        <Typography variant="body2" sx={{ mt: 1 }}>
          Scanning... Show all QR parts in sequence.
        </Typography>
      )}
    </Box>
  );
};

export default BCUR2Reader;
