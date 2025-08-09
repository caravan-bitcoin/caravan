import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import { PSBTImportComponent } from "./PSBTImportComponent";
import BCUR2Reader from "../BCUR2/BCUR2Reader";
import { loadPsbt } from "../../utils/psbtUtils";
import { useSelector } from "react-redux";

interface PSBTImportDropdownProps {
  onImport: (
    psbtText: string,
    inputs: any[],
    hasPendingInputs: boolean,
  ) => void;
}

const PSBTImportDropdown: React.FC<PSBTImportDropdownProps> = ({
  onImport,
}) => {
  const [importMethod, setImportMethod] = useState<string>("");
  const [error, setError] = useState<string>("");
  const network = useSelector((state: any) => state.settings.network);

  // Track if component is mounted to prevent memory leaks
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Safe setError that checks if component is still mounted
  const safeSetError = useCallback((errorMessage: string) => {
    if (isMountedRef.current) {
      setError(errorMessage);
    }
  }, []);

  // Safe setImportMethod that checks if component is still mounted
  const safeSetImportMethod = useCallback((method: string) => {
    if (isMountedRef.current) {
      setImportMethod(method);
    }
  }, []);

  const handleMethodChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      safeSetImportMethod(event.target.value);
      safeSetError(""); // Clear any previous errors
    },
    [safeSetImportMethod, safeSetError],
  );

  const handleBCUR2Success = useCallback(
    (psbtData: string) => {
      try {
        // Parse the PSBT to validate it
        const parsedPsbt = loadPsbt(psbtData, network);
        if (!parsedPsbt) {
          safeSetError("Failed to parse PSBT from QR code");
          return;
        }

        // For BCUR2 import, we don't have pre-resolved inputs,
        // so we'll pass empty array and let the import process handle it
        onImport(psbtData, [], false);

        // Reset selection after successful import
        safeSetImportMethod("");
      } catch (e) {
        safeSetError(
          `Failed to import PSBT: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    },
    [onImport, network, safeSetError, safeSetImportMethod],
  );

  const handleBCUR2Clear = useCallback(() => {
    safeSetError("");
    safeSetImportMethod("");
  }, [safeSetError, safeSetImportMethod]);

  const renderImportComponent = () => {
    switch (importMethod) {
      case "file":
        return (
          <PSBTImportComponent onImport={onImport} showMethodSelector={false} />
        );
      case "bcur2":
        return (
          <Box mt={2}>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Scan the PSBT QR code sequence from your hardware wallet or
              signing device.
            </Typography>
            <BCUR2Reader
              mode="psbt"
              onSuccess={handleBCUR2Success}
              onClear={handleBCUR2Clear}
              startText="Start PSBT Scanning"
              width="400px"
            />
            {error && (
              <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                {error}
              </Typography>
            )}
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Box mt={3}>
      <Typography variant="h6" gutterBottom>
        Import PSBT
      </Typography>
      <Typography variant="body2" color="textSecondary" gutterBottom>
        Import a Partially Signed Bitcoin Transaction (PSBT) from a file or QR
        code.
      </Typography>

      <FormControl fullWidth sx={{ mt: 2, maxWidth: 300 }}>
        <InputLabel id="psbt-import-method-label">Import Method</InputLabel>
        <Select
          labelId="psbt-import-method-label"
          value={importMethod}
          label="Import Method"
          onChange={handleMethodChange}
        >
          <MenuItem value="">
            <em>Select import method</em>
          </MenuItem>
          <MenuItem value="file">File Upload</MenuItem>
          <MenuItem value="bcur2">QR Code (BCUR2)</MenuItem>
        </Select>
      </FormControl>

      {renderImportComponent()}
    </Box>
  );
};

export default PSBTImportDropdown;
