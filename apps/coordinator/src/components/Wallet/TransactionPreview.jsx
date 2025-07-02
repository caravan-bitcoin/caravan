// src/components/TransactionPreview/TransactionPreview.jsx
import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import BigNumber from "bignumber.js";
import { satoshisToBitcoins } from "@caravan/bitcoin";
import {
  Table,
  TableHead,
  TableBody,
  TableFooter,
  TableRow,
  TableCell,
  Grid,
  Box,
  Typography,
  Button,
  Paper,
  Chip,
  Alert,
  AlertTitle,
} from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import UnsignedTransaction from "../UnsignedTransaction";
import { TransactionAnalysis } from "./TransactionAnalysis";
import { downloadFile } from "../../utils";

class TransactionPreview extends React.Component {
  // Group UTXOs by address
  mapAddresses() {
    const { inputs } = this.props;
    return inputs.reduce((mapped, input) => {
      const addr = input.multisig.address;
      if (!mapped[addr]) {
        mapped[addr] = { amount: new BigNumber(0), utxos: [] };
      }
      mapped[addr].utxos.push(input);
      mapped[addr].amount = mapped[addr].amount.plus(
        new BigNumber(input.amountSats || 0),
      );
      return mapped;
    }, {});
  }

  renderAddresses() {
    const addressWithUtxos = this.mapAddresses();
    return Object.entries(addressWithUtxos).map(
      ([address, { utxos, amount }]) => (
        <TableRow key={address}>
          <TableCell>
            <code>{address}</code>
          </TableCell>
          <TableCell>{utxos.length}</TableCell>
          <TableCell>
            <code>{amount.toFixed(8)}</code>
          </TableCell>
        </TableRow>
      ),
    );
  }

  renderInputs() {
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
  }

  renderOutputAddresses() {
    const { outputs, changeAddress } = this.props;
    return outputs.map((output) => (
      <TableRow key={output.address}>
        <TableCell>
          <code>{output.address}</code>
          {output.address === changeAddress && <small>&nbsp;(change)</small>}
        </TableCell>
        <TableCell>
          <code>{new BigNumber(output.amountSats || 0).toFixed(8)}</code>
        </TableCell>
      </TableRow>
    ));
  }

  renderOutputs() {
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
  }

  outputsTotal() {
    const { outputs } = this.props;
    return satoshisToBitcoins(
      outputs.reduce(
        (sum, o) => sum.plus(new BigNumber(o.amountSats || 0)),
        new BigNumber(0),
      ),
    );
  }

  handleDownloadPSBT(psbtBase64) {
    downloadFile(psbtBase64, "transaction.psbt");
  }

