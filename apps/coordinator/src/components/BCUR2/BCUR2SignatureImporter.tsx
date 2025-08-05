import React, { useState, useCallback, useRef, useEffect } from "react";
import { Box, Alert, Button } from "@mui/material";
import BCUR2Reader from "./BCUR2Reader";
import { loadPsbt } from "../../utils/psbtUtils";
import { useSelector } from "react-redux";

interface SignatureImporter {
  // Add specific properties if known, otherwise use a generic object
  [key: string]: any;
}

interface BCUR2SignatureImporterProps {
  signatureImporter: SignatureImporter;
  validateAndSetSignature: (
    signatures: string[],
    onError: (error: string) => void,
  ) => void;
  inputs: any[]; // Pass inputs from the transaction state
  unsignedPSBT: string; // Enhanced PSBT with witness scripts and UTXOs
}

const BCUR2SignatureImporter: React.FC<BCUR2SignatureImporterProps> = ({
  validateAndSetSignature,
  inputs,
  unsignedPSBT,
}) => {
  const [error, setError] = useState<string>("");
  const [showScanner, setShowScanner] = useState<boolean>(false);
  const network = useSelector((state: any) => state.settings.network);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleShowScanner = useCallback((): void => {
    if (!isMountedRef.current) return;
    setShowScanner(true);
    setError("");
  }, []);

  const handleSetError = useCallback((value: string): void => {
    if (!isMountedRef.current) return;
    setError(value);
  }, []);

  const handleClearError = useCallback((): void => {
    if (!isMountedRef.current) return;
    setError("");
    setShowScanner(false);
  }, []);

  const handlePSBTSuccess = useCallback(
    (psbtData: string): void => {
      // Early exit if component is unmounted
      if (!isMountedRef.current) return;

      try {
        // Check if inputs are available
        if (!inputs || inputs.length === 0) {
          handleSetError(
            "No transaction inputs available. Please ensure the transaction is properly set up before importing signatures.",
          );
          return;
        }

        // Check if we have an enhanced PSBT to work with
        if (!unsignedPSBT) {
          handleSetError(
            "No base transaction available. Please ensure the transaction is properly set up before importing signatures.",
          );
          return;
        }

        // Parse the PSBT from QR code to get signatures
        const signedPsbt = loadPsbt(psbtData, network);
        if (!signedPsbt) {
          handleSetError("Failed to parse PSBT data from QR code");
          return;
        }

        // Extract signatures from the signed PSBT
        const extractedSignatures: string[] = [];

        // We need to extract signatures for ALL inputs, matching the expected format
        for (let i = 0; i < inputs.length; i++) {
          let signatureFound = false;

          // Check if this input has a signature in the signed PSBT
          if (i < signedPsbt.data.inputs.length) {
            const signedInput = signedPsbt.data.inputs[i];

            if (signedInput.partialSig && signedInput.partialSig.length > 0) {
              // Extract the first signature for this input
              const signature =
                signedInput.partialSig[0].signature.toString("hex");
              extractedSignatures.push(signature);
              signatureFound = true;
            }
          }

          if (!signatureFound) {
            handleSetError(`No signature found for input ${i + 1}`);
            return;
          }
        }

        if (extractedSignatures.length === 0) {
          handleSetError("No signatures found in the PSBT");
          return;
        }

        if (extractedSignatures.length !== inputs.length) {
          handleSetError(
            `Expected ${inputs.length} signatures, but found ${extractedSignatures.length}`,
          );
          return;
        }

        // Check once more before calling validation
        if (!isMountedRef.current) return;

        // Use the standard validation mechanism with proper error handling
        try {
          validateAndSetSignature(extractedSignatures, (error: string) => {
            if (isMountedRef.current) {
              handleSetError(error);
            }
          });

          // Clear scanner on success (only if still mounted)
          if (isMountedRef.current) {
            setShowScanner(false);
          }
        } catch (validationError) {
          if (isMountedRef.current) {
            handleSetError(
              `Validation failed: ${validationError instanceof Error ? validationError.message : String(validationError)}`,
            );
          }
        }
      } catch (e) {
        if (isMountedRef.current) {
          handleSetError(
            `Failed to extract signatures: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }
    },
    [validateAndSetSignature, handleSetError, inputs, network, unsignedPSBT],
  );

  return (
    <Box mt={2}>
      {!showScanner ? (
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handleShowScanner}
        >
          Scan Signed PSBT QR Code
        </Button>
      ) : (
        <>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <BCUR2Reader
            mode="psbt"
            onSuccess={handlePSBTSuccess}
            onClear={handleClearError}
          />
        </>
      )}
    </Box>
  );
};

export default BCUR2SignatureImporter;
