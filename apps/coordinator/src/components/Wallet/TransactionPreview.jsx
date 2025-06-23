import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import BigNumber from "bignumber.js";
import { satoshisToBitcoins } from "@caravan/bitcoin";
import { WasteMetrics } from "@caravan/health";
import { getWalletConfig } from "../../selectors/wallet";
import InfoIcon from "@mui/icons-material/Info";
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
  Slider,
  Typography,
  Tooltip,
  IconButton,
} from "@mui/material";
import { downloadFile } from "../../utils";
import UnsignedTransaction from "../UnsignedTransaction";
import { setChangeOutputMultisig as setChangeOutputMultisigAction } from "../../actions/transactionActions";

class TransactionPreview extends React.Component {
  state = {
    longTermFeeEstimate: 101,
    wasteAmount: 0,
    changeOutputIndex: 0,
  };

  componentDidMount() {
    const {
      outputs,
      changeAddress,
      changeOutputIndex,
      changeNode,
      setChangeOutputMultisig,
    } = this.props;

    if (outputs && changeOutputIndex !== undefined) {
      outputs.forEach((output) => {
        if (output.address === changeAddress) {
          setChangeOutputMultisig(changeOutputIndex, changeNode.multisig);
        }
      });
    }

    this.calculateWaste(); // Initialize waste calculation
  }

  componentDidUpdate(prevProps, prevState) {
    if (
      prevProps.fee !== this.props.fee ||
      prevProps.feeRate !== this.props.feeRate ||
      prevProps.inputsTotalSats !== this.props.inputsTotalSats ||
      prevProps.outputs !== this.props.outputs ||
      prevState.longTermFeeEstimate !== this.state.longTermFeeEstimate
    ) {
      this.calculateWaste();
    }
  }

  calculateWaste = () => {
    const { feeRate, fee } = this.props;
    const { longTermFeeEstimate } = this.state;

    if (!fee || !feeRate || parseFloat(feeRate) === 0) return;

    const weight = fee / satoshisToBitcoins(feeRate);
    const walletConfig = this.props.walletConfig;

    // CORRECTED PARAMETER ORDER + NUMBER CONVERSION
    const rawWaste = new WasteMetrics().spendWasteAmount(
      weight,
      parseFloat(feeRate), // Ensure number
      {
        // config
        requiredSignerCount: walletConfig.quorum.requiredSigners,
        totalSignerCount: walletConfig.quorum.totalSigners,
      },
      walletConfig.addressType, // scriptType
      longTermFeeEstimate,
    );

    this.setState({ wasteAmount: rawWaste });
  };

  renderAddresses = () => {
    const addressWithUtxos = this.mapAddresses();
    return Object.keys(addressWithUtxos).map((address) => (
      <TableRow key={address}>
        <TableCell>
          <code>{address}</code>
        </TableCell>
        <TableCell>{addressWithUtxos[address].utxos.length}</TableCell>
        <TableCell>
          <code>{addressWithUtxos[address].amount.toFixed(8)}</code>
        </TableCell>
      </TableRow>
    ));
  };

  renderOutputAddresses = () => {
    const { changeAddress, outputs } = this.props;

    return outputs.map((output) => (
      <TableRow key={output.address}>
        <TableCell>
          <code>{output.address}</code>
          {output.address === changeAddress && <small>&nbsp;(change)</small>}
        </TableCell>
        <TableCell>
          <code>{BigNumber(output.amount).toFixed(8)}</code>
        </TableCell>
      </TableRow>
    ));
  };

