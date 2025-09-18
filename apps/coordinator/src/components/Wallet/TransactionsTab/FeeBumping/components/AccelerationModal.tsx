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
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { FeeBumpStrategy } from "@caravan/fees";

import { Transaction } from "../../types";
import {
  ConfigurationStep,
  StrategySelectionStep,
  ReviewStep,
} from "./FeeBumpSteps";
import { ErrorDialog } from "./ErrorDialog";

import {
  AccelerationModalProvider,
  useAccelerationModal,
} from "./AccelerationModalContext";
import { TransactionDetails } from "@caravan/clients";

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
    component: ConfigurationStep,
  },
  {
    label: "Review and Download",
    component: ReviewStep,
  },
];

const AccelerationModalWithContext: React.FC<AccelerationModalProps> = ({
  open,
  onClose,
  transaction,
  txHex,
}) => {
  return (
    <AccelerationModalProvider
      transaction={transaction as TransactionDetails}
      txHex={txHex}
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
      showErrorDetails,
      selectedStrategy,
      feeBumpResult,
    },
    nextStep,
    previousStep,
    setErrorDetails, // can probably be removed
    resetWizard,
    transaction,
    analysisIsLoading,
    analysisError,
  } = useAccelerationModal();

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

    if (selectedStrategy === FeeBumpStrategy.RBF && activeStep > 0) {
      if (feeBumpResult?.isCancel) {
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

  // Check if we're on the last step (ReviewStep)
  const isLastStep = useMemo(() => {
    return activeStep >= stepConfigs.length - 1;
  }, [activeStep, stepConfigs.length]);

  // Check if we're on the first step
  const isFirstStep = useMemo(() => {
    return activeStep === 0;
  }, [activeStep]);

  // Check if we're on the configuration step
  const isConfigurationStep = useMemo(() => {
    return activeStep === 1;
  }, [activeStep]);

  // Initialize the wizard when the modal opens
  useEffect(() => {
    if (open && transaction) {
      resetWizard();
    }
  }, [open, transaction, resetWizard]);

  const Content = () => {
    if (analysisIsLoading || !CurrentStepComponent) {
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
    if (analysisError) {
      return (
        <ErrorDialog
          error={
            analysisError ? analysisError : "Failed to load available UTXOs"
          }
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
        <Button color="inherit" onClick={previousStep} disabled={isFirstStep}>
          Back
        </Button>

        <Box sx={{ flex: "1 1 auto" }} />

        {/* Next button - disabled/hidden on last step */}
        {!isLastStep && !isConfigurationStep && (
          <Button
            variant="contained"
            onClick={nextStep}
            disabled={activeStep === 0 && !selectedStrategy}
          >
            Next
          </Button>
        )}

        {/* We show a different button on the last step */}
        {isLastStep && (
          <Button variant="outlined" onClick={handleClose} color="primary">
            Close
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
