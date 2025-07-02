/**
 * New component that replaces the old PSBT import functionality
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch } from "react-redux";
import {
  Box,
  Button,
  Typography,
  LinearProgress,
  Alert,
  Card,
  CardContent,
  Chip,
  Stack,
} from "@mui/material";
import {
  Upload as UploadIcon,
  CheckCircle as CheckIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { Network } from "@caravan/bitcoin";
import { updatePendingTransactions } from "../../actions/walletActions";
import { usePendingTransactions } from "clients/transactions";
import { usePsbtInputs } from "hooks/useReconstructedUtxos";
import { loadPsbt } from "utils/psbtUtils";

interface PSBTImportComponentProps {
  onImport: (psbtText: string, inputs: any[], isRbfPsbt: boolean) => void;
  network: string;
  disabled?: boolean;
}

// Component to handle PSBT inputs and import
interface PSBTInputResolutionHandlerProps {
  psbt: any | null;
  psbtText: string;
  onImport: (psbtText: string, inputs: any[], isRbfPsbt: boolean) => void;
  onError: (error: string) => void;
  onStatusUpdate: (status: {
    isRbfPsbt: boolean;
    isLoading: boolean;
    availableInputCount: number;
    reconstructedInputCount: number;
    totalRequiredInputCount: number;
  }) => void;
}

const PSBTInputResolutionHandler: React.FC<PSBTInputResolutionHandlerProps> = ({
  psbt,
  psbtText,
  onImport,
  onError,
  onStatusUpdate,
}) => {
  const {
    inputs,
    isLoading,
    error,
    isRbfPsbt,
    availableInputCount,
    reconstructedInputCount,
    totalRequiredInputCount,
  } = usePsbtInputs(psbt);

  // Update parent with status
  useEffect(() => {
    onStatusUpdate({
      isRbfPsbt,
      isLoading,
      availableInputCount,
      reconstructedInputCount,
      totalRequiredInputCount,
    });
  }, [
    isRbfPsbt,
    isLoading,
    availableInputCount,
    reconstructedInputCount,
    totalRequiredInputCount,
    onStatusUpdate,
  ]);

  useEffect(() => {
    if (error) {
      onError(error.toString());
    }
  }, [error, onError]);

  // Auto-import when inputs are resolved
  useEffect(() => {
    if (
      !isLoading &&
      inputs.length === totalRequiredInputCount &&
      inputs.length > 0
    ) {
      onImport(psbtText, inputs, isRbfPsbt);
    }
  }, [
    isLoading,
    inputs,
    totalRequiredInputCount,
    isRbfPsbt,
    onImport,
    psbtText,
  ]);

  return null; // This component doesn't render anything
};

// Main PSBT Import Component
export const PSBTImportComponent: React.FC<PSBTImportComponentProps> = ({
  onImport,
  network,
  disabled = false,
}) => {
  const dispatch = useDispatch();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>("");
  const [psbtText, setPsbtText] = useState<string>("");
  const [parsedPsbt, setParsedPsbt] = useState<any>(null);

  const { transactions } = usePendingTransactions();
  const prevRef = useRef<string>("");

  useEffect(() => {
    if (isLoading) return;

    // stringify to get a cheap “has it changed?” check else infinte renders ...
    const next = JSON.stringify(transactions);
    if (next !== prevRef.current) {
      prevRef.current = next;
      dispatch(updatePendingTransactions(transactions));
    }
  }, [dispatch, transactions]);

  // State for input resolution status
  const [inputStatus, setInputStatus] = useState({
    isRbfPsbt: false,
    isLoading: false,
    availableInputCount: 0,
    reconstructedInputCount: 0,
    totalRequiredInputCount: 0,
  });

  // Helper function to detect if content is binary PSBT
  const isBinaryPSBT = useCallback((arrayBuffer: ArrayBuffer): boolean => {
    const uint8Array = new Uint8Array(arrayBuffer);
    // Check for binary PSBT magic bytes (0x70736274ff)
    return (
      uint8Array.length >= 5 &&
      uint8Array[0] === 0x70 &&
      uint8Array[1] === 0x73 &&
      uint8Array[2] === 0x62 &&
      uint8Array[3] === 0x74 &&
      uint8Array[4] === 0xff
    );
  }, []);

  // Clear state
  const clearState = useCallback(() => {
    setError("");
    setPsbtText("");
    setParsedPsbt(null);
    setInputStatus({
      isRbfPsbt: false,
      isLoading: false,
      availableInputCount: 0,
      reconstructedInputCount: 0,
      totalRequiredInputCount: 0,
    });
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;

      setIsProcessing(true);
      setError("");

      try {
        if (!files || files.length === 0) {
          setError("No PSBT provided.");
          return;
        }
        if (files.length > 1) {
          setError("Multiple PSBTs provided. Please select only one file.");
          return;
        }

        const file = files[0];
        const fileReader = new FileReader();

        fileReader.onload = async (event) => {
          try {
            const arrayBuffer = event.target?.result as ArrayBuffer;
            let processedPsbtText = "";

            if (isBinaryPSBT(arrayBuffer)) {
              // Handle binary PSBT - convert to base64
              try {
                const uint8Array = new Uint8Array(arrayBuffer);
                let binaryString = "";
                for (let i = 0; i < uint8Array.length; i++) {
                  binaryString += String.fromCharCode(uint8Array[i]);
                }
                processedPsbtText = btoa(binaryString);
              } catch (conversionError) {
                setError(`Failed to convert binary PSBT: ${conversionError}`);
                return;
              }
            } else {
              // Handle text PSBT
              const textDecoder = new TextDecoder("utf-8");
              processedPsbtText = textDecoder.decode(arrayBuffer).trim();

              if (!processedPsbtText) {
                setError("Invalid or empty PSBT file.");
                return;
              }
            }

            // Parse PSBT to trigger input resolution
            try {
              const parsed = loadPsbt(processedPsbtText, network as Network);
              setPsbtText(processedPsbtText);
              setParsedPsbt(parsed);
              setError("");
            } catch (parseError) {
              setError(`Failed to parse PSBT: ${parseError}`);
            }
          } catch (processingError) {
            setError(`Error processing file: ${processingError}`);
          } finally {
            setIsProcessing(false);
          }
        };

        fileReader.onerror = () => {
          setError("Error reading file.");
          setIsProcessing(false);
        };

        fileReader.readAsArrayBuffer(file);
      } catch (generalError) {
        setError(`Error handling file: ${generalError}`);
        setIsProcessing(false);
      }

      event.target.value = "";
    },
    [network, isBinaryPSBT],
  );

  // Handle successful import
  const handleImportSuccess = useCallback(
    (resolvedPsbtText: string, inputs: any[], isRbfPsbt: boolean) => {
      try {
        onImport(resolvedPsbtText, inputs, isRbfPsbt);
        clearState();
      } catch (importError) {
        setError(`Import failed: ${importError}`);
      }
    },
    [onImport, clearState],
  );

  const handleResolutionError = useCallback((errorMessage: string) => {
    setError(errorMessage);
  }, []);

  // Determine current status
  const isLoading = isProcessing || inputStatus.isLoading;
  const hasError = !!error;
  const isReadyToImport = parsedPsbt && !isLoading && !hasError;
  const isAwaitingResolution = parsedPsbt && inputStatus.isLoading;

  return (
    <Box mt={2}>
      {/* Input resolution handler */}
      {parsedPsbt && (
        <PSBTInputResolutionHandler
          psbt={parsedPsbt}
          psbtText={psbtText}
          onImport={handleImportSuccess}
          onError={handleResolutionError}
          onStatusUpdate={setInputStatus}
        />
      )}

      {/* File input */}
      <label htmlFor="import-psbt">
        <input
          style={{ display: "none" }}
          id="import-psbt"
          name="import-psbt"
          accept=".psbt,*/*"
          onChange={handleFileSelect}
          type="file"
          disabled={disabled || isLoading}
        />

        <Button
          color="primary"
          variant="contained"
          component="span"
          disabled={disabled || isLoading}
          startIcon={isLoading ? <RefreshIcon /> : <UploadIcon />}
          sx={{ mt: 2 }}
        >
          {isLoading ? "Processing..." : "Import PSBT"}
        </Button>
      </label>

      {isLoading && (
        <Box mt={2}>
          <LinearProgress />
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            {isProcessing && "Reading and parsing PSBT file..."}
            {isAwaitingResolution &&
              inputStatus.isRbfPsbt &&
              "Reconstructing UTXOs from pending transactions..."}
            {isAwaitingResolution &&
              !inputStatus.isRbfPsbt &&
              "Resolving inputs..."}
          </Typography>
        </Box>
      )}

      {/* Status card for PSBT analysis */}
      {parsedPsbt && !hasError && (
        <Card sx={{ mt: 2 }} variant="outlined">
          <CardContent>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mb: 2 }}
            >
              <CheckIcon color="success" fontSize="small" />
              <Typography variant="subtitle2">
                PSBT Parsed Successfully
              </Typography>
            </Stack>

            <Stack spacing={1}>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip
                  label={inputStatus.isRbfPsbt ? "RBF PSBT" : "Normal PSBT"}
                  color={inputStatus.isRbfPsbt ? "warning" : "success"}
                  size="small"
                />
                <Chip
                  label={`${inputStatus.totalRequiredInputCount} inputs required`}
                  variant="outlined"
                  size="small"
                />
              </Stack>

              {inputStatus.isRbfPsbt && (
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    • Available inputs: {inputStatus.availableInputCount}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    • Reconstructed inputs:{" "}
                    {inputStatus.reconstructedInputCount}
                  </Typography>
                  {inputStatus.isLoading && (
                    <Typography variant="body2" color="primary">
                      • Reconstructing missing UTXOs...
                    </Typography>
                  )}
                </Box>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Error display */}
      {hasError && (
        <Alert
          severity="error"
          sx={{ mt: 2 }}
          action={
            <Button color="inherit" size="small" onClick={clearState}>
              Clear
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Success indicator */}
      {isReadyToImport && !inputStatus.isLoading && (
        <Alert severity="info" sx={{ mt: 2 }}>
          PSBT ready to import. Input resolution complete.
        </Alert>
      )}
    </Box>
  );
};

export default PSBTImportComponent;