  render() {
    const {
      fee,
      feeRate,
      inputsTotalSats,
      editTransaction,
      handleSignTransaction,
      unsignedPSBT,

      // signature status props
      signatureImporters,
      requiredSigners,
    } = this.props;

    // ——— derive signature state ———
    const sigs = signatureImporters || {};
    const signedCount = Object.values(sigs).filter(
      (imp) => imp.finalized && imp.signature && imp.signature.length > 0,
    ).length;
    const required = requiredSigners || 0;
    const isFullySigned = signedCount >= required;
    const hasPartial = signedCount > 0 && signedCount < required;
    const needs = Math.max(0, required - signedCount);

    return (
      <Box p={2}>
        <Typography variant="h4" gutterBottom>
          Transaction Preview
        </Typography>

        {/* ——— Signature Status Panel ——— */}
        {signedCount > 0 && (
          <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
            <Box display="flex" alignItems="center" mb={1}>
              {isFullySigned ? (
                <CheckCircleIcon color="success" sx={{ mr: 1 }} />
              ) : (
                <WarningIcon color="warning" sx={{ mr: 1 }} />
              )}
              <Typography variant="h6">Signature Status</Typography>
            </Box>

            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Chip
                label={`${signedCount} of ${required} signatures`}
                color={
                  isFullySigned ? "success" : hasPartial ? "warning" : "default"
                }
                variant={isFullySigned ? "filled" : "outlined"}
              />
              {isFullySigned && (
                <Chip label="Fully signed" color="success" size="small" />
              )}
              {hasPartial && (
                <Chip label="Partially signed" color="warning" size="small" />
              )}
            </Box>

            {hasPartial && (
              <Alert severity="info" sx={{ mb: 1 }}>
                <AlertTitle>Partial signatures detected</AlertTitle>
                This transaction has {signedCount} of {required} signatures. You
                need {needs} more.
              </Alert>
            )}

            {isFullySigned && (
              <Alert severity="success" sx={{ mb: 1 }}>
                <AlertTitle>Transaction ready</AlertTitle>
                All {required} required signatures are in place.
              </Alert>
            )}

            {signedCount > 0 && (
              <Alert severity="warning" icon={<EditIcon />}>
                <AlertTitle>Editing will clear signatures</AlertTitle>
                If you edit inputs, outputs, or fee, existing signatures will be
                reset.
              </Alert>
            )}
          </Paper>
        )}

        {/* ——— Raw PSBT & Inputs/Outputs ——— */}
        <UnsignedTransaction />

        <Typography variant="h6" gutterBottom mt={3}>
          Inputs
        </Typography>
        {this.renderInputs()}

        <Typography variant="h6" gutterBottom mt={3}>
          Outputs
        </Typography>
        {this.renderOutputs()}

        {/* ——— Summary ——— */}
        <Grid container spacing={2} mt={2}>
          <Grid item xs={4}>
            <Typography variant="subtitle1">Fee</Typography>
            <Typography>{new BigNumber(fee).toFixed(8)}BTC</Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="subtitle1">Fee Rate</Typography>
            <Typography>{feeRate}sats/vB</Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="subtitle1">Total</Typography>
            <Typography>{satoshisToBitcoins(inputsTotalSats)}BTC</Typography>
          </Grid>
        </Grid>

        {/* ——— Transaction Analysis ——— */}
        <Box mt={4}>
          <TransactionAnalysis defaultExpanded />
        </Box>

        {/* ——— Actions ——— */}
        <Box mt={4}>
          <Grid container spacing={2}>
            <Grid item>
              <Button variant="contained" onClick={editTransaction}>
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
  }
}

TransactionPreview.propTypes = {
  inputs: PropTypes.arrayOf(
    PropTypes.shape({
      multisig: PropTypes.shape({ address: PropTypes.string.isRequired })
        .isRequired,
      amountSats: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
  ).isRequired,
  inputsTotalSats: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    .isRequired,
  outputs: PropTypes.arrayOf(
    PropTypes.shape({
      address: PropTypes.string.isRequired,
      amountSats: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
  ).isRequired,
  changeAddress: PropTypes.string.isRequired,
  fee: PropTypes.string.isRequired,
  feeRate: PropTypes.string.isRequired,
  unsignedPSBT: PropTypes.string,
  editTransaction: PropTypes.func.isRequired,
  handleSignTransaction: PropTypes.func.isRequired,

  // signature status
  signatureImporters: PropTypes.object,
  requiredSigners: PropTypes.number,
};

const mapStateToProps = (state) => ({
  inputs: state.spend.transaction.inputs,
  inputsTotalSats: Number(state.spend.transaction.inputsTotalSats),
  outputs: state.spend.transaction.outputs,
  changeAddress: state.spend.transaction.changeAddress,
  fee: state.spend.transaction.fee,
  feeRate: state.spend.transaction.feeRate,
  unsignedPSBT: state.spend.transaction.unsignedPSBT,

  signatureImporters: state.spend.signatureImporters,
  requiredSigners: state.settings.requiredSigners,
});

export default connect(mapStateToProps)(TransactionPreview);
