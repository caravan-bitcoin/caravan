import React, { useState, useEffect, useCallback } from "react";
import { BCUREncoder2 } from "@caravan/wallets";
import {
  Box,
  Button,
  Paper,
  Typography,
  IconButton,
  LinearProgress,
  FormHelperText,
} from "@mui/material";
import {
  PlayArrow,
  Pause,
  SkipNext,
  SkipPrevious,
  Stop,
} from "@mui/icons-material";
// @ts-ignore - qrcode.react v1.0.0 doesn't have proper types
import QRCode from "qrcode.react";

interface BCUR2DisplayProps {
  data: string;
  maxFragmentLength?: number;
  autoPlay?: boolean;
  animationSpeed?: number; // milliseconds
  width?: string | number;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

const BCUR2Display: React.FC<BCUR2DisplayProps> = ({
  data,
  maxFragmentLength = 100,
  autoPlay = true,
  animationSpeed = 1000,
  width = 300,
  onComplete,
  onError,
}) => {
  const [encoder] = useState(() => new BCUREncoder2(data, maxFragmentLength));
  const [fragments, setFragments] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [error, setError] = useState("");
  const [isEncoded, setIsEncoded] = useState(false);

  // Encode the data
  useEffect(() => {
    try {
      const encoded = encoder.encodePSBT();
      setFragments(encoded);
      setIsEncoded(true);
      setError("");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      onError?.(errorMessage);
    }
  }, [data, maxFragmentLength, encoder, onError]);

  // Auto-play animation
  useEffect(() => {
    if (!isPlaying || fragments.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % fragments.length;
        if (nextIndex === 0) {
          onComplete?.();
        }
        return nextIndex;
      });
    }, animationSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, fragments.length, animationSpeed, onComplete]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleNext = useCallback(() => {
    if (fragments.length > 0) {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % fragments.length);
    }
  }, [fragments.length]);

  const handlePrevious = useCallback(() => {
    if (fragments.length > 0) {
      setCurrentIndex((prevIndex) =>
        prevIndex === 0 ? fragments.length - 1 : prevIndex - 1
      );
    }
  }, [fragments.length]);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex(0);
  }, []);

  if (error) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center">
        <FormHelperText error sx={{ mt: 1 }}>
          Error: {error}
        </FormHelperText>
      </Box>
    );
  }

  if (!isEncoded || fragments.length === 0) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center">
        <Typography variant="body2" sx={{ mt: 1 }}>
          Encoding...
        </Typography>
        <LinearProgress sx={{ width: "100%", mt: 1 }} />
      </Box>
    );
  }

  const currentFragment = fragments[currentIndex];
  const progress = fragments.length > 1 ? ((currentIndex + 1) / fragments.length) * 100 : 100;

  return (
    <Box display="flex" flexDirection="column" alignItems="center">
      {/* QR Code Display */}
      <Paper elevation={3} sx={{ p: 2, width, aspectRatio: "1" }}>
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          height="100%"
        >
          {currentFragment && (
            <QRCode
              value={currentFragment}
              size={Math.min(width as number, 280)}
              level="M"
            />
          )}
        </Box>
      </Paper>

      {/* Fragment Info */}
      <Typography variant="body2" sx={{ mt: 1 }}>
        {fragments.length > 1
          ? `QR ${currentIndex + 1} of ${fragments.length}`
          : "Single QR Code"}
      </Typography>

      {/* Progress Bar for Multi-part QRs */}
      {fragments.length > 1 && (
        <Box sx={{ width: "100%", mt: 1 }}>
          <LinearProgress variant="determinate" value={progress} />
        </Box>
      )}

      {/* Controls for Multi-part QRs */}
      {fragments.length > 1 && (
        <Box display="flex" alignItems="center" sx={{ mt: 1 }}>
          <IconButton onClick={handlePrevious} size="small">
            <SkipPrevious />
          </IconButton>
          
          <IconButton onClick={handlePlayPause} size="small">
            {isPlaying ? <Pause /> : <PlayArrow />}
          </IconButton>
          
          <IconButton onClick={handleNext} size="small">
            <SkipNext />
          </IconButton>
          
          <IconButton onClick={handleStop} size="small">
            <Stop />
          </IconButton>
        </Box>
      )}

      {/* Animation Status */}
      {fragments.length > 1 && (
        <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
          {isPlaying ? "Auto-cycling" : "Paused"} • {animationSpeed}ms per frame
        </Typography>
      )}
    </Box>
  );
};

export default BCUR2Display;
