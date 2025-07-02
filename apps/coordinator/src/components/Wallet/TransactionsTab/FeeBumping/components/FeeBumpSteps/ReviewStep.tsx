import React from "react";
import {
  Box,
  LinearProgress,
  Typography,
  Alert,
  AlertTitle,
  Button,
} from "@mui/material";
import { TransactionComparison } from "../TransactionComparison";
import { FeeBumpStatus } from "../../types";
import { Transaction } from "../../../types";
import { useFeeBumpState } from "../../context";

interface ReviewStepProps {
  transaction: Transaction;
  onDownloadPSBT: () => void;
  downloadClicked: boolean;
  selectedPSBTVersion?: "v2" | "v0";
}

/**
 * Step 3: Review and Download
 *
 * This component handles the final review step of the fee bumping process.
 * It shows the transaction comparison, handles PSBT download, and provides
 * next steps guidance to the user.
 */
export const ReviewStep: React.FC<ReviewStepProps> = ({
  transaction,
  onDownloadPSBT,
  downloadClicked,
}) => {
  const { status, error, result } = useFeeBumpState();
  return (
    <Box>
      {/* Show loading indicator while transaction is being created */}
      {status === FeeBumpStatus.CREATING && (
        <Box sx={{ py: 2, textAlign: "center" }}>
          <LinearProgress />
          <Typography sx={{ mt: 2 }}>
            Creating transaction and calculating optimal fees...
          </Typography>
        </Box>
      )}

      {/* Display any errors that occurred during transaction creation */}
      {status === FeeBumpStatus.ERROR && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>Error Creating Transaction</AlertTitle>
          {error ||
            "An unexpected error occurred while creating the transaction."}
        </Alert>
      )}

      {/* Display transaction details and download button on success */}
      {status === FeeBumpStatus.SUCCESS && result && (
        <>
          {/* Transaction comparison component */}
          <TransactionComparison originalTx={transaction} result={result} />

          {/* Download section */}
          <Box sx={{ mt: 3, textAlign: "center" }}>
            <Button
              variant="contained"
              color="primary"
              onClick={onDownloadPSBT}
              size="large"
              sx={{ mb: 2 }}
            >
              Download PSBT
            </Button>

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
        </>
      )}
    </Box>
  );
};
