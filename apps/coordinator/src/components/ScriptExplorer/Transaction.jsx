import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import {
  blockExplorerTransactionURL,
  addSignaturesToPSBT,
} from "@caravan/bitcoin";

import {
  Typography,
  Box,
  FormHelperText,
  Button,
  Card,
  CardHeader,
  CardContent,
} from "@mui/material";
import { OpenInNew } from "@mui/icons-material";

import { updateBlockchainClient } from "../../actions/clientActions";
import Copyable from "../Copyable";
import { externalLink } from "utils/ExternalLink";
import { setTXID } from "../../actions/transactionActions";
import {
  convertLegacyInput,
  convertLegacyOutput,
  getUnsignedMultisigPsbtV0,
} from "@caravan/psbt";
import { Psbt } from "bitcoinjs-lib";
import { Buffer } from "buffer";

class Transaction extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: "",
      broadcasting: false,
      txid: "",
    };
  }

  buildSignedTransaction = () => {
    const { network, inputs, outputs, signatureImporters, enableRBF } =
      this.props;
    const sequence = enableRBF ? 0xfffffffd : 0xffffffff;
    const args = {
      network,
      inputs: inputs.map((input) => {
        const convertedInput = convertLegacyInput(input);
        return {
          ...convertedInput,
          sequence: sequence, // Apply the same RBF sequence as in finalizeOutputs so if RBF signalling we don't lose that
        };
      }),
      outputs: outputs.map(convertLegacyOutput),
    };
    const psbt = getUnsignedMultisigPsbtV0(args);
    let partiallySignedTransaction = psbt.toBase64();
    for (const signatureImporter of Object.values(signatureImporters)) {
      partiallySignedTransaction = addSignaturesToPSBT(
        network,
        partiallySignedTransaction,
        signatureImporter.publicKeys.map((pubkey) =>
          Buffer.from(pubkey, "hex"),
        ),
        signatureImporter.signature.map((signature) =>
          Buffer.from(signature, "hex"),
        ),
      );
    }

    return Psbt.fromBase64(partiallySignedTransaction)
      .finalizeAllInputs()
      .extractTransaction()
      .toHex();
  };

  handleBroadcast = async () => {
    const { getBlockchainClient, setTxid } = this.props;
    const client = await getBlockchainClient();
    const signedTransaction = this.buildSignedTransaction();
    let error = "";
    let txid = "";
    this.setState({ broadcasting: true });
    try {
      txid = await client.broadcastTransaction(signedTransaction);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      error = `There was an error broadcasting the transaction.: ${e}`;
    } finally {
      this.setState({ txid, error, broadcasting: false });
      setTxid(txid);
    }
  };

  transactionURL = () => {
    const { network } = this.props;
    const { txid } = this.state;
    return blockExplorerTransactionURL(txid, network);
  };

  render() {
    const { error, broadcasting, txid } = this.state;
    const signedTransactionHex = this.buildSignedTransaction();
    return (
      <Card>
        <CardHeader title="Broadcast" />
        <CardContent>
          <form>
            {signedTransactionHex && (
              <Box mt={4}>
                <Typography variant="h6">Signed Transaction</Typography>
                <Copyable text={signedTransactionHex} code showIcon />
              </Box>
            )}
            {txid === "" ? (
              <Box mt={2}>
                <Button
                  variant="contained"
                  color="primary"
                  disabled={!signedTransactionHex || broadcasting}
                  onClick={this.handleBroadcast}
                >
                  Broadcast Transaction
                </Button>
                <FormHelperText error>{error}</FormHelperText>
                <small>
                  <FormHelperText>
                    Warning: Broadcasting this transaction cannot be undone.
                  </FormHelperText>
                </small>
              </Box>
            ) : (
              <Box mt={2}>
                <Typography variant="h5">
                  <Copyable text={txid} code showIcon />
                  &nbsp;
                  {externalLink(this.transactionURL(), <OpenInNew />)}
                </Typography>
                <p>Transaction successfully broadcast.</p>
              </Box>
            )}
          </form>
        </CardContent>
      </Card>
    );
  }
}

Transaction.propTypes = {
  client: PropTypes.shape({}).isRequired,
  network: PropTypes.string.isRequired,
  inputs: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  outputs: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  setTxid: PropTypes.func.isRequired,
  signatureImporters: PropTypes.shape({}).isRequired,
  getBlockchainClient: PropTypes.func.isRequired,
  enableRBF: PropTypes.bool.isRequired,
};

function mapStateToProps(state) {
  return {
    network: state.settings.network,
    client: state.client,
    ...state.client,
    signatureImporters: state.spend.signatureImporters,
    inputs: state.spend.transaction.inputs,
    outputs: state.spend.transaction.outputs,
    enableRBF: state.spend.transaction.enableRBF,
  };
}

const mapDispatchToProps = {
  setTxid: setTXID,
  getBlockchainClient: updateBlockchainClient,
};

export default connect(mapStateToProps, mapDispatchToProps)(Transaction);
