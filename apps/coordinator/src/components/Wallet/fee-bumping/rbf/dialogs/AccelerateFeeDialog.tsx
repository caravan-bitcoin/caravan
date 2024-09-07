import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Paper,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { RBFDialogProps } from "../types";
import FeeComparisonBox from "../components/FeeComparisonBox";
import TransactionTable from "../components/TransactionTable";
import AdjustFeeRateSlider from "../components/AdjustFeeRateSlider";
import { usePsbtHook, calculateFees } from "../utils/psbtHelpers";

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  margin: theme.spacing(2, 0),
  backgroundColor: theme.palette.background.default,
}));

const AccelerateFeeDialog: React.FC<RBFDialogProps> = ({
  open,
  onClose,
  onConfirm,
  createPsbt,
  transaction,
  currentNetworkFeeRate,
  isGeneratingPSBT,
}) => {
  const [newFeeRate, setNewFeeRate] = useState(currentNetworkFeeRate);
  const [psbtHex, setPsbtHex] = useState<string | null>(null);
  const [previewPsbtHex, setPreviewPsbtHex] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rbfError, setRbfError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setNewFeeRate(currentNetworkFeeRate);
      setPsbtHex(null);
      setPreviewPsbtHex(null);
      setError(null);
      setRbfError(null);
    }
  }, [open, currentNetworkFeeRate]);

  useEffect(() => {
    const generatePsbt = async () => {
      if (open && !isGeneratingPSBT) {
        try {
          const result = createPsbt(currentNetworkFeeRate);
          setPsbtHex(result);
        } catch (err) {
          setError("Failed to generate initial PSBT. Please try again.");
          console.error(err);
        }
      }
    };

    generatePsbt();
  }, [open, isGeneratingPSBT, createPsbt, currentNetworkFeeRate]);

  const { txTemplate, error: psbtError } = usePsbtHook(psbtHex);
  const { txTemplate: previewTxTemplate, calculateFee: calculatePreviewFee } =
    usePsbtHook(previewPsbtHex);

  const handlePreviewTransaction = () => {
    try {
      const newPsbtHex = createPsbt(newFeeRate);
      setPreviewPsbtHex(newPsbtHex);
      setRbfError(null);
    } catch (err) {
      setRbfError(err instanceof Error ? err.message : String(err));
      setPreviewPsbtHex(null);
    }
  };

  if (isGeneratingPSBT || !psbtHex) {
    return (
      <Dialog open={open} onClose={onClose}>
        <DialogTitle>Generating PSBT</DialogTitle>
        <DialogContent>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexDirection="column"
          >
            <CircularProgress />
            <Typography style={{ marginTop: 16 }}>
              Please wait while we generate the PSBT...
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  if (!txTemplate) {
    return (
      <Dialog open={open} onClose={onClose}>
        <DialogTitle>Error</DialogTitle>
        <DialogContent>
          <Alert severity="error">
            {error || "Failed to load transaction details"}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  const { currentFees, newFees, additionalFees } = calculateFees(
    txTemplate,
    previewTxTemplate,
    calculatePreviewFee,
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h5">Accelerate Transaction</Typography>
        <Typography variant="subtitle1" color="textSecondary">
          Boost your transaction priority by increasing the fee
        </Typography>
      </DialogTitle>
      <DialogContent>
        <StyledPaper elevation={3}>
          <Typography variant="h6" gutterBottom>
            Fee Comparison
          </Typography>
          <FeeComparisonBox
            currentFees={currentFees}
            newFees={newFees}
            currentFeeRate={txTemplate.estimatedFeeRate}
            newFeeRate={newFeeRate}
            additionalFees={additionalFees}
          />
        </StyledPaper>

        <StyledPaper elevation={3}>
          <Typography variant="h6" gutterBottom>
            Adjust Fee Rate
          </Typography>
          <AdjustFeeRateSlider
            newFeeRate={newFeeRate}
            setNewFeeRate={setNewFeeRate}
            currentFeeRate={parseFloat(txTemplate.estimatedFeeRate)}
            currentNetworkFeeRate={currentNetworkFeeRate}
            handlePreviewTransaction={handlePreviewTransaction}
          />
        </StyledPaper>

        {rbfError && (
          <Alert severity="error" style={{ marginTop: 16 }}>
            {rbfError}
          </Alert>
        )}

        <TransactionTable
          title="Inputs"
          items={txTemplate.inputs}
          isInputs={true}
          template={previewTxTemplate || txTemplate}
        />
        <TransactionTable
          title="Outputs"
          items={txTemplate.outputs}
          isInputs={false}
          template={previewTxTemplate || txTemplate}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          color="primary"
          variant="contained"
          onClick={() => onConfirm(newFeeRate)}
          disabled={newFeeRate <= parseFloat(txTemplate.estimatedFeeRate)}
        >
          Confirm Acceleration
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AccelerateFeeDialog;
