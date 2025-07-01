import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { connect, useSelector } from "react-redux";
import BigNumber from "bignumber.js";
import { satoshisToBitcoins } from "@caravan/bitcoin";
import {
  Button,
  Box,
  Table,
  TableHead,
  TableBody,
  TableFooter,
  TableRow,
  TableCell,
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
import { setChangeOutputMultisig as setChangeOutputMultisigAction } from "../../actions/transactionActions";

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
    const {
      outputs,
      changeAddress,
      changeOutputIndex,
      changeNode,
      setChangeOutputMultisig,
    } = this.props;
    outputs.forEach((output) => {
      if (output.address === changeAddress) {
        setChangeOutputMultisig(changeOutputIndex, changeNode.multisig);
      }
    });
  }

  renderAddresses = () => {
    const addressWithUtxos = this.mapAddresses();
    return Object.keys(addressWithUtxos).map((address) => {
      return (
        <TableRow key={address}>
          <TableCell>
            <code>{address}</code>
          </TableCell>
          <TableCell>{addressWithUtxos[address].utxos.length}</TableCell>
          <TableCell>
            <code>{addressWithUtxos[address].amount.toFixed(8)}</code>
          </TableCell>
        </TableRow>
      );
    });
  };

  renderOutputAddresses = () => {
    const { changeAddress, outputs } = this.props;

    return outputs.map((output) => {
      return (
        <TableRow key={output.address}>
          <TableCell>
            <code>{output.address}</code>
            {output.address === changeAddress ? (
              <small>&nbsp;(change)</small>
            ) : (
              ""
            )}
          </TableCell>
          <TableCell>
            <code>{BigNumber(output.amount).toFixed(8)}</code>
          </TableCell>
        </TableRow>
      );
    });
  };

  renderOutputs = () => {
    return (
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Address</TableCell>
            <TableCell>Amount (BTC)</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>{this.renderOutputAddresses()}</TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>TOTAL:</TableCell>
            <TableCell>{this.outputsTotal()}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    );
  };

  renderInputs = () => {
    const { inputsTotalSats } = this.props;

    return (
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Address</TableCell>
            <TableCell>UTXO count</TableCell>
            <TableCell>Amount (BTC)</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>{this.renderAddresses()}</TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2}>TOTAL:</TableCell>
            <TableCell>{satoshisToBitcoins(inputsTotalSats)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    );
  };

  mapAddresses = () => {
    const { inputs } = this.props;
    return inputs.reduce((mapped, input) => {
      const mappedAddresses = mapped;
      const { confirmed, txid, index, amount } = input;

      mappedAddresses[input.multisig.address] = mapped[
        input.multisig.address
      ] || {
        amount: BigNumber(0),
        utxos: [],
      };
      mappedAddresses[input.multisig.address].utxos.push({
        confirmed,
        txid,
        index,
        amount,
      });
      mappedAddresses[input.multisig.address].amount = mapped[
        input.multisig.address
      ].amount.plus(BigNumber(input.amount));
      return mappedAddresses;
    }, {});
  };

  outputsTotal = () => {
    const { outputs } = this.props;
    return satoshisToBitcoins(
      outputs.reduce(
        (total, output) => total.plus(BigNumber(output.amountSats || 0)),
        BigNumber(0),
      ),
    );
  };

  handleDownloadPSBT = (psbtBase64) => {
    downloadFile(psbtBase64, "transaction.psbt");
  };

  render = () => {
    const {
      feeRate,
      fee,
      inputsTotalSats,
      editTransaction,
      handleSignTransaction,
      unsignedPSBT,
    } = this.props;

    return (
      <Box>
        <h2>Transaction Preview</h2>

        {/* Signature Status Section */}
        <SignatureStatus />
        <UnsignedTransaction />
        <h3>Inputs</h3>
        {this.renderInputs()}
        <h3>Outputs</h3>
        {this.renderOutputs()}
        <Grid container>
          <Grid item xs={4}>
            <h3>Fee</h3>
            <div>{BigNumber(fee).toFixed(8)} BTC </div>
          </Grid>
          <Grid item xs={4}>
            <h3>Fee Rate</h3>
            <div>{feeRate} sats/byte</div>
          </Grid>
          <Grid item xs={4}>
            <h3>Total</h3>
            <div>{satoshisToBitcoins(BigNumber(inputsTotalSats || 0))} BTC</div>
          </Grid>
        </Grid>
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
            <Grid item>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSignTransaction}
              >
                Sign Transaction
              </Button>
            </Grid>
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
  };
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
  inputs: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  inputsTotalSats: PropTypes.shape({}).isRequired,
  outputs: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  handleSignTransaction: PropTypes.func.isRequired,
  setChangeOutputMultisig: PropTypes.func.isRequired,
  unsignedPSBT: PropTypes.string.isRequired,
  signatureImporters: PropTypes.shape({}),
  requiredSigners: PropTypes.number,
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
  };
}

const mapDispatchToProps = {
  setChangeOutputMultisig: setChangeOutputMultisigAction,
};

export default connect(mapStateToProps, mapDispatchToProps)(TransactionPreview);
