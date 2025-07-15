import React, { useCallback, useState } from "react";
import { Box, Typography, Alert, AlertTitle, Button } from "@mui/material";
import { TransactionComparison } from "./TransactionComparison";
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

  const handleConfirmDownload = useCallback(() => {
    if (!feeBumpResult) {
      return false;
    }
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .substring(0, 19);

    const filename = `tx_${rbfType || "unknown"}_${timestamp}.psbt`;

    downloadFile(feeBumpResult!, filename);
    setDownloadClicked(true);
    return true;
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
            {downloadClicked && (
              <Alert severity="success" sx={{ mt: 2 }}>
                <AlertTitle>PSBT Downloaded Successfully</AlertTitle>
                <Typography variant="body2">
                  You can now sign the transaction using your hardware wallet or
                  upload it to the Sign tab.
                </Typography>
              </Alert>
            )}

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
          <Button onClick={handleConfirmDownload}>Download PSBT</Button>
        </>
      )}
    </Box>
  );
};
