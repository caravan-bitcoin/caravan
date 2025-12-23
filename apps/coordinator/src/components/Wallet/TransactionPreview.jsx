import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { connect, useSelector } from "react-redux";
import {
  Button,
  Box,
  Grid,
  Alert,
  AlertTitle,
  Chip,
  Typography,
  Paper,
} from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import { downloadFile } from "../../utils";
import UnsignedTransaction from "../UnsignedTransaction";
import {
  finalizeOutputs as finalizeOutputsAction,
  setChangeOutputMultisig as setChangeOutputMultisigAction,
  SPEND_STEP_PREVIEW,
} from "../../actions/transactionActions";
import FingerprintingAnalysis from "../FingerprintingAnalysis";
import { TransactionAnalysis } from "./TransactionAnalysis";
import TransactionFlowDiagram from "./TransactionFlowDiagram";

/**
 * Custom hook to get current signing state
 * @returns {Object} { signedCount, requiredSigners, isFullySigned, hasPartialSignatures, needsSignatures }
 */
export const useSigningState = () => {
  // Get signature data from Redux store
  const signatureImporters = useSelector(
    (state) => state.spend.signatureImporters,
  );
  const requiredSigners = useSelector(
    (state) => state.settings.requiredSigners,
  );

  /**
   * Calculate current signature status
   * Only recalculates when signatureImporters or requiredSigners change
   */
  const signingState = useMemo(() => {
    if (!signatureImporters) {
      return {
        signedCount: 0,
        requiredSigners: requiredSigners || 0,
        isFullySigned: false,
        hasPartialSignatures: false,
        needsSignatures: requiredSigners || 0,
      };
    }

    // Count signature importers that have finalized signatures
    const signedCount = Object.values(signatureImporters).filter(
      (importer) =>
        importer.finalized &&
        importer.signature &&
        importer.signature.length > 0,
    ).length;

    const effectiveRequiredSigners = requiredSigners || 0;
    const isFullySigned = signedCount >= effectiveRequiredSigners;
    const hasPartialSignatures =
      signedCount > 0 && signedCount < effectiveRequiredSigners;
    const needsSignatures = Math.max(0, effectiveRequiredSigners - signedCount);

    return {
      signedCount,
      requiredSigners: effectiveRequiredSigners,
      isFullySigned,
      hasPartialSignatures,
      needsSignatures,
    };
  }, [signatureImporters, requiredSigners]);

  return signingState;
};

const SignatureStatus = () => {
  const {
    signedCount,
    requiredSigners,
    isFullySigned,
    hasPartialSignatures,
    needsSignatures,
  } = useSigningState();

  // We don't render anything if no signatures are present
  if (signedCount === 0) {
    return null;
  }

  return (
    <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
      <Box display="flex" alignItems="center" mb={1}>
        {isFullySigned ? (
          <CheckCircleIcon color="success" sx={{ mr: 1 }} />
        ) : (
          <WarningIcon color="warning" sx={{ mr: 1 }} />
        )}
        <Typography variant="h6" component="div">
          Signature Status
        </Typography>
      </Box>

      {/* Status chips */}
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <Chip
          label={`${signedCount} of ${requiredSigners} signatures`}
          color={
            isFullySigned
              ? "success"
              : hasPartialSignatures
                ? "warning"
                : "default"
          }
          variant={isFullySigned ? "filled" : "outlined"}
        />
        {isFullySigned && (
          <Chip label="Fully signed" color="success" size="small" />
        )}
        {hasPartialSignatures && (
          <Chip label="Partially signed" color="warning" size="small" />
        )}
      </Box>

      {/* Status-specific alerts */}
      {hasPartialSignatures && (
        <Alert severity="info" sx={{ mb: 1 }}>
          <AlertTitle>Partial signatures detected</AlertTitle>
          This transaction has {signedCount} out of {requiredSigners} required
          signatures. You need {needsSignatures} more signature
          {needsSignatures > 1 ? "s" : ""} to broadcast.
        </Alert>
      )}

      {isFullySigned && (
        <Alert severity="success" sx={{ mb: 1 }}>
          <AlertTitle>Transaction ready</AlertTitle>
          This transaction has all {requiredSigners} required signatures and is
          ready to broadcast.
        </Alert>
      )}

      {/* Warning about editing clearing signatures */}
      {signedCount > 0 && (
        <Alert severity="warning" icon={<EditIcon />}>
          <AlertTitle>Important: Editing will clear signatures</AlertTitle>
          If you edit this transaction (inputs, outputs, or fee), all existing
          signatures will be cleared and you&apos;ll need to collect signatures
          again from all signers.
        </Alert>
      )}
    </Paper>
  );
};

