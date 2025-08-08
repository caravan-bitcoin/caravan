import React, { useCallback } from "react";
import PropTypes from "prop-types";
import { Box, Alert } from "@mui/material";
import BCUR2Reader from "./BCUR2Reader";
import { extractSignaturesFromPSBTData } from "../../utils/psbtSignatureUtils";
import { useSelector } from "react-redux";

/**
 * BCUR2 Signer component that follows the same pattern as ColdcardSigner.
 * This component handles QR code scanning and PSBT processing for BCUR2 format.
 */
const BCUR2Signer = ({ setError, onReceive }) => {
  // Wrap selectors in try-catch to handle any Redux state issues
  let network, inputs;
  try {
    network = useSelector((state) => state.settings.network);
    inputs = useSelector((state) => state.spend.transaction.inputs || []);
  } catch (error) {
    network = "mainnet"; // fallback
    inputs = []; // fallback
  }

  const handleClearError = useCallback(() => {
    try {
      if (setError) {
        setError("");
      }
    } catch (error) {
      // Error in handleClearError - silent fallback
    }
  }, [setError]);

  const handlePSBTSuccess = useCallback(
    (psbtData) => {
      try {
        // Validate inputs
        if (!inputs || inputs.length === 0) {
          if (setError) {
            setError(
              "No transaction inputs available for signature processing.",
            );
          }
          return;
        }

        // Extract signatures using the utility function
        const signatures = extractSignaturesFromPSBTData(
          psbtData,
          inputs,
          network,
        );

        if (signatures && signatures.length > 0) {
          // Call onReceive with the signatures directly since we've already extracted them
          if (onReceive && typeof onReceive === "function") {
            onReceive(signatures);
          } else {
            if (setError) {
              setError("Internal error: signature handler not available.");
            }
          }
        } else {
          if (setError) {
            setError("No valid signatures found in the PSBT.");
          }
        }
      } catch (error) {
        if (setError) {
          setError(`Error processing PSBT: ${error.message}`);
        }
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

BCUR2Signer.propTypes = {
  onReceive: PropTypes.func.isRequired,
  setError: PropTypes.func.isRequired,
  setActive: PropTypes.func.isRequired,
  hasError: PropTypes.bool,
  onReceivePSBT: PropTypes.func,
  interaction: PropTypes.object,
  disableChangeMethod: PropTypes.func,
  extendedPublicKeyImporter: PropTypes.object,
};

export default BCUR2Signer;
