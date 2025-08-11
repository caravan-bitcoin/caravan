import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";

// Components
import { Box, Button } from "@mui/material";
import Transaction from "../ScriptExplorer/Transaction";
import ExtendedPublicKeySelector from "./ExtendedPublicKeySelector";
import BCUR2Encoder from "../BCUR2/BCUR2Encoder";

// Actions
import {
  finalizeOutputs as finalizeOutputsAction,
  setRequiredSigners as setRequiredSignersAction,
  resetTransaction as resetTransactionAction,
  setSpendStep as setSpendStepAction,
  resetPSBT as resetPSBTAction,
  SPEND_STEP_CREATE,
} from "../../actions/transactionActions";

// Utils and Selectors
import { downloadFile } from "../../utils";
import { getWalletDetailsText } from "../../selectors/wallet";
import {
  updateTxSlices as updateTxSlicesAction,
  resetWalletView as resetWalletViewAction,
} from "../../actions/walletActions";
import UnsignedTransaction from "../UnsignedTransaction";
import { EncodeTransactionForSigning, BCUR2 } from "@caravan/wallets";
import { Network } from "@caravan/bitcoin";

class WalletSign extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      spent: false,
      showBCUR2Encoder: false,
      qrCodeFrames: [],
    };
  }

  static getDerivedStateFromProps(props, state) {
    const { txid, changeSlice, updateTxSlices } = props;
    if (txid.length && !state.spent) {
      updateTxSlices(changeSlice);
      return {
        spent: true,
      };
    }
    return null;
  }

  componentWillUnmount() {
    const { resetTransaction } = this.props;
    const { spent } = this.state;

    // reset the transaction when we leave the view if tx is spent
    if (spent) {
      resetTransaction();
    }
  }

  renderKeySelectors = () => {
    const { requiredSigners } = this.props;
    const keySelectors = [];
    for (
      let keySelectorNum = 1;
      keySelectorNum <= requiredSigners;
      keySelectorNum += 1
    ) {
      keySelectors.push(
        <Box key={keySelectorNum} mt={2}>
          <ExtendedPublicKeySelector number={keySelectorNum} />
        </Box>,
      );
    }
    return keySelectors;
  };

  signaturesFinalized = () => {
    const { signatureImporters } = this.props;
    return (
      Object.values(signatureImporters).length > 0 &&
      Object.values(signatureImporters).every(
        (signatureImporter) => signatureImporter.finalized,
      )
    );
  };

  handleReturn = () => {
    const { resetTransaction, resetWalletView, resetPSBT } = this.props;
    resetTransaction();
    resetWalletView();
    resetPSBT();
  };

  handleCancel = (event) => {
    const {
      finalizeOutputs,
      requiredSigners,
      setRequiredSigners,
      setSpendStep,
    } = this.props;
    event.preventDefault();
    setRequiredSigners(requiredSigners); // this will generate signature importers
    finalizeOutputs(false);
    setSpendStep(SPEND_STEP_CREATE);
  };

  handleExportForSigning = () => {
    const { unsignedPSBT, network } = this.props;

    if (!unsignedPSBT) {
      console.error("No unsigned PSBT available for export");
      return;
    }

    try {
      // Create the BCUR2 encoder interaction
      const interaction = EncodeTransactionForSigning({
        keystore: BCUR2,
        psbt: unsignedPSBT,
        network: network || Network.MAINNET,
        maxFragmentLength: 100,
      });

      // Get the QR code frames
      const qrCodeFrames = interaction.getQRCodeFrames();

      this.setState({
        showBCUR2Encoder: true,
        qrCodeFrames,
      });
    } catch (error) {
      console.error("Error encoding transaction for signing:", error);
      // You might want to show an error dialog here
    }
  };

  handleCloseBCUR2Encoder = () => {
    this.setState({
      showBCUR2Encoder: false,
      qrCodeFrames: [],
    });
  };

  handleWalletConfigDownload = () => {
    const { walletDetailsText, walletName } = this.props;

    if (!walletDetailsText) {
      console.error("No wallet configuration available");
      return;
    }

    try {
      const filename = `${walletName}-config.json`;
      downloadFile(walletDetailsText, filename);
    } catch (error) {
      console.error("Failed to download wallet configuration:", error);
    }
  };

  render = () => {
    const { spent } = this.state;
    const { showBCUR2Encoder, qrCodeFrames } = this.state;
    const { unsignedPSBT } = this.props;

    return (
      <Box>
        <Button href="#" onClick={this.handleCancel}>
          Edit Transaction
        </Button>
        <Box mt={2}>
          <UnsignedTransaction />
        </Box>
        {this.renderKeySelectors()}

        <Box mt={2} display="flex" gap={2}>
          <Button
            href="#"
            onClick={(e) => {
              e.preventDefault();
              this.handleReturn();
            }}
          >
            Abandon Transaction
          </Button>

          {unsignedPSBT && (
            <Button
              variant="outlined"
              color="primary"
              onClick={this.handleWalletConfigDownload}
            >
              Download Wallet Config
            </Button>
          )}
        </Box>

        {this.signaturesFinalized() && (
          <Box mt={2}>
            <Transaction />
          </Box>
        )}

        {spent && (
          <Box mt={2}>
            <Button
              variant="contained"
              color="primary"
              onClick={this.handleReturn}
            >
              Return
            </Button>
          </Box>
        )}

        {/* BCUR2 Encoder Dialog */}
        <BCUR2Encoder
          open={showBCUR2Encoder}
          onClose={this.handleCloseBCUR2Encoder}
          qrCodeFrames={qrCodeFrames}
          title="Export Transaction for Signing"
          autoPlay={true}
          initialInterval={800}
        />
      </Box>
    );
  };
}

WalletSign.propTypes = {
  changeSlice: PropTypes.shape({
    bip32Path: PropTypes.string,
    multisig: PropTypes.shape({
      address: PropTypes.string,
    }),
  }).isRequired,
  finalizeOutputs: PropTypes.func.isRequired,
  requiredSigners: PropTypes.number.isRequired,
  resetTransaction: PropTypes.func.isRequired,
  resetWalletView: PropTypes.func.isRequired,
  resetPSBT: PropTypes.func.isRequired,
  setRequiredSigners: PropTypes.func.isRequired,
  setSpendStep: PropTypes.func.isRequired,
  signatureImporters: PropTypes.shape({}).isRequired,
  updateTxSlices: PropTypes.func.isRequired,
  txid: PropTypes.string.isRequired,
  unsignedPSBT: PropTypes.string,
  network: PropTypes.string,
  walletName: PropTypes.string.isRequired,
  walletDetailsText: PropTypes.string.isRequired,
};

function mapStateToProps(state) {
  return {
    ...state.wallet,
    ...state.spend,
    ...state.quorum,
    txid: state.spend.transaction.txid,
    requiredSigners: state.spend.transaction.requiredSigners,
    totalSigners: state.spend.transaction.totalSigners,
    changeSlice: state.wallet.change.nextNode,
    unsignedPSBT: state.spend.transaction.unsignedPSBT,
    network: state.settings.network,
    walletName: state.wallet.common.walletName,
    walletDetailsText: getWalletDetailsText(state),
  };
}

const mapDispatchToProps = {
  finalizeOutputs: finalizeOutputsAction,
  setRequiredSigners: setRequiredSignersAction,
  updateTxSlices: updateTxSlicesAction,
  resetTransaction: resetTransactionAction,
  resetWalletView: resetWalletViewAction,
  resetPSBT: resetPSBTAction,
  setSpendStep: setSpendStepAction,
};

export default connect(mapStateToProps, mapDispatchToProps)(WalletSign);
