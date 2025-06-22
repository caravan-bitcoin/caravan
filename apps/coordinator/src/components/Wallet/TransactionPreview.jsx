import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
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
} from "@mui/material";
import UTXOSet from "../ScriptExplorer/UTXOSet";
import { downloadFile } from "../../utils";
import UnsignedTransaction from "../UnsignedTransaction";
import { setChangeOutputMultisig as setChangeOutputMultisigAction } from "../../actions/transactionActions";
import TransactionAnalysis from "../TransactionAnalysis";

class TransactionPreview extends React.Component {
  componentDidMount() {
    // Set up change output multisig details when component loads
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

  buildOutputRows = () => {
    const { changeAddress, outputs } = this.props;
    return outputs.map((output) => (
      <TableRow key={output.address}>
        <TableCell>
          <code>{output.address}</code>
          {output.address === changeAddress && (
            <small>&nbsp;(change)</small>
          )}
        </TableCell>
        <TableCell>
          <code>{BigNumber(output.amount).toFixed(8)}</code>
        </TableCell>
      </TableRow>
    ));
  };

  buildOutputsTable = () => (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Address</TableCell>
          <TableCell>Amount (BTC)</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>{this.buildOutputRows()}</TableBody>
      <TableFooter>
        <TableRow>
          <TableCell>TOTAL:</TableCell>
          <TableCell>{this.calculateOutputsTotal()}</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );

  calculateOutputsTotal = () => {
    const { outputs } = this.props;
    return satoshisToBitcoins(
      outputs.reduce(
        (sum, output) => sum.plus(BigNumber(output.amountSats || 0)),
        BigNumber(0),
      ),
    );
  };

  downloadPSBT = (psbtData) => {
    downloadFile(psbtData, "transaction.psbt");
  };

  render() {
    const {
      feeRate,
      fee,
      inputsTotalSats,
      editTransaction,
      handleSignTransaction,
      unsignedPSBT,
      inputs,
      outputs,
    } = this.props;

    return (
      <Box>
        <TransactionAnalysis 
          inputs={inputs || []}
          outputs={outputs || []}
          feeRate={feeRate || 1}
        />
        
        <h2>Transaction Preview</h2>
        <UnsignedTransaction />
        
        <h3>Inputs</h3>
        <UTXOSet
          inputs={inputs || []}
          inputsTotalSats={inputsTotalSats}
          showSelection={false}
          finalizedOutputs
        />
        
        <h3>Outputs</h3>
        {this.buildOutputsTable()}
        
        <Grid container>
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
                  onClick={() => this.downloadPSBT(unsignedPSBT)}
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
  inputs: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  inputsTotalSats: PropTypes.shape({}).isRequired,
  outputs: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  handleSignTransaction: PropTypes.func.isRequired,
  setChangeOutputMultisig: PropTypes.func.isRequired,
  unsignedPSBT: PropTypes.string.isRequired,
};

const mapStateToProps = (state) => ({
  changeOutputIndex: state.spend.transaction.changeOutputIndex,
  network: state.settings.network,
  inputs: state.spend.transaction.inputs,
  outputs: state.spend.transaction.outputs,
  unsignedPSBT: state.spend.transaction.unsignedPSBT,
});

const mapDispatchToProps = {
  setChangeOutputMultisig: setChangeOutputMultisigAction,
};

export default connect(mapStateToProps, mapDispatchToProps)(TransactionPreview);