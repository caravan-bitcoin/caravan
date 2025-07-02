import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Step,
  StepLabel,
  Stepper,
  Typography,
  FormControl,
  Radio,
  RadioGroup,
  FormControlLabel,
  AlertTitle,
  Alert,
  Collapse,
} from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import CloseIcon from "@mui/icons-material/Close";
import { FeeBumpStrategy } from "@caravan/fees";

import { FeeBumpStatus, FeePriority } from "../types";
import { downloadFile } from "../../../../../utils";
import { useFeeBumpState, useFeeBumpContext } from "../context";
import { Transaction } from "../../types";
import {
  StrategySelectionStep,
  ConfigurationStep,
  ReviewStep,
} from "./FeeBumpSteps";

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
  transaction: Transaction; // The transaction to accelerate
  txHex?: string; // Raw transaction hex (optional, will be fetched if not provided)
}

// Type for Step configuration with metadata
interface StepConfig {
  label: string;
  component: React.ComponentType<any>;
  props?: Record<string, any>;
}

export const AccelerationModal: React.FC<AccelerationModalProps> = ({
  open,
  onClose,
  transaction,
  txHex,
}) => {
  // Get state from Redux instead of props
  const {
    status,
    recommendation,
    selectedStrategy,
    error,
    result,
    psbtVersion: selectedPsbtVersion,
  } = useFeeBumpState();
  const {
    setTransactionForBumping,
    reset,
    createFeeBumpedTransaction,
    setPsbtVersion,
    isCreatingRBF,
  } = useFeeBumpContext();

  // Track the current step in the wizard
  const [activeStep, setActiveStep] = useState(0);

  // Track whether the PSBT has been downloaded
  const [downloadClicked, setDownloadClicked] = useState(false);
  const [showPSBTVersionDialog, setShowPSBTVersionDialog] = useState(false);
  //  Error display state
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  // Handle step navigation ( Memoizing step changes to prevent re-renders)
  const handleNext = useCallback(() => {
    setActiveStep((prevStep) => prevStep + 1);
  }, []);

  const handleBack = useCallback(() => {
    setActiveStep((prevStep) => prevStep - 1);
  }, []);

  // Handle form submission
  const handleSubmitRBF = async (options: {
    isCancel: boolean;
    cancelAddress?: string;
    changeAddress?: string;
  }) => {
    try {
      // Create the fee-bumped transaction with the specified options
      await createFeeBumpedTransaction(options);
      handleNext(); // Move to the next step when done
    } catch (err) {
      // Error is already handled by the context and stored in state.error
      console.error("Error creating fee-bumped transaction:", err);
      // Error will be displayed in the UI automatically
    }
  };

  // Handle PSBT download
  const handleDownloadPSBT = useCallback(() => {
    setShowPSBTVersionDialog(true);
  }, []);

  const handleConfirmDownload = useCallback(() => {
    if (result) {
      const priorityStr = result.priority.toLowerCase();
      const txTypeStr = result.isCancel ? "cancel" : "accelerated";
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .substring(0, 19);

      const versionStr = selectedPsbtVersion === "v2" ? "v2" : "v0";
      const filename = `${txTypeStr}_tx_${priorityStr}_${versionStr}_${timestamp}.psbt`;

      downloadFile(result.psbtBase64, filename);
      setDownloadClicked(true);
      setShowPSBTVersionDialog(false);
    }
  }, [result, selectedPsbtVersion]);

  // Handle modal close with confirmation if PSBT not downloaded
  const handleClose = useCallback(() => {
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
  }, [status, downloadClicked, onClose]);

  // Get the steps for the stepper
  const stepConfigs: StepConfig[] = useMemo(
    () => [
      {
        label: "Select Strategy",
        component: StrategySelectionStep,
      },
      {
        label: "Configure Transaction",
        component: ConfigurationStep,
        props: {
          transaction,
          onSubmit: handleSubmitRBF,
          isCreating: isCreatingRBF,
        },
      },
      {
        label: "Review and Download",
        component: ReviewStep,
        props: {
          transaction,
          onDownloadPSBT: handleDownloadPSBT,
          downloadClicked,
        },
      },
    ],
    [
      transaction,
      handleSubmitRBF,
      isCreatingRBF,
      handleDownloadPSBT,
      downloadClicked,
    ],
  );

  const CurrentStepComponent = stepConfigs[activeStep]?.component;
  const currentStepProps = stepConfigs[activeStep]?.props || {};

  // Title logic - moved outside the return statement , so no nested conditionals now :)
  const modalTitle = useMemo(() => {
    if (!transaction) return "Fee Bump Transaction";

    let title = "Fee Bump Transaction";

    if (selectedStrategy === FeeBumpStrategy.RBF && activeStep > 0) {
      if (result?.isCancel) {
        title = "Cancel Transaction";
      } else {
        title = "Accelerate Transaction";
      }
    }

    return title;
  }, [transaction, selectedStrategy, activeStep, result]);

  const transactionIdDisplay = useMemo(() => {
    if (!transaction) return "";

    return `${transaction.txid.substring(0, 8)}...${transaction.txid.substring(
      transaction.txid.length - 8,
    )}`;
  }, [transaction]);

  const buttonStates = useMemo(() => {
    const isCreating = isCreatingRBF || status === FeeBumpStatus.CREATING;
    const hasError = status === FeeBumpStatus.ERROR;
    return {
      backDisabled: activeStep === 0 || isCreating,
      nextDisabled:
        !recommendation ||
        status !== FeeBumpStatus.READY ||
        selectedStrategy === FeeBumpStrategy.NONE ||
        hasError,
      showNext: activeStep === 0,
      showClose: activeStep === stepConfigs.length - 1,
    };
  }, [
    activeStep,
    isCreatingRBF,
    status,
    recommendation,
    selectedStrategy,
    stepConfigs.length,
  ]);

  // Initialize the transaction for fee bumping when the modal opens
  useEffect(() => {
    let isMounted = true;

    async function initializeTransaction() {
      if (open && transaction && isMounted) {
        await setTransactionForBumping(transaction, FeePriority.MEDIUM, txHex);
        if (isMounted) {
          setActiveStep(0);
          setDownloadClicked(false);
          setShowErrorDetails(false);
        }
      }
    }

    if (open && transaction) {
      initializeTransaction();
    } else if (!open) {
      // Reset the fee bumping state when the modal closes
      reset();
    }
    return () => {
      isMounted = false;
    };
  }, [open, transaction, txHex, setTransactionForBumping, reset]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="acceleration-modal-title"
    >
      <DialogTitle id="acceleration-modal-title" sx={{ pb: 1 }}>
        {modalTitle}

        {transaction && (
          <Typography variant="caption" display="block" color="text.secondary">
            Transaction ID: {transactionIdDisplay}
          </Typography>
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
        {error && (
          <Alert
            severity="error"
            sx={{ mb: 3 }}
            action={
              <IconButton
                aria-label="toggle error details"
                size="small"
                onClick={() => setShowErrorDetails(!showErrorDetails)}
              >
                {showErrorDetails ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            }
          >
            <AlertTitle>Error Processing Transaction</AlertTitle>
            {error}

            <Collapse in={showErrorDetails}>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  If this error persists, please:
                </Typography>
                <ul style={{ margin: "8px 0", paddingLeft: "20px" }}>
                  <li>
                    <Typography variant="body2" color="text.secondary">
                      Check your internet connection and try again
                    </Typography>
                  </li>
                  <li>
                    <Typography variant="body2" color="text.secondary">
                      Ensure the transaction is still unconfirmed
                    </Typography>
                  </li>
                  <li>
                    <Typography variant="body2" color="text.secondary">
                      Verify you have sufficient UTXOs for fee bumping
                    </Typography>
                  </li>
                  <li>
                    <Typography variant="body2" color="text.secondary">
                      Contact support if the issue continues
                    </Typography>
                  </li>
                </ul>
              </Box>
            </Collapse>
          </Alert>
        )}
        {/* Stepper to show current progress in the wizard */}
        <Stepper activeStep={activeStep} sx={{ pt: 2, pb: 4 }}>
          {stepConfigs.map(({ label }) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Content changes based on the current step */}
        {CurrentStepComponent && <CurrentStepComponent {...currentStepProps} />}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2 }}>
        {/* Back button */}
        <Button
          color="inherit"
          disabled={buttonStates.backDisabled}
          onClick={handleBack}
        >
          Back
        </Button>

        <Box sx={{ flex: "1 1 auto" }} />
        {error && activeStep > 0 && (
          <Button
            color="secondary"
            variant="outlined"
            onClick={() => {
              // Reset to previous step to retry
              setActiveStep(Math.max(0, activeStep - 1));
            }}
            sx={{ mr: 1 }}
          >
            Retry
          </Button>
        )}
        {/* Next button (only on first step) */}
        {activeStep === 0 && (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={buttonStates.nextDisabled}
          >
            Next
          </Button>
        )}

        {/* Close button (only on last step) */}
        {buttonStates.showClose && (
          <Button color="primary" variant="contained" onClick={handleClose}>
            Close
          </Button>
        )}
      </DialogActions>
      {/* PSBT Version Selection Dialog */}
      <Dialog
        open={showPSBTVersionDialog}
        onClose={() => setShowPSBTVersionDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Choose PSBT Version</DialogTitle>
        <DialogContent>
          <FormControl component="fieldset" sx={{ mt: 1 }}>
            <RadioGroup
              value={selectedPsbtVersion}
              onChange={(e) => setPsbtVersion(e.target.value as "v2" | "v0")}
            >
              <FormControlLabel
                value="v2"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1">
                      PSBT v2 (Recommended)
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Latest format with better hardware wallet support
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="v0"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1">PSBT v0 (Legacy)</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Compatible with older wallets and tools
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPSBTVersionDialog(false)}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleConfirmDownload}>
            Download PSBT
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};
