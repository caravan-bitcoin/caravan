import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import QRCode from "qrcode.react";
import { BCUREncoder2 } from "@caravan/wallets";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
} from "@mui/material";
import {
  Close as CloseIcon,
  NavigateBefore,
  NavigateNext,
} from "@mui/icons-material";
import Copyable from "../Copyable";

const QRModal = ({
  open,
  onClose,
  title = "QR Code",
  dataToEncode = "",
  qrCodeSize = 256,
  displayCopyable = true,
}) => {
  const [currentQRIndex, setCurrentQRIndex] = useState(0);
  const [qrParts, setQRParts] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!dataToEncode) return;

    try {
      console.log("Encoding PSBT:", {
        psbtHex: dataToEncode,
        length: dataToEncode.length,
      });

      const encoder = new BCUREncoder2(dataToEncode);
      const frames = encoder.encodePSBT();

      console.log("Generated QR parts:", {
        totalParts: frames.length,
        firstPart: frames[0]?.substring(0, 50) + "...",
      });

      setQRParts(frames);
      setCurrentQRIndex(0);
      setError("");
    } catch (err) {
      console.error("Failed to encode PSBT:", err);
      setError(`Failed to encode PSBT: ${err.message}`);
    }
  }, [dataToEncode]);

  useEffect(() => {
    if (qrParts.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentQRIndex((prev) => (prev + 1) % qrParts.length);
    }, 500);

    return () => clearInterval(interval);
  }, [qrParts.length]);

  const handleNext = () => {
    setCurrentQRIndex((prev) => (prev + 1) % qrParts.length);
  };

  const handlePrev = () => {
    setCurrentQRIndex((prev) => (prev - 1 + qrParts.length) % qrParts.length);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        style: {
          minHeight: "400px",
        },
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          {title}
          <IconButton edge="end" onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {qrParts.length > 0 && !error ? (
          <Box display="flex" flexDirection="column" alignItems="center">
            <Typography variant="subtitle1" gutterBottom>
              QR Code {currentQRIndex + 1} of {qrParts.length}
            </Typography>
            <Box position="relative" display="flex" alignItems="center">
              {qrParts.length > 1 && (
                <IconButton onClick={handlePrev} sx={{ mr: 2 }}>
                  <NavigateBefore />
                </IconButton>
              )}
              <QRCode
                value={qrParts[currentQRIndex]}
                size={qrCodeSize}
                level="M"
                includeMargin
              />
              {qrParts.length > 1 && (
                <IconButton onClick={handleNext} sx={{ ml: 2 }}>
                  <NavigateNext />
                </IconButton>
              )}
            </Box>
            {displayCopyable && (
              <Box mt={2}>
                <Copyable text={dataToEncode} showIcon />
              </Box>
            )}
          </Box>
        ) : error ? (
          <Typography color="error" align="center">
            {error}
          </Typography>
        ) : null}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

QRModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  dataToEncode: PropTypes.string,
  qrCodeSize: PropTypes.number,
  displayCopyable: PropTypes.bool,
};

export default QRModal;
