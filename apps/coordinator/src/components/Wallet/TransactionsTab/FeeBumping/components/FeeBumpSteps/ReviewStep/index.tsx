import React, { useCallback, useState } from "react";
import { Box, Typography, Alert, AlertTitle } from "@mui/material";

import { PsbtV2 } from "@caravan/psbt";

import { TransactionComparison } from "./TransactionComparison";
import { PSBTVersionDialog } from "./PSBTVersionDialog";
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
  const { state } = useAccelerationModal();
  const { feeBumpResult, rbfType } = state;
  const [downloadClicked, setDownloadClicked] = useState(false);
  const [showPSBTVersionDialog, setShowPSBTVersionDialog] = useState(false);
  const [selectedPsbtVersion, setSelectedPsbtVersion] = useState<"v0" | "v2">(
    "v2",
  );

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

  // Handle PSBT download initiation
  const handleDownloadPSBT = useCallback(() => {
    setShowPSBTVersionDialog(true);
  }, []);

  // Handle version selection change
  const handleVersionChange = useCallback((version: "v0" | "v2") => {
    setSelectedPsbtVersion(version);
  }, []);

  // Handle dialog close
  const handleCloseDialog = useCallback(() => {
    setShowPSBTVersionDialog(false);
  }, []);

  const handleConfirmDownload = useCallback(() => {
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
      setDownloadClicked(true);
      setShowPSBTVersionDialog(false);

      return true;
    } catch (error) {
      console.error("Error downloading PSBT:", error);
      return false;
    }
  }, [feeBumpResult, rbfType]);

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
              downloadClicked={downloadClicked}
              disabled={!feeBumpResult}
            />

            {/* Next steps guidance */}
            <Box mt={3}>
              <Alert severity="info">
                <AlertTitle>Next Steps</AlertTitle>
                <Typography variant="body2" component="div">
                  <ol style={{ paddingLeft: "1rem", margin: 0 }}>
                    <li>
                      Sign the PSBT using your hardware wallet or the Sign tab
                    </li>
                    <li>Broadcast the signed transaction</li>
                    <li>
                      The transaction will replace the original pending
                      transaction
                    </li>
                  </ol>
                </Typography>
              </Alert>
            </Box>
          </Box>
          {/* PSBT Version Selection Dialog */}
          <PSBTVersionDialog
            open={showPSBTVersionDialog}
            onClose={handleCloseDialog}
            onConfirm={handleConfirmDownload}
            selectedVersion={selectedPsbtVersion}
            onVersionChange={handleVersionChange}
          />
        </>
      )}
    </Box>
  );
};
