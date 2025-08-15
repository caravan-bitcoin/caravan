import React, { useCallback, useState, useMemo } from "react";
import { Box, Alert, Button } from "@mui/material";
import { useSelector } from "react-redux";
import BCUR2Reader from "./BCUR2Reader";
import BCUR2Encoder from "./BCUR2Encoder";
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
const BCUR2Signer: React.FC<BCUR2SignerProps> = ({
  setError,
  onReceive,
  interaction,
}) => {
  const [showUnsignedPSBT, setShowUnsignedPSBT] = useState(false);

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

  // Generate QR codes from the interaction for unsigned PSBT
  const qrCodeFrames = useMemo(() => {
    if (!interaction) return [];
    try {
      const requestData = interaction.request();
      return requestData?.qrCodeFrames || [requestData];
    } catch (error) {
      console.error("Failed to generate QR codes:", error);
      return [];
    }
  }, [interaction]);

  const handleShowUnsignedPSBT = useCallback(() => {
    setShowUnsignedPSBT(true);
  }, []);

  const handleCloseUnsignedPSBT = useCallback(() => {
    setShowUnsignedPSBT(false);
  }, []);

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

        {/* Button row with Show Unsigned PSBT and Start QR Scanner */}
        <Box display="flex" gap={2} alignItems="flex-start" sx={{ mb: 2 }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handleShowUnsignedPSBT}
          >
            Show Unsigned PSBT
          </Button>

          <BCUR2Reader
            mode="psbt"
            onSuccess={handlePSBTSuccess}
            onClear={handleClearError}
            startText="Scan Signed PSBT"
          />
        </Box>
      </Box>

      {/* BCUR2 Encoder Dialog for Unsigned PSBT */}
      <BCUR2Encoder
        open={showUnsignedPSBT}
        onClose={handleCloseUnsignedPSBT}
        qrCodeFrames={qrCodeFrames}
        title="Unsigned PSBT QR Codes"
        qrSize={512} // Double the default size for better readability
        initialInterval={800} // Slightly faster default for better cameras
      />
    </div>
  );
};

export default BCUR2Signer;
