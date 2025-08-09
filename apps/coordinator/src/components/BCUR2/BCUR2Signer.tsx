import React, { useCallback } from "react";
import { Box, Alert } from "@mui/material";
import { useSelector } from "react-redux";
import BCUR2Reader from "./BCUR2Reader";
import { extractSignaturesFromPSBTData } from "../../utils/psbtSignatureUtils";

interface BCUR2SignerProps {
  onReceive: (signatures: any) => void;
  setError: (error: string) => void;
  hasError?: boolean;
  onReceivePSBT?: (psbt: any) => void;
  interaction?: any;
  disableChangeMethod?: () => void;
  extendedPublicKeyImporter?: any;
}

/**
 * BCUR2 Signer component that follows the same pattern as ColdcardSigner.
 * This component handles QR code scanning and PSBT processing for BCUR2 format.
 */
const BCUR2Signer: React.FC<BCUR2SignerProps> = ({ setError, onReceive }) => {
  const network = useSelector(
    (state: any) => state.settings?.network || "testnet",
  );
  const inputs = useSelector(
    (state: any) => state.spend?.transaction?.inputs || [],
  );

  // Early validation - if no inputs, show helpful message instead of breaking component
  if (!inputs || inputs.length === 0) {
    return (
      <div style={{ padding: "16px", textAlign: "center", color: "#666" }}>
        <p>No transaction inputs available.</p>
        <p>
          Please set up your transaction inputs before importing signatures.
        </p>
      </div>
    );
  }

  const handleClearError = useCallback(() => {
    setError("");
  }, [setError]);

  const handlePSBTSuccess = useCallback(
    (psbtData: any) => {
      try {
        const signatures = extractSignaturesFromPSBTData(
          psbtData,
          inputs,
          network,
        );

        if (!signatures || signatures.length === 0) {
          setError("No valid signatures found in PSBT");
        } else {
          onReceive(signatures);
        }
      } catch (error) {
        setError(
          `Error processing PSBT: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
    [inputs, network, onReceive, setError],
  );

  return (
    <div>
      <Box mt={2}>
        <Alert severity="info" sx={{ mb: 2 }}>
          When you are ready, scan the signed PSBT QR code from your signing
          device.
        </Alert>
        <BCUR2Reader
          mode="psbt"
          onSuccess={handlePSBTSuccess}
          onClear={handleClearError}
          startText="Start QR Scanner"
        />
      </Box>
    </div>
  );
};

export default BCUR2Signer;
