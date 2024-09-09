import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import BigNumber from "bignumber.js";
import { bitcoinsToSatoshis, satoshisToBitcoins } from "@caravan/bitcoin";
import {
  Button,
  Box,
  IconButton,
  Table,
  TableHead,
  TableBody,
  TableFooter,
  TableRow,
  TableCell,
  Grid,
  Slider,
  Tooltip,
  Typography,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import { downloadFile } from "../../utils";
import UnsignedTransaction from "../UnsignedTransaction";
import { setChangeOutputMultisig as setChangeOutputMultisigAction } from "../../actions/transactionActions";
import { WasteMetrics } from "@caravan/health";

class TransactionPreview extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      longTermFeeEstimate: this.props.feeRate, // Initial value for L
      wasteAmount: 0, // Initial waste amount
    };
  }

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

  spendOutputsTotal = () => {
    const { outputs, changeAddress } = this.props;
    let spendAmount = 0;
    outputs.forEach((output) => {
      if (output.address !== changeAddress) {
        spendAmount += output.amount;
      }
    });
    return bitcoinsToSatoshis(spendAmount);
  };

  handleLongTermFeeEstimateChange = (event, newValue) => {
    this.setState({ longTermFeeEstimate: newValue }, this.calculateWaste);
  };

  calculateWaste = () => {
    const { feeRate, fee, inputsTotalSats } = this.props;
    const { longTermFeeEstimate } = this.state;
    const wasteMetrics = new WasteMetrics();
    const weight = bitcoinsToSatoshis(fee) / feeRate;
    const spendAmount = this.spendOutputsTotal();

    const wasteAmount = wasteMetrics.spendWasteAmount(
      weight, // vB
      feeRate, // sats/vB
      inputsTotalSats, // sats
      spendAmount, // sats
      longTermFeeEstimate, //sats/vB
    );

    this.setState({ wasteAmount });
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

    const { longTermFeeEstimate, wasteAmount } = this.state;
    return (
      <Box>
        <h2>Transaction Preview</h2>
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
          <Grid item xs={12}>
            <h3>
              Waste Analysis
              <Tooltip title="Waste analysis helps calculate inefficiencies in the transaction due to fees, UTXO consolidation, etc.">
                <IconButton size="small" sx={{ marginLeft: 1 }}>
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </h3>
            <Typography gutterBottom>
              Spend Waste Amount (SWA): {wasteAmount.toFixed(2)} Sats
              <Tooltip title="SWA represents the amount of waste in Satoshis spent during the transaction due to inefficiencies. Postive SWA means that it would be efficient to spend this transaction later when the feerate decreases. For Negative SWA, spending now could be the best decision.">
                <IconButton size="small" sx={{ marginLeft: 1 }}>
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Typography>
            <Slider
              value={longTermFeeEstimate}
              min={1}
              max={3000}
              step={1}
              onChange={this.handleLongTermFeeEstimateChange}
              aria-labelledby="long-term-fee-estimate-slider"
            />
            <Typography id="long-term-fee-estimate-slider" gutterBottom>
              Long Term Fee Estimate (L): {longTermFeeEstimate} sats/vB
              <Tooltip title="L refers to the long-term estimated fee rate in Satoshis per vByte for future transactions.">
                <IconButton size="small" sx={{ marginLeft: 1 }}>
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Typography>
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
};

function mapStateToProps(state) {
  return {
    changeOutputIndex: state.spend.transaction.changeOutputIndex,
    network: state.settings.network,
    inputs: state.spend.transaction.inputs,
    outputs: state.spend.transaction.outputs,
    unsignedPSBT: state.spend.transaction.unsignedPSBT,
  };
}

const mapDispatchToProps = {
  setChangeOutputMultisig: setChangeOutputMultisigAction,
};

export default connect(mapStateToProps, mapDispatchToProps)(TransactionPreview);
