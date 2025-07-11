import React, { useEffect, useCallback, useMemo } from "react";
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
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { FeeBumpStrategy } from "@caravan/fees";

import { downloadFile } from "../../../../../utils";
import { Transaction } from "../../types";
import { ConfigurationStep, StrategySelectionStep } from "./FeeBumpSteps";
import { ErrorDialog } from "./ErrorDialog";

import {
  AccelerationModalProvider,
  useAccelerationModal,
} from "./AccelerationModalContext";
import { useAnalyzeTransaction } from "./hooks";

/**
 * Modal for transaction acceleration and fee bumping
 *
 * This component provides a wizard-like interface for users to:
 * 1. Choose a fee-bumping strategy (RBF or CPFP)
 * 2. Configure the transaction details (fee rate, addresses)
 * 3. Review and download the resulting PSBT
 *
 * It integrates with the FeeBumping Context to handle the actual fee-bumping logic.
 */
interface AccelerationModalProps {
  open: boolean;
  onClose: () => void;
  transaction: Transaction; // The transaction to accelerate
  txHex: string; // Raw transaction hex
}

// Type for Step configuration with metadata
interface StepConfig {
  label: string;
  component: React.ComponentType<any>;
  props?: Record<string, any>;
}

// Wrapper component that provides the context
// Move step configs outside component to prevent recreation
const STEP_CONFIGS = [
  {
    label: "Select Strategy",
    component: StrategySelectionStep,
  },
  {
    label: "Configure Transaction",
    // component: ConfigurationStep,
    component: () => <div>ConfigurationStep</div>,
  },
  // {
  //   label: "Review and Download",
  //   component: ReviewStep,
  // },
];

const AccelerationModalWithContext: React.FC<AccelerationModalProps> = ({
  open,
  onClose,
  transaction,
  txHex,
}) => {
  return (
    <AccelerationModalProvider
      totalSteps={STEP_CONFIGS.length}
      transaction={transaction}
      txHex={txHex}
      canProceed={true} // TODO: Add logic here to determine if user can proceed
    >
      <AccelerationModalContent
        open={open}
        onClose={onClose}
        transaction={transaction}
        txHex={txHex}
        stepConfigs={STEP_CONFIGS}
      />
    </AccelerationModalProvider>
  );
};

// Export the wrapper component as the main component
export const AccelerationModal = AccelerationModalWithContext;

// Main component that uses the context
const AccelerationModalContent: React.FC<
  AccelerationModalProps & {
    stepConfigs: StepConfig[];
  }
> = ({ open, onClose, stepConfigs }) => {
  const {
    state: {
      activeStep,
      downloadClicked,
      showPSBTVersionDialog,
      showErrorDetails,
      selectedPsbtVersion,
    },
    nextStep,
    previousStep,
    setDownloadClicked,
    setPSBTVersionDialog,
    setErrorDetails,
    setPSBTVersion,
    resetWizard,
    isLastStep,
    canGoNext,
    canGoBack,
    transaction,
    txHex,
  } = useAccelerationModal();

  const { isLoading, isError } = useAnalyzeTransaction(transaction, txHex);

  const handleConfirmDownload = useCallback(() => {
    // TODO: Replace with actual result from fee bump context
    // For now, we'll create a placeholder result
    const mockResult = {
      priority: "medium",
      isCancel: false,
      psbtBase64: "placeholder",
    };

    const priorityStr = mockResult.priority.toLowerCase();
    const txTypeStr = mockResult.isCancel ? "cancel" : "accelerated";
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .substring(0, 19);

    const versionStr = selectedPsbtVersion === "v2" ? "v2" : "v0";
    const filename = `${txTypeStr}_tx_${priorityStr}_${versionStr}_${timestamp}.psbt`;

    downloadFile(mockResult.psbtBase64, filename);
    setDownloadClicked(true);
    setPSBTVersionDialog(false);
  }, [selectedPsbtVersion, setDownloadClicked, setPSBTVersionDialog]);

  // Handle modal close with confirmation if PSBT not downloaded
  const handleClose = useCallback(() => {
    if (!downloadClicked) {
      // Warn the user if they try to close without downloading the PSBT
      const confirm = window.confirm(
        "You haven't downloaded the fee-bumped transaction. Are you sure you want to close?",
      );
      if (!confirm) {
        return;
      }
    }
    onClose();
  }, [downloadClicked, onClose]);

  const CurrentStepComponent = stepConfigs[activeStep]?.component;
  const currentStepProps = stepConfigs[activeStep]?.props || {};

  const modalTitle = useMemo(() => {
    if (!transaction) return "Fee Bump Transaction";

    let title = "Fee Bump Transaction";

    // TODO: Replace with actual strategy and result from fee bump context
    const mockStrategy = FeeBumpStrategy.RBF;
    const mockResult = { isCancel: false };

    if (mockStrategy === FeeBumpStrategy.RBF && activeStep > 0) {
      if (mockResult?.isCancel) {
        title = "Cancel Transaction";
      } else {
        title = "Accelerate Transaction";
      }
    }

    return title;
  }, [transaction, activeStep]);

  const transactionIdDisplay = useMemo(() => {
    if (!transaction) return "";

    return `${transaction.txid.substring(0, 8)}...${transaction.txid.substring(
      transaction.txid.length - 8,
    )}`;
  }, [transaction]);

  // Initialize the wizard when the modal opens
  useEffect(() => {
    if (open && transaction) {
      resetWizard();
    }
  }, [open, transaction, resetWizard]);

  const Content = () => {
    if (isLoading || !CurrentStepComponent) {
      return (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight={200}
        >
          <CircularProgress />
        </Box>
      );
    }
    if (isError) {
      return (
        <ErrorDialog
          error="Failed to load available UTXOs"
          showErrorDetails={showErrorDetails}
          setShowErrorDetails={setErrorDetails}
        />
      );
    }
    return (
      <CurrentStepComponent key={`step-${activeStep}`} {...currentStepProps} />
    );
  };

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
        {/* Stepper to show current progress in the wizard */}
        <Stepper activeStep={activeStep} sx={{ pt: 2, pb: 4 }}>
          {stepConfigs.map(({ label }) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Content />
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2 }}>
        {/* Back button */}
        <Button color="inherit" disabled={!canGoBack} onClick={previousStep}>
          Back
        </Button>

        <Box sx={{ flex: "1 1 auto" }} />
        {/* Next button (only on first step) */}
        {activeStep === 0 && (
          <Button variant="contained" onClick={nextStep} disabled={!canGoNext}>
            Next
          </Button>
        )}

        {/* Close button (only on last step) */}
        {isLastStep && (
          <Button color="primary" variant="contained" onClick={handleClose}>
            Close
          </Button>
        )}
      </DialogActions>
      {/* PSBT Version Selection Dialog */}
      <Dialog
        open={showPSBTVersionDialog}
        onClose={() => setPSBTVersionDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Choose PSBT Version</DialogTitle>
        <DialogContent>
          <FormControl component="fieldset" sx={{ mt: 1 }}>
            <RadioGroup
              value={selectedPsbtVersion}
              onChange={(e) => setPSBTVersion(e.target.value as "v2" | "v0")}
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
          <Button onClick={() => setPSBTVersionDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleConfirmDownload}>
            Download PSBT
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};
