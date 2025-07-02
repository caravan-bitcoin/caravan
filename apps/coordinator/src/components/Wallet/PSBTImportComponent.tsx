/**
 * New component that replaces the old PSBT import functionality
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch } from "react-redux";
import { Box, Button, Typography, LinearProgress, Alert } from "@mui/material";
import {
  Upload as UploadIcon,
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

  const {
    inputs,
    isLoading: inputsLoading,
    error: inputsError,
    isRbfPsbt,
    totalRequiredInputCount,
  } = usePsbtInputs(parsedPsbt);

  const { transactions } = usePendingTransactions();
  const prevRef = useRef<string>("");

  // Allow import if:
  // - inputs resolved and counts match for RBF PSBTs
  // - or non-RBF PSBT (so we can catch missing-input errors)
  const canImport =
    !inputsLoading &&
    parsedPsbt &&
    psbtText &&
    (isRbfPsbt
      ? inputs.length === totalRequiredInputCount && totalRequiredInputCount > 0
      : true);

  useEffect(() => {
    if (isLoading) return;

    // stringify to get a cheap “has it changed?” check else infinte renders ...
    const next = JSON.stringify(transactions);
    if (next !== prevRef.current) {
      prevRef.current = next;
      dispatch(updatePendingTransactions(transactions));
    }
  }, [dispatch, transactions]);

  useEffect(() => {
    if (inputsError) {
      setError(inputsError.toString());
      setIsProcessing(false);
      return;
    }

    // Auto-import when inputs are resolved
    if (canImport) {
      try {
        onImport(psbtText, inputs, isRbfPsbt);
        // Clear state after successful import
        setPsbtText("");
        setParsedPsbt(null);
        setError("");
        setIsProcessing(false);
      } catch (importError) {
        setError(`Import failed: ${importError}`);
        setIsProcessing(false);
      }
    }
  }, [canImport]);

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

  // Handle file selection
  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;

      setIsProcessing(true);
      setError("");
      setPsbtText("");
      setParsedPsbt(null);

      try {
        if (!files || files.length === 0) {
          setError("No PSBT provided.");
          setIsProcessing(false);
          return;
        }
        if (files.length > 1) {
          setError("Multiple PSBTs provided. Please select only one file.");
          setIsProcessing(false);
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
                setIsProcessing(false);
                return;
              }
            } else {
              // Handle text PSBT
              const textDecoder = new TextDecoder("utf-8");
              processedPsbtText = textDecoder.decode(arrayBuffer).trim();

              if (!processedPsbtText) {
                setError("Invalid or empty PSBT file.");
                setIsProcessing(false);
                return;
              }
            }

            // Parse PSBT to trigger input resolution
            try {
              const parsed = loadPsbt(processedPsbtText, network as Network);
              setPsbtText(processedPsbtText);
              setParsedPsbt(parsed);
              // Keep processing state true until inputs are resolved
            } catch (parseError) {
              setError(`Failed to parse PSBT: ${parseError}`);
              setIsProcessing(false);
            }
          } catch (processingError) {
            setError(`Error processing file: ${processingError}`);
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

      // Clear the input value to allow re-importing
      event.target.value = "";
    },
    [network, isBinaryPSBT],
  );

  // Clear error state
  const clearError = useCallback(() => {
    setError("");
    setPsbtText("");
    setParsedPsbt(null);
    setIsProcessing(false);
  }, []);

  // Determine current status
  const isLoading = isProcessing || inputsLoading;

  return (
    <Box mt={2}>
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

      {/* Loading indicator */}
      {isLoading && (
        <Box mt={2}>
          <LinearProgress />
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            {isProcessing && !parsedPsbt && "Reading and parsing PSBT file..."}
            {inputsLoading && parsedPsbt && "Resolving transaction inputs..."}
          </Typography>
        </Box>
      )}

      {/* Error display */}
      {error && (
        <Alert
          severity="error"
          sx={{ mt: 2 }}
          action={
            <Button color="inherit" size="small" onClick={clearError}>
              Clear
            </Button>
          }
        >
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default PSBTImportComponent;
