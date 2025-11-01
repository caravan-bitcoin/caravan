import React, { useState } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Grid,
} from "@mui/material";
import { QrCode2 as QrCodeIcon } from "@mui/icons-material";
// @ts-expect-error - qrcode.react doesn't have TypeScript declarations
import QRCode from "qrcode.react";

interface WalletConfigQRExportProps {
  walletConfig: string; // JSON string of wallet configuration
  walletName?: string;
}

/**
 * Component to export wallet configuration as a QR code.
 * Displays a button that opens a modal with the QR code for easy scanning.
 */
const WalletConfigQRExport: React.FC<WalletConfigQRExportProps> = ({
  walletConfig,
  walletName = "wallet",
}) => {
  const [open, setOpen] = useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  // Check if config is too large for a single QR code
  const configSize = new Blob([walletConfig]).size;
  const isTooLarge = configSize > 2000; // QR codes work best under ~2KB

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<QrCodeIcon />}
        onClick={handleOpen}
        disabled={isTooLarge}
        title={
          isTooLarge
            ? "Wallet configuration is too large for QR code export"
            : "Export wallet configuration as QR code"
        }
      >
        Export QR
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
            Wallet Configuration QR Code
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {walletName}
          </Typography>
        </DialogTitle>

        <DialogContent>
          <Grid container spacing={2} direction="column" alignItems="center">
            <Grid item xs={12}>
              <Typography variant="body2" color="textSecondary" paragraph>
                Scan this QR code with another device to import the wallet
                configuration.
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  p: 3,
                  backgroundColor: "white",
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Box
                  sx={{
                    width: "100%",
                    maxWidth: { xs: "280px", sm: "320px" },
                    aspectRatio: "1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <QRCode
                    value={walletConfig}
                    size={320}
                    style={{
                      width: "100%",
                      height: "auto",
                      maxWidth: "100%",
                    }}
                    level="M"
                    includeMargin={true}
                  />
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Typography
                variant="caption"
                color="textSecondary"
                align="center"
                sx={{ maxWidth: "400px" }}
              >
                This QR code contains your wallet configuration including all
                extended public keys. Keep it secure.
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="caption" color="textSecondary">
                Configuration size: {(configSize / 1024).toFixed(2)} KB
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default WalletConfigQRExport;
