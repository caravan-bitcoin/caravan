import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  Step,
  StepLabel,
  Stepper,
  Typography,
  Alert,
  AlertTitle,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { FeeBumpStrategy } from "@caravan/fees";
import { useFeeBumping } from "../hooks/useFeeBumping";
import { FeeStrategySelector } from "./FeeStrategySelector";
import { RBFForm } from "./RBF/RBFForm";
import { TransactionComparison } from "./TransactionComparison";
import { FeeBumpStatus, FeePriority } from "../types";
import { downloadFile } from "../../../../../utils";

/**
 * Modal for transaction acceleration and fee bumping
 *
 * This component provides a wizard-like interface for users to:
 * 1. Choose a fee-bumping strategy (RBF or CPFP)
 * 2. Configure the transaction details (fee rate, addresses)
 * 3. Review and download the resulting PSBT
 *
 * It integrates with the useFeeBumping hook to handle the actual fee-bumping logic.
 */
interface AccelerationModalProps {
  open: boolean;
  onClose: () => void;
  transaction: any; // The transaction to accelerate
  txHex: string; // Raw transaction hex (optional, will be fetched if not provided)
}

export const AccelerationModal: React.FC<AccelerationModalProps> = ({
  open,
  onClose,
  transaction,
  txHex,
}) => {
  // Track the current step in the wizard
  const [activeStep, setActiveStep] = useState(0);

  // Track whether the PSBT has been downloaded
  const [downloadClicked, setDownloadClicked] = useState(false);

  const {
    status,
    error,
    recommendation,
    selectedStrategy,
    selectedFeeRate,
    selectedPriority,
    result,
    isCreatingRBF,
    setTransactionForBumping,
    updateFeeRate,
    updateFeePriority,
    updateStrategy,
    createFeeBumpedTransaction,
    reset,
  } = useFeeBumping();

  // Initialize the transaction for fee bumping when the modal opens
  useEffect(() => {
    if (open && transaction) {
      setTransactionForBumping(transaction, FeePriority.MEDIUM);
      setActiveStep(0);
      setDownloadClicked(false);
    } else if (!open) {
      // Reset the fee bumping state when the modal closes
      reset();
    }
  }, [open, transaction, setTransactionForBumping, reset]);

  // Handle step navigation
  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  // Handle form submission
  const handleSubmitRBF = async (options: {
    isCancel: boolean;
    cancelAddress?: string;
    changeAddress?: string;
  }) => {
    // Create the fee-bumped transaction with the specified options
    await createFeeBumpedTransaction(options);
    handleNext(); // Move to the next step when done
  };

  // Handle PSBT download
  const handleDownloadPSBT = () => {
    if (result) {
      // Use a descriptive filename based on the transaction type and priority
      const priorityStr = result.priority.toLowerCase();
      const txTypeStr = result.isCancel ? "cancel" : "accelerated";
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .substring(0, 19);

      const filename = `${txTypeStr}_tx_${priorityStr}_${timestamp}.psbt`;

      downloadFile(result.psbtBase64, filename);
      setDownloadClicked(true);
    }
  };

  // Handle modal close with confirmation if PSBT not downloaded
  const handleClose = () => {
    if (status === FeeBumpStatus.SUCCESS && !downloadClicked) {
      // Warn the user if they try to close without downloading the PSBT
      const confirm = window.confirm(
        "You haven't downloaded the fee-bumped transaction. Are you sure you want to close?",
      );
      if (!confirm) {
        return;
      }
    }
    onClose();
  };

  // Get the steps for the stepper
  const getSteps = () => {
    return ["Select Strategy", "Configure Transaction", "Review and Download"];
  };

  // Calculate the original fee rate for the transaction
  const calculateOriginalFeeRate = () => {
    if (!transaction) return 0;

    const txSize = transaction.vsize || transaction.size;
    return txSize ? transaction.fee / txSize : 0;
  };

  // Get the content for the current step
  const getStepContent = (step: number) => {
    switch (step) {
      case 0: // Strategy selection step
        return recommendation ? (
          <FeeStrategySelector
            recommendation={recommendation}
            selectedStrategy={selectedStrategy}
            onStrategyChange={updateStrategy}
          />
        ) : (
          <Box sx={{ py: 2, textAlign: "center" }}>
            <LinearProgress />
            <Typography sx={{ mt: 2 }}>
              {status === FeeBumpStatus.ANALYZING
                ? "Analyzing transaction and current network conditions..."
                : "Loading transaction details..."}
            </Typography>

            {/* Show helpful tips while waiting */}
            {status === FeeBumpStatus.ANALYZING && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                We&apos;re checking if your transaction can be fee-bumped and
                getting current network fee rates...
              </Typography>
            )}

            {error && (
              <Alert severity="error" sx={{ mt: 2, textAlign: "left" }}>
                <AlertTitle>Analysis Error</AlertTitle>
                {error}
              </Alert>
            )}
          </Box>
        );

      case 1: // Fee configuration step
        if (selectedStrategy === FeeBumpStrategy.RBF) {
          return (
            <RBFForm
              recommendation={recommendation!}
              originalFeeRate={calculateOriginalFeeRate()}
              originalFee={transaction.fee.toString()}
              selectedFeeRate={selectedFeeRate}
              selectedPriority={selectedPriority} // Pass the selected priority
              onFeeRateChange={updateFeeRate}
              onPriorityChange={updateFeePriority} // Add priority change handler
              onSubmit={handleSubmitRBF}
              isCreating={isCreatingRBF} // Use the direct isCreating state
            />
          );
        }
        return (
          <Alert severity="warning">
            <AlertTitle>CPFP Support Coming Soon</AlertTitle>
            Child-Pays-for-Parent (CPFP) support is coming in a future update.
            Please use Replace-by-Fee (RBF) for now.
          </Alert>
        );

      case 2: // Review and download step
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

            {/* Display any errors that occurred */}
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
                <TransactionComparison
                  originalTx={transaction}
                  result={result}
                />

                <Box sx={{ mt: 3, textAlign: "center" }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleDownloadPSBT}
                    size="large"
                    sx={{ mb: 2 }}
                  >
                    Download PSBT
                  </Button>

                  {downloadClicked && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                      <AlertTitle>PSBT Downloaded Successfully</AlertTitle>
                      <Typography variant="body2">
                        You can now sign the transaction using your hardware
                        wallet or upload it to the Sign tab.
                      </Typography>
                    </Alert>
                  )}

                  <Box mt={3}>
                    <Alert severity="info">
                      <AlertTitle>Next Steps</AlertTitle>
                      <Typography variant="body2" component="div">
                        <ol style={{ paddingLeft: "1rem", margin: 0 }}>
                          <li>
                            Sign the PSBT using your hardware wallet or the Sign
                            tab
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

      default:
        return "Unknown step";
    }
  };

  const steps = getSteps();

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="acceleration-modal-title"
    >
      <DialogTitle id="acceleration-modal-title" sx={{ pb: 1 }}>
        {transaction ? (
          <>
            {/* Title changes based on the strategy */}
            {selectedStrategy === FeeBumpStrategy.RBF && activeStep > 0
              ? result?.isCancel
                ? "Cancel Transaction"
                : "Accelerate Transaction"
              : "Fee Bump Transaction"}

            {/* Display a shortened transaction ID for reference */}
            <Typography
              variant="caption"
              display="block"
              color="text.secondary"
            >
              Transaction ID: {transaction.txid.substring(0, 8)}...
              {transaction.txid.substring(transaction.txid.length - 8)}
            </Typography>
          </>
        ) : (
          "Fee Bump Transaction"
        )}
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent>
        {/* Stepper to show current progress in the wizard */}
        <Stepper activeStep={activeStep} sx={{ pt: 2, pb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Content changes based on the current step */}
        {getStepContent(activeStep)}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2 }}>
        {/* Back button */}
        <Button
          color="inherit"
          disabled={
            activeStep === 0 ||
            isCreatingRBF ||
            status === FeeBumpStatus.CREATING
          }
          onClick={handleBack}
        >
          Back
        </Button>

        <Box sx={{ flex: "1 1 auto" }} />

        {/* Next button (only on first step) */}
        {activeStep === 0 && (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={
              !recommendation ||
              status !== FeeBumpStatus.READY ||
              selectedStrategy === FeeBumpStrategy.NONE
            }
          >
            Next
          </Button>
        )}

        {/* Close button (only on last step) */}
        {activeStep === steps.length - 1 && (
          <Button color="primary" variant="contained" onClick={handleClose}>
            Close
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
