import React, { useCallback, useState } from "react";
import { Box, Typography, Alert, AlertTitle } from "@mui/material";

import { PsbtV2 } from "@caravan/psbt";

import { TransactionComparison } from "./TransactionComparison";
import { DownloadSection } from "./DownloadSection";
import { useAccelerationModal } from "../../AccelerationModalContext";
import { downloadFile } from "utils/index";

/**
 * Step 3: Review and Download
 *
 * This component handles the final review step of the fee bumping process.
 * It shows the transaction comparison, handles PSBT download, and provides
 * next steps guidance to the user.
 */
export const ReviewStep = () => {
  const { state, setDownloadClicked } = useAccelerationModal();
  const { feeBumpResult, rbfType } = state;
  const [localdownloadClicked, setlocalDownloadClicked] = useState(false);

  // Convert PSBT between versions
  const convertPSBT = useCallback(
    (psbtBase64: string, targetVersion: "v0" | "v2"): string => {
      try {
        if (targetVersion === "v0") {
          // Convert to v0
          const psbt = new PsbtV2(psbtBase64);
          return psbt.toV0("base64");
        }
        return psbtBase64; // as RBF functions give back V2 PSBT only
      } catch (error) {
        console.error("Error converting PSBT:", error);
        return psbtBase64; // Return original if conversion fails
      }
    },
    [],
  );

  const handleDownloadPSBT = (selectedPsbtVersion: "v0" | "v2") => {
    if (!feeBumpResult) {
      return false;
    }

    try {
      // Generate filename
      const txTypeStr = rbfType === "cancel" ? "cancel" : "accelerated";
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .substring(0, 19);
      const versionStr = selectedPsbtVersion;
      const filename = `${txTypeStr}_tx_${versionStr}_${timestamp}.psbt`;

      // Convert PSBT to requested version
      const convertedPSBT = convertPSBT(
        feeBumpResult.psbtBase64,
        selectedPsbtVersion,
      );

      // Download file
      downloadFile(convertedPSBT, filename);

      // Update state
      setlocalDownloadClicked(true);
      setDownloadClicked(true);
      return true;
    } catch (error) {
      console.error("Error downloading PSBT:", error);
      return false;
    }
  };

  return (
    <Box>
      {/* Display error if no PSBT is available */}
      {!feeBumpResult && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>No PSBT Available</AlertTitle>
          No fee bump PSBT was created. Please go back and create the
          transaction.
        </Alert>
      )}

      {/* Display transaction details and download button when PSBT is available */}
      {feeBumpResult && (
        <>
          {/* Transaction comparison component */}
          <TransactionComparison />

          {/* Download section */}
          <Box sx={{ mt: 3, textAlign: "center" }}>
            {/* Success message after download */}
            <DownloadSection
              onDownload={handleDownloadPSBT}
              downloadClicked={localdownloadClicked}
              disabled={!feeBumpResult}
            />
          </Box>
          {/* Next steps guidance */}
          <Box
            mt={3}
            sx={{
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Alert severity="success" sx={{ textAlign: "center" }}>
              <AlertTitle>Next Steps</AlertTitle>
              <Typography
                variant="body2"
                component="div"
                sx={{ lineHeight: 1.8 }}
              >
                1. Sign the PSBT using your hardware wallet or the Sign tab.
                <br />
                2. Broadcast the signed transaction.
                <br />
                3. The transaction will replace the original pending
                transaction.
              </Typography>
            </Alert>
          </Box>
        </>
      )}
    </Box>
  );
};
