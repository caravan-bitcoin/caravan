import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Grid,
  LinearProgress,
} from "@mui/material";
// @ts-expect-error - qrcode.react doesn't have TypeScript declarations
import QRCode from "qrcode.react";

interface BCUR2EncoderProps {
  qrCodeFrames?: string[];
  title?: string;
  open?: boolean;
  onClose: () => void;
  autoPlay?: boolean;
  initialInterval?: number;
  qrSize?: number;
}

/**
 * Component for displaying animated BCUR2 QR codes for transaction signing.
 * Shows a sequence of QR codes that can be scanned by airgapped signing devices.
 */
const BCUR2Encoder: React.FC<BCUR2EncoderProps> = ({
  qrCodeFrames = [],
  title = "Scan QR Codes for Signing",
  open = false,
  onClose,
  autoPlay = true,
  initialInterval = 1000,
  qrSize = 256,
}) => {
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(autoPlay);
  const [animationInterval, setAnimationInterval] =
    useState<number>(initialInterval);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize interval from prop
  useEffect(() => {
    setAnimationInterval(initialInterval);
  }, [initialInterval]);

  // Auto-advance frames when playing
  useEffect(() => {
    if (isPlaying && qrCodeFrames.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentFrameIndex((prev) => {
          const next = (prev + 1) % qrCodeFrames.length;
          return next;
        });
      }, animationInterval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, animationInterval, qrCodeFrames.length]);

  // Reset frame index and restart autoplay when frames change
  useEffect(() => {
    setCurrentFrameIndex(0);
    // Restart autoplay if it was enabled and we have multiple frames
    if (autoPlay && qrCodeFrames.length > 1) {
      setIsPlaying(true);
    } else if (qrCodeFrames.length <= 1) {
      // Stop playing if we only have one frame or no frames
      setIsPlaying(false);
    }
  }, [qrCodeFrames, autoPlay]);

  // Start animation when dialog opens with multiple frames
  useEffect(() => {
    if (open && autoPlay && qrCodeFrames.length > 1) {
      setIsPlaying(true);
    }
  }, [open, autoPlay, qrCodeFrames.length]);

  const handlePlay = (): void => {
    setIsPlaying(true);
  };

  const handlePause = (): void => {
    setIsPlaying(false);
  };

  const handlePrevious = (): void => {
    setCurrentFrameIndex((prev) =>
      prev === 0 ? qrCodeFrames.length - 1 : prev - 1,
    );
  };

  const handleNext = (): void => {
    setCurrentFrameIndex((prev) => (prev + 1) % qrCodeFrames.length);
  };

  const currentFrame: string = qrCodeFrames[currentFrameIndex] || "";
  const frameCount: number = qrCodeFrames.length;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: "600px" },
      }}
    >
      <DialogTitle>
        <Typography variant="h6" component="div">
          {title}
        </Typography>
        {frameCount > 1 && (
          <Typography variant="body2" color="textSecondary">
            Transaction encoded into {frameCount} QR code frames
          </Typography>
        )}
      </DialogTitle>

      <DialogContent>
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          sx={{ gap: 3 }}
        >
          {/* QR Code Display */}
          <Paper
            elevation={3}
            sx={{
              p: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: qrSize + 32,
              minHeight: qrSize + 32,
            }}
          >
            {currentFrame ? (
              <QRCode
                value={currentFrame}
                size={qrSize}
                level="M"
                includeMargin={true}
              />
            ) : (
              <Typography variant="body1" color="textSecondary">
                No QR code data available
              </Typography>
            )}
          </Paper>

          {/* Progress Bar */}
          {frameCount > 1 && (
            <Box width="100%" maxWidth={400} textAlign="center">
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Frame {currentFrameIndex + 1} of {frameCount}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={((currentFrameIndex + 1) / frameCount) * 100}
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
                {Math.round(((currentFrameIndex + 1) / frameCount) * 100)}%
                complete
              </Typography>
            </Box>
          )}

          {/* Controls for multi-frame QR codes */}
          {frameCount > 1 && (
            <Box width="100%" maxWidth={400}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12}>
                  <Box display="flex" justifyContent="center" gap={1}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handlePrevious}
                    >
                      Previous
                    </Button>
                    {isPlaying ? (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handlePause}
                      >
                        Pause
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handlePlay}
                      >
                        Play
                      </Button>
                    )}
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleNext}
                    >
                      Next
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Instructions */}
          <Box textAlign="center" maxWidth={400}>
            <Typography variant="body1" gutterBottom>
              Scan these QR codes with your signing device to sign the
              transaction.
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BCUR2Encoder;
