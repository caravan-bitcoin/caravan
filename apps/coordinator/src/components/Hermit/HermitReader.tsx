import React, { useMemo, useState } from "react";
import {
  PENDING,
  ACTIVE,
  BCURDecoder,
  HermitSignMultisigTransaction,
  Message,
} from "@caravan/wallets";
import type { OnResultFunction } from "react-qr-reader";
import { QrReader } from "react-qr-reader";
import {
  Grid,
  Button,
  Box,
  FormHelperText,
  LinearProgress,
} from "@mui/material";
import Copyable from "../Copyable";

const QR_CODE_READER_DELAY = 300; // ms?

interface PendingHermitReaderProps {
  interaction: HermitSignMultisigTransaction;
  startText: string;
  handleStart: () => void;
}

type CommandMessage = Message & {
  instructions: string[];
  command: string;
  mode: unknown;
};

// based on OnResultFunction
type HandleScanFn = (
  result: { text: string } | null | undefined,
  error: { stack: string } | null | undefined,
) => void;

const PendingHermitReader = ({
  interaction,
  startText,
  handleStart,
}: PendingHermitReaderProps) => {
  const commandMessage: CommandMessage | null = interaction.messageFor({
    state: status,
    code: "hermit.command",
  }) as CommandMessage | null;

  if (!commandMessage) return null;

  return (
    <div>
      <p>{commandMessage.instructions}</p>
      <Grid container justifyContent="center" className="mb-2">
        <Copyable text={commandMessage.command} showText={false}>
          <code>
            <strong>{commandMessage.mode}&gt;</strong> {commandMessage.command}
          </code>
        </Copyable>
      </Grid>
      <p>When you are ready, scan the QR codes produced by Hermit.</p>
      <Box mt={2}>
        <Button
          variant="contained"
          color="primary"
          className="mt-2"
          size="large"
          onClick={handleStart}
        >
          {startText}
        </Button>
      </Box>
    </div>
  );
};

const ActiveHermitReader = ({
  handleStop,
  width,
  progress,
  handleScan,
}: {
  handleStop: () => void;
  handleError: (message: string) => void;
  width: number | string;
  progress: {
    totalParts: number;
    partsReceived: number;
    percentageReceived: number;
  };
  handleScan: HandleScanFn;
}) => {
  // NOTE: the styling here feels kind of arbitrary. It
  // would be nice if it was a little more predictable, but
  // this seems to render well in the main wallet signing flow
  return (
    <div style={{ padding: "3rem", height: width }}>
      <Grid container direction="column">
        <Grid item>
          <QrReader
            scanDelay={QR_CODE_READER_DELAY}
            onResult={handleScan as OnResultFunction}
            videoStyle={{ width, height: width, top: "10px" }}
            constraints={{ facingMode: "user" }}
          />
        </Grid>
        {progress.percentageReceived === 0 ? (
          <Grid item style={{ width }}>
            <LinearProgress />
            <p>Waiting for first QR code...</p>
          </Grid>
        ) : (
          <Grid item style={{ width }}>
            <LinearProgress
              variant="determinate"
              value={progress.percentageReceived}
            />
            <p>
              Scanned {progress.partsReceived} of {progress.totalParts} QR
              codes...
            </p>
          </Grid>
        )}

        <Grid item>
          <Button
            variant="contained"
            color="secondary"
            size="small"
            onClick={handleStop}
          >
            Cancel
          </Button>
        </Grid>
      </Grid>
    </div>
  );
};

interface HermitReaderProps {
  onStart: () => void;
  onSuccess: (data: string | null) => void;
  onClear: () => void;
  width: string;
  startText: string;
  interaction: HermitSignMultisigTransaction;
}

const HermitReader = ({
  onStart,
  onSuccess,
  onClear,
  width = "256px",
  startText = "Scan",
  interaction,
}: HermitReaderProps) => {
  const [status, setStatus] = useState(PENDING);
  const [error, setError] = useState("");
  const decoder = useMemo(() => new BCURDecoder(), []);

  const [progress, setProgress] = useState({
    totalParts: 0,
    partsReceived: 0,
    percentageReceived: 0,
  });

  const handleError = (message: string) => {
    setStatus("error");
    setError(message);
  };

  const handleStart = () => {
    setStatus(ACTIVE);
    setError("");
    if (onStart) {
      onStart();
    }
  };

  const handleStop = () => {
    setStatus(PENDING);
    setError("");
    setProgress({
      totalParts: 0,
      partsReceived: 0,
      percentageReceived: 0,
    });

    if (onClear) {
      decoder.reset();
      onClear();
    }
  };

  const handleScan: HandleScanFn = (result, error) => {
    const qrCodeString = result?.text;

    if (error?.stack) {
      setError(error.stack);
    }

    if (qrCodeString) {
      decoder.receivePart(result.text);
      const progress = decoder.progress();
      const newPercentageReceived =
        progress.totalParts > 0
          ? (progress.partsReceived / progress.totalParts) * 100
          : 0;

      setProgress({
        partsReceived: progress.partsReceived,
        totalParts: progress.totalParts,
        percentageReceived: newPercentageReceived,
      });

      if (decoder.isComplete()) {
        if (decoder.isSuccess()) {
          const data = decoder.data();
          onSuccess(data);
        } else {
          const errorMessage = decoder.errorMessage();
          if (errorMessage) handleError(errorMessage);
        }
      }
    }
  };

  if (status === ACTIVE) {
    return (
      <ActiveHermitReader
        handleStop={handleStop}
        handleError={handleError}
        handleScan={handleScan}
        progress={progress}
        width={width}
      />
    );
  }

  if (status === "error" || status === "success") {
    return (
      <div>
        <FormHelperText error>{error}</FormHelperText>
        <Button
          variant="contained"
          color="secondary"
          size="small"
          onClick={handleStop}
        >
          Reset
        </Button>
      </div>
    );
  }
  // default pending reader
  return (
    <PendingHermitReader
      interaction={interaction}
      startText={startText}
      handleStart={handleStart}
    />
  );
};

export default HermitReader;
