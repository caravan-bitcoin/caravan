import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  LinearProgress,
  Slider,
  FormControl,
  FormLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
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

  const handleSpeedChange = useCallback(
    (event: Event, newValue: number | number[]) => {
      const speed = Array.isArray(newValue) ? newValue[0] : newValue;
      setAnimationInterval(speed);
    },
    [],
  );

  const getSpeedLabel = (interval: number): string => {
    if (interval <= 300) return "Very Fast";
    if (interval <= 600) return "Fast";
    if (interval <= 1000) return "Normal";
    if (interval <= 1500) return "Slow";
    return "Very Slow";
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
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            minWidth={qrSize}
            minHeight={qrSize}
          >
            {currentFrame ? (
              <QRCode
                value={currentFrame}
                size={qrSize}
                level="M"
                includeMargin={false}
              />
            ) : (
              <Typography variant="body1" color="textSecondary">
                No QR code data available
              </Typography>
            )}
          </Box>

          {/* Progress Bar and Controls in Accordion */}
          {frameCount > 1 && (
            <Box width="100%" maxWidth={400}>
              <Accordion>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls="qr-controls-content"
                  id="qr-controls-header"
                >
                  <Typography variant="subtitle1">
                    QR Display Controls
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    sx={{ gap: 3 }}
                  >
                    {/* Progress Bar */}
                    <Box width="100%" textAlign="center">
                      <Typography
                        variant="body2"
                        color="textSecondary"
                        gutterBottom
                      >
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
                        {Math.round(
                          ((currentFrameIndex + 1) / frameCount) * 100,
                        )}
                        % complete
                      </Typography>
                    </Box>

                    {/* Speed Control */}
                    <Box width="100%" sx={{ px: 2 }}>
                      <FormControl fullWidth>
                        <FormLabel component="legend" sx={{ mb: 1 }}>
                          <Typography
                            variant="body2"
                            color="textPrimary"
                            fontWeight="medium"
                          >
                            Animation Speed: {getSpeedLabel(animationInterval)}{" "}
                            ({animationInterval}ms)
                          </Typography>
                        </FormLabel>
                        <Slider
                          value={animationInterval}
                          onChange={handleSpeedChange}
                          min={200}
                          max={3000}
                          step={100}
                          marks={[
                            { value: 200, label: "Fastest" },
                            { value: 800, label: "Normal" },
                            { value: 1500, label: "Slow" },
                            { value: 3000, label: "Slowest" },
                          ]}
                          sx={{
                            "& .MuiSlider-markLabel": {
                              fontSize: "0.75rem",
                            },
                            "& .MuiSlider-thumb": {
                              width: 20,
                              height: 20,
                            },
                            "& .MuiSlider-track": {
                              height: 4,
                            },
                            "& .MuiSlider-rail": {
                              height: 4,
                            },
                          }}
                        />
                      </FormControl>
                    </Box>

                    {/* Navigation Controls */}
                    <Box width="100%">
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
                  </Box>
                </AccordionDetails>
              </Accordion>
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