class TransactionPreview extends React.Component {
  componentDidMount() {
    // Set up change output multisig details when component loads
    const {
      outputs,
      changeAddress,
      changeOutputIndex,
      changeNode,
      finalizeOutputs,
      setChangeOutputMultisig,
    } = this.props;

    outputs.forEach((output) => {
      if (output.address === changeAddress) {
        setChangeOutputMultisig(changeOutputIndex, changeNode.multisig);
        finalizeOutputs(true);
      }
    });
  }

  handleDownloadPSBT(psbtData) {
    downloadFile(psbtData, "transaction.psbt");
  }

  render() {
    const {
      fee,
      inputsTotalSats,
      editTransaction,
      handleSignTransaction,
      unsignedPSBT,
      inputs,
      outputs,
      signatureImporters,
      requiredSigners,
      broadcasting,
      txid,
      spendingStep,
    } = this.props;

    return (
      <Box>
        <FingerprintingAnalysis />

        <h2>Transaction Preview</h2>

        {/* Signature Status Section */}
        <SignatureStatus />

        {/* Transaction Flow Diagram - Comprehensive View */}
        <Box mb={4}>
          {(() => {
            // derive signing/broadcast status without React hooks (class component)
            const rs = requiredSigners || 0;
            const signedCount = signatureImporters
              ? Object.values(signatureImporters).filter(
                  (importer) =>
                    importer &&
                    importer.finalized &&
                    importer.signature &&
                    importer.signature.length > 0,
                ).length
              : 0;
            const isFullySigned = signedCount >= rs && rs > 0;
            const hasPartial = signedCount > 0 && signedCount < rs;

            if (broadcasting) {
              this._flowStatus = "broadcast-pending";
            } else if (txid && txid.length > 0) {
              this._flowStatus = "unconfirmed";
            } else {
              this._flowStatus = isFullySigned
                ? "ready"
                : hasPartial
                  ? "partial"
                  : "draft";
            }
            return null;
          })()}
          <TransactionFlowDiagram
            inputs={inputs || []}
            outputs={outputs || []}
            fee={fee}
            changeAddress={this.props.changeAddress}
            inputsTotalSats={inputsTotalSats}
            network={this.props.network}
            status={this._flowStatus}
          />
        </Box>

        <UnsignedTransaction />

        <Box mt={2}>
          <TransactionAnalysis />
        </Box>
        <Box mt={2}>
          <Grid container spacing={2}>
            <Grid item>
              <Button
                variant="contained"
                onClick={(e) => {
                  e.preventDefault();
                  editTransaction();
                }}
              >
                Edit Transaction
              </Button>
            </Grid>
            {spendingStep === SPEND_STEP_PREVIEW && (
              <Grid item>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSignTransaction}
                >
                  Sign Transaction
                </Button>
              </Grid>
            )}
            {unsignedPSBT && (
              <Grid item>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => this.handleDownloadPSBT(unsignedPSBT)}
                >
                  Download Unsigned PSBT
                </Button>
              </Grid>
            )}
          </Grid>
        </Box>
      </Box>
    );
  }
}

TransactionPreview.propTypes = {
  changeAddress: PropTypes.string.isRequired,
  changeNode: PropTypes.shape({
    multisig: PropTypes.shape({}),
  }).isRequired,
  changeOutputIndex: PropTypes.number.isRequired,
  editTransaction: PropTypes.func.isRequired,
  fee: PropTypes.string.isRequired,
  feeRate: PropTypes.string.isRequired,
  finalizeOutputs: PropTypes.func.isRequired,
  inputs: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  inputsTotalSats: PropTypes.shape({}).isRequired,
  outputs: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  handleSignTransaction: PropTypes.func.isRequired,
  setChangeOutputMultisig: PropTypes.func.isRequired,
  unsignedPSBT: PropTypes.string.isRequired,
  signatureImporters: PropTypes.shape({}),
  broadcasting: PropTypes.bool,
  txid: PropTypes.string,
  spendingStep: PropTypes.number,
  network: PropTypes.string,
  addressType: PropTypes.string,
  requiredSigners: PropTypes.number,
  totalSigners: PropTypes.number,
  walletScriptType: PropTypes.string,
};

function mapStateToProps(state) {
  return {
    changeOutputIndex: state.spend.transaction.changeOutputIndex,
    network: state.settings.network,
    inputs: state.spend.transaction.inputs,
    outputs: state.spend.transaction.outputs,
    unsignedPSBT: state.spend.transaction.unsignedPSBT,
    signatureImporters: state.spend.signatureImporters,
    requiredSigners: state.settings.requiredSigners,
    addressType: state.settings.addressType,
    totalSigners: state.settings.totalSigners,
    txid: state.spend.transaction.txid,
    broadcasting: state.spend.transaction.broadcasting,
    spendingStep: state.spend.transaction.spendingStep,
  };
}

const mapDispatchToProps = {
  setChangeOutputMultisig: setChangeOutputMultisigAction,
  finalizeOutputs: finalizeOutputsAction,
};

export default connect(mapStateToProps, mapDispatchToProps)(TransactionPreview);
