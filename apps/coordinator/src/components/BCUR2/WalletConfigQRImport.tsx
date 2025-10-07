import React, { useState } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Alert,
} from "@mui/material";
import { QrCodeScanner as QrCodeScannerIcon } from "@mui/icons-material";
import { QrReader } from "react-qr-reader";

interface WalletConfigQRImportProps {
  onImport: (configJson: string) => void;
}

/**
 * Component to import wallet configuration by scanning a QR code.
 * Opens a modal with camera access to scan QR codes.
 */
const WalletConfigQRImport: React.FC<WalletConfigQRImportProps> = ({
  onImport,
}) => {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>("");
  const [scanning, setScanning] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<
    "prompt" | "granted" | "denied"
  >("prompt");

  const handleOpen = async () => {
    setOpen(true);
    setError("");
    setScanning(true);

    // Check camera permissions
    try {
      const permissionStatus = await navigator.permissions.query({
        name: "camera" as PermissionName,
      });
      setCameraPermission(permissionStatus.state as any);

      permissionStatus.onchange = () => {
        setCameraPermission(permissionStatus.state as any);
      };
    } catch (err) {
      // Permissions API might not be supported, proceed anyway
      console.warn("Could not check camera permissions:", err);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setScanning(false);
    setError("");
  };

  const handleScan = (result: any, error: any) => {
    if (result) {
      try {
        const text = result?.text;
        if (!text) return;

        // Validate that it's valid JSON
        JSON.parse(text);

        // Pass the config to the parent component
        onImport(text);

        // Close the modal
        handleClose();
      } catch (err) {
        setError("Invalid wallet configuration QR code");
        console.error("QR scan error:", err);
      }
    }

    if (error) {
      // Don't set error for every frame, only for actual errors
      if (error.name !== "NotFoundError" && error.name !== "NotAllowedError") {
        console.warn("QR reader warning:", error);
      }
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<QrCodeScannerIcon />}
        onClick={handleOpen}
      >
        Import via QR
      </Button>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle>
          <Typography variant="h6" component="div">
            Scan Wallet Configuration QR Code
          </Typography>
        </DialogTitle>

        <DialogContent>
          <Box>
            <Typography variant="body2" color="textSecondary" paragraph>
              Position the QR code within the camera frame to import the wallet
              configuration.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {cameraPermission === "denied" && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Camera access is required to scan QR codes. Please enable camera
                permissions in your browser settings and try again.
              </Alert>
            )}

            <Box
              sx={{
                width: "100%",
                maxWidth: "100%",
                aspectRatio: "1",
                backgroundColor: "black",
                borderRadius: 2,
                overflow: "hidden",
                position: "relative",
              }}
            >
              {scanning && cameraPermission !== "denied" && (
                <QrReader
                  constraints={{
                    facingMode: "environment",
                  }}
                  onResult={handleScan}
                  containerStyle={{
                    width: "100%",
                    height: "100%",
                  }}
                  videoStyle={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              )}
            </Box>

            <Typography
              variant="caption"
              color="textSecondary"
              align="center"
              display="block"
              sx={{ mt: 2 }}
            >
              Make sure your camera has a clear view of the QR code
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default WalletConfigQRImport;
