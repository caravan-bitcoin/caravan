/**
 * New component that replaces the old PSBT import functionality
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Typography,
  LinearProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import {
  Upload as UploadIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { Network } from "@caravan/bitcoin";
import { usePsbtInputs } from "hooks/utxos";
import { isBinaryPSBT, loadPsbt } from "utils/psbtUtils";
import { useSelector } from "react-redux";
import { WalletState } from "selectors/wallet";
import BCUR2Reader from "../BCUR2/BCUR2Reader";

interface PSBTImportComponentProps {
  onImport: (
    psbtText: string,
    inputs: any[],
    hasPendingInputs: boolean,
  ) => void;
  showMethodSelector?: boolean; // New prop to control method selector visibility
}

// File Import Component
interface FileImportProps {
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isLoading: boolean;
}

const FileImport: React.FC<FileImportProps> = ({ onFileSelect, isLoading }) => (
  <>
    <label htmlFor="import-psbt">
      <input
        style={{ display: "none" }}
        id="import-psbt"
        name="import-psbt"
        accept=".psbt,*/*"
        onChange={onFileSelect}
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
        {isLoading ? "Processing..." : "Import PSBT File"}
      </Button>
    </label>
  </>
);

// QR Code Import Component
interface QRImportProps {
  onSuccess: (psbtData: string) => void;
  onClear: () => void;
}

const QRImport: React.FC<QRImportProps> = ({ onSuccess, onClear }) => (
  <Box mt={2}>
    <Typography variant="body2" color="textSecondary" gutterBottom>
      Scan the PSBT QR code sequence from your hardware wallet or signing
      device.
    </Typography>
    <BCUR2Reader
      mode="psbt"
      onSuccess={onSuccess}
      onClear={onClear}
      startText="Start PSBT Scanning"
      width="400px"
    />
  </Box>
);

// Import Method Selector Component
interface ImportMethodSelectorProps {
  importMethod: string;
  onMethodChange: (event: SelectChangeEvent<string>) => void;
  isLoading: boolean;
}

const ImportMethodSelector: React.FC<ImportMethodSelectorProps> = ({
  importMethod,
  onMethodChange,
  isLoading,
}) => (
  <FormControl fullWidth sx={{ maxWidth: 300, mb: 2 }}>
    <InputLabel id="psbt-import-method-label">Import Method</InputLabel>
    <Select
      labelId="psbt-import-method-label"
      value={importMethod}
      label="Import Method"
      onChange={onMethodChange}
      disabled={isLoading}
    >
      <MenuItem value="file">File Upload</MenuItem>
      <MenuItem value="bcur2">QR Code (BCUR2)</MenuItem>
    </Select>
  </FormControl>
);

// Main PSBT Import Component
export const PSBTImportComponent: React.FC<PSBTImportComponentProps> = ({
  onImport,
  showMethodSelector = true, // Default to showing the method selector
}) => {
  const [importMethod, setImportMethod] = useState<string>(
    showMethodSelector ? "file" : "file",
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>("");
  const [psbtText, setPsbtText] = useState<string>("");
  const [parsedPsbt, setParsedPsbt] = useState<any>(null);
  const network = useSelector((state: WalletState) => state.settings.network);

  const {
    allInputs,
    hasPendingInputs,
    reconstructionLoading,
    reconstructionError,
  } = usePsbtInputs(parsedPsbt);

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
        onImport(psbtText, allInputs, hasPendingInputs);
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
    hasPendingInputs,
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

  // Handle import method change
  const handleMethodChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      setImportMethod(event.target.value);
      clearError(); // Clear any previous errors when switching methods
    },
    [clearError],
  );

  // Handle BCUR2 QR code success
  const handleBCUR2Success = useCallback(
    (psbtData: string) => {
      setIsProcessing(true);
      setError("");
      setPsbtText("");
      setParsedPsbt(null);

      try {
        // Parse PSBT to trigger input resolution
        const parsed = loadPsbt(psbtData, network as Network);
        setPsbtText(psbtData);
        setParsedPsbt(parsed);
        // Keep processing state true until inputs are resolved
      } catch (parseError) {
        setError(`Failed to parse PSBT from QR code: ${parseError}`);
        setIsProcessing(false);
      }
    },
    [network],
  );

  // Handle BCUR2 clear/cancel
  const handleBCUR2Clear = useCallback(() => {
    clearError();
  }, [clearError]);

  // Determine current status
  const isLoading = isProcessing || reconstructionLoading;

  // Render the appropriate import component
  const renderImportComponent = () => {
    switch (importMethod) {
      case "file":
        return (
          <FileImport onFileSelect={handleFileSelect} isLoading={isLoading} />
        );
      case "bcur2":
        return (
          <QRImport onSuccess={handleBCUR2Success} onClear={handleBCUR2Clear} />
        );
      default:
        return null;
    }
  };

  return (
    <Box mt={2}>
      {/* Import method selection - only show if showMethodSelector is true */}
      {showMethodSelector && (
        <ImportMethodSelector
          importMethod={importMethod}
          onMethodChange={handleMethodChange}
          isLoading={isLoading}
        />
      )}

      {/* Render selected import method */}
      {(showMethodSelector && importMethod) || !showMethodSelector
        ? renderImportComponent()
        : null}

      {/* Loading indicator */}
      {isLoading && (
        <Box mt={2}>
          <LinearProgress />
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            {isProcessing &&
              !parsedPsbt &&
              (importMethod === "file"
                ? "Reading and parsing PSBT file..."
                : "Processing PSBT from QR code...")}
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
