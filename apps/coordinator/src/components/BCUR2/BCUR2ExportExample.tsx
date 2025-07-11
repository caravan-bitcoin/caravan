import React, { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Alert,
} from "@mui/material";
import { QrCode } from "@mui/icons-material";
import { BCUR2Display } from "./index";

interface BCUR2ExportDialogProps {
  open: boolean;
  onClose: () => void;
  psbtBase64: string;
  title?: string;
}

/**
 * A reusable dialog component for exporting PSBTs as BCUR2 QR codes
 * This can be easily integrated into wallet workflows
 */
const BCUR2ExportDialog: React.FC<BCUR2ExportDialogProps> = ({
  open,
  onClose,
  psbtBase64,
  title = "Export Transaction",
}) => {
  const [error, setError] = useState("");

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleClose = () => {
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <QrCode />
          {title}
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="body2" color="textSecondary" paragraph>
          Scan these QR codes with your hardware wallet to sign the transaction.
          The codes will cycle automatically, or use the controls to navigate manually.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box display="flex" justifyContent="center">
          <BCUR2Display
            data={psbtBase64}
            maxFragmentLength={100}
            autoPlay={true}
            animationSpeed={1500}
            width={320}
            onError={handleError}
          />
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

/**
 * Example usage component showing how to integrate BCUR2 encoding
 * into a wallet application workflow
 */
const BCUR2ExportExample: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Example PSBT - in a real app, this would come from your transaction building logic
  const examplePSBT = "cHNidP8BAHsCAAAAAljoeiG1ba8MI76OcHBFbDNvfLqlyHV5JPVFiHuyq911AAAAAAD/////g40EJ9DsZQpoqka7CwmK6kQiwHGyyng1Kgd5WdB86h0BAAAAAP////8CcKrwCAAAAAAWABTYXCtx0AYLCcmIauuBXlCZHdoSTQDh9QUAAAAAFgAUAK6pouXw+HaliN9VRuh0LR2HAI8AAAAAAAABAP1pAQIAAAABAbMN9k5PaVBvfEFrI1/5/FfRJLh5pvfqpN/8tF5x4GgAAAAAAAAAAAAA/////wM8GgGJAAAAAAGpY3ELs5+bIQJYAhEUhI0iAAAIVWEhAk9R0CCoAA7gvgAA5o8OUGSyiJv7tRg3mHOwjqgfhzuH3CfzCABkVwNqFAZGQAA0AFdIYUOKhFoaKaIHewLY+hH7gGkZJr1NG5FJZJc8F2hIlv8AAADq0tAAVUHy7Wk5IqJmOJKsAAAQS6LGU51vqYIIQlwBAAAACwABDwABEAICAD/////LAQEJAQNvPKESTwAAAAj6/////wERCQEEWqkJjAAAAtX/////AREJAQIoAAACAAAAAP//";

  const handleExportClick = () => {
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Wallet Integration Example
      </Typography>
      
      <Typography variant="body2" color="textSecondary" paragraph>
        This example shows how to integrate BCUR2 QR code export into your wallet application.
        Click the button below to see how it would work in a real transaction workflow.
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          <strong>Integration Steps:</strong>
          <br />
          1. Build your PSBT using your wallet logic
          <br />
          2. Call the BCUR2ExportDialog component with the PSBT data
          <br />
          3. User scans the animated QR codes with their hardware wallet
          <br />
          4. Hardware wallet returns the signed transaction
        </Typography>
      </Alert>

      <Button
        variant="contained"
        onClick={handleExportClick}
        startIcon={<QrCode />}
        size="large"
      >
        Export Transaction for Hardware Wallet
      </Button>

      <BCUR2ExportDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        psbtBase64={examplePSBT}
        title="Sign with Hardware Wallet"
      />
    </Box>
  );
};

export { BCUR2ExportDialog, BCUR2ExportExample };
