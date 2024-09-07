import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
} from "@mui/material";
import { usePsbtDetails } from "../../../../hooks";
import { ExtendedAnalyzer } from "components/types/fees";
import { useGetClient } from "../../../../hooks";
import { satoshisToBitcoins } from "@caravan/bitcoin";
import FeeComparison from "./components/FeeComparison";
import FeeRateAdjuster from "./components/FeeRateAdjuster";
import ChangeAddressSelector from "./components/ChangeAddressSelector";
import TransactionDetails from "./components/TransactionDetails";

interface CPFPDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (newFeeRate: number, customChangeAddress?: string) => void;
  createPsbt: (newFeeRate: number, customChangeAddress?: string) => string;
  transaction: ExtendedAnalyzer | null;
  currentNetworkFeeRate: number;
  isGeneratingPSBT: boolean;
  defaultChangeAddress: string;
}

const CPFPDialog: React.FC<CPFPDialogProps> = ({
  open,
  onClose,
  onConfirm,
  createPsbt,
  transaction,
  currentNetworkFeeRate,
  isGeneratingPSBT,
  defaultChangeAddress,
}) => {
  const [newFeeRate, setNewFeeRate] = useState(currentNetworkFeeRate);
  const [psbtHex, setPsbtHex] = useState<string | null>(null);
  const [previewPsbtHex, setPreviewPsbtHex] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parentTx, setParentTx] = useState<any>(null);
  const [useCustomAddress, setUseCustomAddress] = useState(false);
  const [customAddress, setCustomAddress] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [expandedParent, setExpandedParent] = useState(false);
  const [expandedChild, setExpandedChild] = useState(false);
  const blockchainClient = useGetClient();

  const {
    txTemplate: childTxTemplate,
    error: psbtError,
    calculateFee: calculateChildFee,
  } = usePsbtDetails(psbtHex!);

  const {
    txTemplate: previewChildTxTemplate,
    calculateFee: calculatePreviewChildFee,
  } = usePsbtDetails(previewPsbtHex!);

  useEffect(() => {
    if (open) {
      setNewFeeRate(currentNetworkFeeRate);
      setPsbtHex(null);
      setPreviewPsbtHex(null);
      setError(null);
      setParentTx(null);
      setUseCustomAddress(false);
      setCustomAddress("");
      setShowPreview(false);
    }
  }, [open, currentNetworkFeeRate]);

  const generatePsbt = useCallback(
    async (feeRate: number, preview: boolean = false) => {
      if (transaction) {
        try {
          const result = createPsbt(
            feeRate,
            useCustomAddress ? customAddress : undefined,
          );
          if (preview) {
            setPreviewPsbtHex(result);
          } else {
            setPsbtHex(result);
          }

          if (!parentTx) {
            const parentTxDetails = await blockchainClient.getTransaction(
              transaction.txId,
            );
            setParentTx(parentTxDetails);
          }
        } catch (err) {
          setError("Failed to generate PSBT. Please try again.");
          console.error(err);
        }
      }
    },
    [
      transaction,
      createPsbt,
      useCustomAddress,
      customAddress,
      blockchainClient,
      parentTx,
    ],
  );

  useEffect(() => {
    if (open && !isGeneratingPSBT) {
      generatePsbt(currentNetworkFeeRate);
    }
  }, [open, isGeneratingPSBT, generatePsbt, currentNetworkFeeRate]);

  const handlePreview = async () => {
    await generatePsbt(newFeeRate, true);
    setShowPreview(true);
  };

  if (isGeneratingPSBT || !psbtHex || !parentTx) {
    return (
      <Dialog open={open} onClose={onClose}>
        <DialogTitle>Preparing CPFP Transaction</DialogTitle>
        <DialogContent>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexDirection="column"
          >
            <CircularProgress />
            <Typography style={{ marginTop: 16 }}>
              Please wait while we prepare the CPFP transaction...
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  if (!childTxTemplate) {
    return (
      <Dialog open={open} onClose={onClose}>
        <DialogTitle>Error</DialogTitle>
        <DialogContent>
          <Alert severity="error">
            {error || psbtError || "Failed to load transaction details"}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  const parentFee = satoshisToBitcoins(parentTx.fee);
  const childFee = satoshisToBitcoins(calculateChildFee());
  const previewChildFee = showPreview
    ? satoshisToBitcoins(calculatePreviewChildFee())
    : childFee;
  const totalFee = (
    parseFloat(parentFee) + parseFloat(previewChildFee)
  ).toFixed(8);
  const parentSize = parentTx.size;
  const childSize = showPreview
    ? previewChildTxTemplate!.estimatedVsize
    : childTxTemplate.estimatedVsize;
  const combinedSize = parentSize + childSize;
  const combinedFeeRate = (
    (parseFloat(totalFee) / combinedSize) *
    100000000
  ).toFixed(2);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h5">Create CPFP Transaction</Typography>
        <Typography variant="subtitle1" color="textSecondary">
          Boost your transaction priority by creating a child transaction with a
          higher fee
        </Typography>
      </DialogTitle>
      <DialogContent>
        <FeeComparison
          parentFee={parentFee}
          childFee={previewChildFee}
          parentSize={parentSize}
          childSize={childSize}
          combinedFeeRate={combinedFeeRate}
        />

        <FeeRateAdjuster
          newFeeRate={newFeeRate}
          setNewFeeRate={setNewFeeRate}
          minFeeRate={parseFloat(childTxTemplate.estimatedFeeRate)}
          currentNetworkFeeRate={currentNetworkFeeRate}
        />

        <ChangeAddressSelector
          useCustomAddress={useCustomAddress}
          setUseCustomAddress={setUseCustomAddress}
          customAddress={customAddress}
          setCustomAddress={setCustomAddress}
          defaultChangeAddress={defaultChangeAddress}
        />

        <TransactionDetails
          title="Parent Transaction"
          tx={parentTx}
          expanded={expandedParent}
          setExpanded={setExpandedParent}
        />

        {showPreview && (
          <TransactionDetails
            title="Child Transaction (CPFP)"
            tx={previewChildTxTemplate || childTxTemplate}
            expanded={expandedChild}
            setExpanded={setExpandedChild}
          />
        )}

        <Box mt={2}>
          <Typography variant="body2" color="textSecondary">
            The child transaction will help accelerate the confirmation of the
            parent transaction by paying a higher fee rate for both transactions
            combined.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          color="secondary"
          variant="outlined"
          onClick={handlePreview}
          disabled={
            showPreview &&
            newFeeRate === parseFloat(previewChildTxTemplate!.estimatedFeeRate)
          }
        >
          {showPreview ? "Update Preview" : "Preview"}
        </Button>
        <Button
          color="primary"
          variant="contained"
          onClick={() =>
            onConfirm(newFeeRate, useCustomAddress ? customAddress : undefined)
          }
          disabled={newFeeRate <= parseFloat(childTxTemplate.estimatedFeeRate)}
        >
          Confirm CPFP Transaction
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CPFPDialog;