  renderOutputs = () => (
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
      const { confirmed, txid, index, amount } = input;
      if (!mapped[input.multisig.address]) {
        mapped[input.multisig.address] = { amount: BigNumber(0), utxos: [] };
      }
      mapped[input.multisig.address].utxos.push({
        confirmed,
        txid,
        index,
        amount,
      });
      mapped[input.multisig.address].amount = mapped[
        input.multisig.address
      ].amount.plus(BigNumber(input.amount));
      return mapped;
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

  render() {
    const {
      feeRate,
      fee,
      inputsTotalSats,
      editTransaction,
      handleSignTransaction,
      unsignedPSBT,
    } = this.props;
    const { longTermFeeEstimate, wasteAmount } = this.state;

    return (
      <Box>
        <h2>Transaction Preview</h2>
        <UnsignedTransaction />
        <h3>Inputs</h3>
        {this.renderInputs()}
        <h3>Outputs</h3>
        {this.renderOutputs()}
        <Grid container spacing={2}>
          <Grid item xs={4}>
            <h3>Fee</h3>
            <div>{BigNumber(fee).toFixed(8)} BTC</div>
          </Grid>
          <Grid item xs={4}>
            <h3>Fee Rate</h3>
            <div>{feeRate} sats/byte</div>
          </Grid>
          <Grid item xs={4}>
            <h3>Total</h3>
            <div>{satoshisToBitcoins(inputsTotalSats)} BTC</div>
          </Grid>
        </Grid>
        {/* Spend Waste Amount Slider & Display */}
        <Box mt={4}>
          <h3>
            Waste Analysis
            <Tooltip title="Waste analysis calculates inefficiencies due to fees and UTXO consolidation.">
              <IconButton size="small" sx={{ ml: 1 }}>
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </h3>
          <Typography gutterBottom>
            Spend Waste Amount (SWA): {wasteAmount.toFixed(2)} sats
            <Tooltip title="SWA indicates whether it is economical to spend now or wait to consolidate later when fees could be low.">
              <IconButton size="small" sx={{ ml: 1 }}>
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Typography>
          <Slider
            value={longTermFeeEstimate}
            min={1}
            max={500}
            step={1}
            onChange={(e, v) => this.setState({ longTermFeeEstimate: v })}
            aria-labelledby="long-term-fee-estimate-slider"
          />
          <Typography id="long-term-fee-estimate-slider" gutterBottom>
            Long Term Fee Estimate (L): {longTermFeeEstimate} sats/vB
            <Tooltip title="L is a hypothetical future fee rate used to evaluate output viability (dust/waste).">
              <IconButton size="small" sx={{ ml: 1 }}>
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Typography>
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
      amount: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      amountSats: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      txid: PropTypes.string,
      index: PropTypes.number,
      confirmed: PropTypes.bool,
    }),
  ).isRequired,
  inputsTotalSats: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
    PropTypes.shape({ toNumber: PropTypes.func }),
  ]).isRequired,
  outputs: PropTypes.arrayOf(
    PropTypes.shape({
      address: PropTypes.string.isRequired,
      amount: PropTypes.string,
      amountSats: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
  ).isRequired,
  fee: PropTypes.string.isRequired,
  feeRate: PropTypes.string.isRequired,
  unsignedPSBT: PropTypes.string,
  changeAddress: PropTypes.string.isRequired,
  changeNode: PropTypes.shape({ multisig: PropTypes.object }).isRequired,
  changeOutputIndex: PropTypes.number,
  editTransaction: PropTypes.func.isRequired,
  handleSignTransaction: PropTypes.func.isRequired,
  setChangeOutputMultisig: PropTypes.func.isRequired,
  walletConfig: PropTypes.shape({
    quorum: PropTypes.shape({
      requiredSigners: PropTypes.number,
      totalSigners: PropTypes.number,
    }).isRequired,
    addressType: PropTypes.string.isRequired,
  }).isRequired,
};

function mapStateToProps(state) {
  return {
    inputs: state.spend.transaction.inputs,
    inputsTotalSats: state.spend.transaction.inputsTotalSats,
    outputs: state.spend.transaction.outputs,
    fee: state.spend.transaction.fee,
    feeRate: state.spend.transaction.feeRate,
    unsignedPSBT: state.spend.transaction.unsignedPSBT,
    walletConfig: getWalletConfig(state),
  };
}

const mapDispatchToProps = {
  setChangeOutputMultisig: setChangeOutputMultisigAction,
};

export default connect(mapStateToProps, mapDispatchToProps)(TransactionPreview);
