/**
 * New component that replaces the old PSBT import functionality
 */

import React, { useState, useEffect, useCallback } from "react";
import { Box, Button, Typography, LinearProgress, Alert } from "@mui/material";
import {
  Upload as UploadIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { Network } from "@caravan/bitcoin";
import { usePsbtInputs } from "hooks/utxos";
import { isBinaryPSBT, loadPsbt } from "utils/psbtUtils";
import { useSelector } from "react-redux";
import { WalletState } from "selectors/wallet";

interface PSBTImportComponentProps {
  onImport: (psbtText: string, inputs: any[], isRbfPBST: boolean) => void;
}

// Main PSBT Import Component
export const PSBTImportComponent: React.FC<PSBTImportComponentProps> = ({
  onImport,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>("");
  const [psbtText, setPsbtText] = useState<string>("");
  const [parsedPsbt, setParsedPsbt] = useState<any>(null);
  const network = useSelector((state: WalletState) => state.settings.network);

  const { allInputs, isRbfPSBT, reconstructionLoading, reconstructionError } =
    usePsbtInputs(parsedPsbt);

  useEffect(() => {
    if (reconstructionError) {
      setError(reconstructionError.toString());
      setIsProcessing(false);
      return;
    }

    // Don't proceed if still loading or no PSBT
    if (!parsedPsbt || reconstructionLoading) {
      return;
    }

    const totalPsbtInputs = parsedPsbt.txInputs.length;
    const resolvedInputsCount = allInputs.length;

    // Check if we have a mismatch after reconstruction is complete
    if (
      !reconstructionLoading &&
      !reconstructionError &&
      resolvedInputsCount !== totalPsbtInputs
    ) {
      if (resolvedInputsCount === 0) {
        // No inputs found - likely a different wallet
        setError(
          "This PSBT does not contain any UTXOs from this wallet. Please ensure you're using the correct wallet or PSBT file.",
        );
      } else {
        // Partial inputs found - should never happen but still handling
        setError(
          `Only ${resolvedInputsCount} of ${totalPsbtInputs} PSBT inputs belong to this wallet. Cannot import partial PSBT.`,
        );
      }
      setIsProcessing(false);
      return;
    }

    // Auto-import when inputs are resolved
    if (resolvedInputsCount > 0 && resolvedInputsCount === totalPsbtInputs) {
      try {
        onImport(psbtText, allInputs, isRbfPSBT);
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
  }, [
    reconstructionError,
    reconstructionLoading,
    parsedPsbt,
    allInputs.length,
    isRbfPSBT,
    psbtText,
    onImport,
  ]);

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
    [network],
  );

  // Clear error state
  const clearError = useCallback(() => {
    setError("");
    setPsbtText("");
    setParsedPsbt(null);
    setIsProcessing(false);
  }, []);

  // Determine current status
  const isLoading = isProcessing || reconstructionLoading;

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
          disabled={isLoading}
        />

        <Button
          color="primary"
          variant="contained"
          component="span"
          disabled={isLoading}
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
            {reconstructionLoading &&
              parsedPsbt &&
              "Resolving transaction inputs..."}
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
