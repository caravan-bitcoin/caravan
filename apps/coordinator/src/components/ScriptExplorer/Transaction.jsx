import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import {
  blockExplorerTransactionURL,
  addSignaturesToPSBT,
} from "@caravan/bitcoin";
import {
  combinePsbts,
  convertPsbtToVersion,
  convertLegacyInput,
  convertLegacyOutput,
  getUnsignedMultisigPsbtV0,
} from "@caravan/psbt";
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

  /**
   * Builds a signed transaction ready for broadcast.
   *
   * Uses the PSBT-native flow when signed PSBTs are available from all signers,
   * falling back to legacy reconstruction for backward compatibility.
   *
   * PSBT-native flow (preferred):
   * 1. Collect signedPsbt from each signature importer
   * 2. Use BIP174 COMBINER to merge them
   * 3. Finalize and extract
   *
   * Legacy flow (fallback):
   * 1. Reconstruct PSBT from inputs/outputs
   * 2. Add signatures manually
   * 3. Finalize and extract
   */
  buildSignedTransaction = () => {
    const { signatureImporters, originalPsbtVersion } = this.props;

    // Collect finalized signature importers
    const finalizedImporters = Object.values(signatureImporters).filter(
      (importer) => importer.finalized,
    );

    if (finalizedImporters.length === 0) {
      throw new Error("No finalized signatures available");
    }

    // Check if we can use PSBT-native flow
    // All finalized importers must have signedPsbt
    const signedPsbts = finalizedImporters
      .map((importer) => importer.signedPsbt)
      .filter((psbt) => psbt !== null);

    if (signedPsbts.length === finalizedImporters.length) {
      // ALL importers have signed PSBTs - use native flow
      console.log(
        "[Transaction] Using PSBT-native broadcast flow with",
        signedPsbts.length,
        "signed PSBTs",
      );
      return this.buildTransactionPsbtNative(signedPsbts, originalPsbtVersion);
    } else if (signedPsbts.length === 0) {
      // NO signed PSBTs - use legacy flow
      console.log("[Transaction] Using legacy broadcast flow");
      return this.buildTransactionLegacy();
    } else {
      // Mixed mode - fall back to legacy with warning
      console.warn(
        "[Transaction] Mixed signature modes detected.",
        `${signedPsbts.length} signers provided PSBTs,`,
        `${finalizedImporters.length - signedPsbts.length} provided only raw signatures.`,
        "Using legacy reconstruction.",
      );
      return this.buildTransactionLegacy();
    }
  };

  /**
   * PSBT-Native transaction building using BIP174 COMBINER.
   *
   * This is the preferred path that uses standard PSBT roles:
   * 1. COMBINE all signed PSBTs
   * 2. FINALIZE inputs (construct scripts)
   * 3. EXTRACT raw transaction
   *
   * @param {string[]} signedPsbts - Array of signed PSBTs from each signer
   * @param {0|2} outputVersion - Original PSBT version for compatibility
   * @returns {string} Raw transaction hex ready for broadcast
   */
  buildTransactionPsbtNative = (signedPsbts, outputVersion = 0) => {
    // COMBINER: Merge all signed PSBTs using BIP174 combiner
    const { combinedPsbt, signerCount, totalSignatures } = combinePsbts(
      signedPsbts,
      outputVersion,
    );

    console.log(
      `[Transaction] Combined PSBT: ${signerCount} signers, ${totalSignatures} total signatures`,
    );

    // Parse the combined v0 PSBT for finalization
    const psbt = Psbt.fromBase64(combinedPsbt);

    // FINALIZER: Construct final scripts from partial signatures
    psbt.finalizeAllInputs();

    // EXTRACTOR: Produce raw transaction
    const transaction = psbt.extractTransaction();

    return transaction.toHex();
  };

  /**
   * Legacy transaction building via reconstruction.
   *
   * Fallback path for backward compatibility when signed PSBTs
   * are not available. This reconstructs the PSBT and manually
   * adds signatures.
   *
   * @returns {string} Raw transaction hex ready for broadcast
   */
  buildTransactionLegacy = () => {
    const { network, inputs, outputs, signatureImporters, enableRBF } =
      this.props;

    const sequence = enableRBF ? 0xfffffffd : 0xffffffff;

    // Reconstruct the PSBT from inputs/outputs
    const args = {
      network,
      inputs: inputs.map((input) => {
        const convertedInput = convertLegacyInput(input);
        return {
          ...convertedInput,
          sequence: sequence,
        };
      }),
      outputs: outputs.map(convertLegacyOutput),
    };

    const psbt = getUnsignedMultisigPsbtV0(args);
    let partiallySignedTransaction = psbt.toBase64();

    // Add signatures from each importer
    for (const signatureImporter of Object.values(signatureImporters)) {
      if (!signatureImporter.finalized) continue;

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
  originalPsbtVersion: PropTypes.number,
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
    originalPsbtVersion: state.spend.transaction.originalPsbtVersion || 0,
  };
}

const mapDispatchToProps = {
  setTxid: setTXID,
  getBlockchainClient: updateBlockchainClient,
};

export default connect(mapStateToProps, mapDispatchToProps)(Transaction);
