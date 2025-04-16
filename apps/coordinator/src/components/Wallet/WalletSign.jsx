import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { parseSignatureArrayFromPSBT } from "@caravan/bitcoin";
import { BCURDecoder2 } from "@caravan/wallets";
import { QrReader } from "react-qr-reader";

// Components
import { Box, Button } from "@mui/material";
import Transaction from "../ScriptExplorer/Transaction";
import ExtendedPublicKeySelector from "./ExtendedPublicKeySelector";
import QRModal from "../QRModal";

// Actions
import {
  finalizeOutputs as finalizeOutputsAction,
  setRequiredSigners as setRequiredSignersAction,
  resetTransaction as resetTransactionAction,
  setSpendStep as setSpendStepAction,
  resetPSBT as resetPSBTAction,
  SPEND_STEP_CREATE,
} from "../../actions/transactionActions";
import {
  updateTxSlices as updateTxSlicesAction,
  resetWalletView as resetWalletViewAction,
} from "../../actions/walletActions";
import {
  setSignatureImporterFinalized,
  setSignatureImporterSignature,
  setSignatureImporterPublicKeys,
} from "../../actions/signatureImporterActions";
import UnsignedTransaction from "../UnsignedTransaction";

class WalletSign extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      spent: false,
      showExportQR: false,
      showScanner: false,
      scanStatus: "Idle",
    };
    this.decoder = new BCURDecoder2();
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

  handleExportClick = () => {
    this.setState({ showExportQR: true });
  };

  handleCloseQR = () => {
    this.setState({ showExportQR: false });
  };

  handleImportClick = () => {
    this.setState({ showScanner: true });
  };

  handleCloseImportQR = () => {
    this.setState({ showImportQR: false });
  };

  handleQRResult = (result) => {
    const text = typeof result === "string" ? result : result?.text;
    
    if (!text || typeof text !== "string") {
      console.error("No valid string result from QR scanner");
      return;
    }

    try {
      const { inputs } = this.props;
      console.log("Scanning QR code with content:", text.substring(0, 50) + "...");

      // Handle UR encoded PSBT
      if (text.toLowerCase().startsWith("ur:")) {
        this.setState({ scanStatus: "Receiving parts..." });
        console.log("Received UR encoded PSBT part");
        
        this.decoder.receivePart(text);
        if (!this.decoder.isComplete()) {
          console.log("PSBT parts incomplete, waiting for more parts...");
          return;
        }

        console.log("All PSBT parts received, decoding...");
        const decoded = this.decoder.getDecodedData();
        console.log(decoded);
        console.log("Decoded UR data type:", decoded?.type);
        
        if (!decoded || decoded.type !== "crypto-psbt" || !decoded.psbt) {
          throw new Error("Invalid or unsupported UR type");
        }

        console.log("Extracting signatures from PSBT...");

        const signatureArrays = parseSignatureArrayFromPSBT(decoded.psbt);
        console.log("Extracted signature arrays:", signatureArrays);
        
        if (!signatureArrays) {
          throw new Error("No signatures found in PSBT");
        }

        // Handle both single and multiple signature sets
        const signatures = Array.isArray(signatureArrays[0]) ? signatureArrays : [signatureArrays];
        console.log("Processing signature sets:", signatures.length);
        
        signatures.forEach((signatureSet, index) => {
          console.log(`Signature set ${index + 1}:`, signatureSet);
          if (signatureSet.length < inputs.length) {
            throw new Error(`Signature set ${index + 1} does not have enough signatures`);
          }
          
          const importerNum = this.getNextSignatureImporterNumber();
          console.log("Using signature importer number:", importerNum);
          
          if (!importerNum) {
            throw new Error("No more signature importers available");
          }

          this.setSignatureImporter(importerNum, signatureSet);
        });

        // Success - close scanner and reset decoder
        this.setState({ showScanner: false, scanStatus: "Idle" });
        this.decoder = new BCURDecoder2();
        return;
      }

      // Handle raw PSBT
      console.log("Attempting to parse raw PSBT...");
      const signatureArrays = parseSignatureArrayFromPSBT(text);
      console.log("Raw PSBT signature arrays:", signatureArrays);
      
      if (!signatureArrays) {
        throw new Error("No signatures found in PSBT");
      }

      const signatures = Array.isArray(signatureArrays[0]) ? signatureArrays : [signatureArrays];
      console.log("Processing raw PSBT signature sets:", signatures.length);

      signatures.forEach((signatureSet, index) => {
        console.log(`Raw PSBT signature set ${index + 1}:`, signatureSet);
        if (signatureSet.length < inputs.length) {
          throw new Error(`Signature set ${index + 1} does not have enough signatures`);
        }

        const importerNum = this.getNextSignatureImporterNumber();
        console.log("Using signature importer number:", importerNum);
        
        if (!importerNum) {
          throw new Error("No more signature importers available");
        }

        this.setSignatureImporter(importerNum, signatureSet);
      });

      // Success - close scanner
      this.setState({ showScanner: false, scanStatus: "Idle" });

    } catch (err) {
      console.error("Error importing PSBT signatures:", err);
      // Add debug info to error message
      this.setState({ scanStatus: `Error: ${err.message} (${err.stack})` });
    }
  };

  getNextSignatureImporterNumber = () => {
    const { signatureImporters, requiredSigners } = this.props;
    for (let i = 1; i <= requiredSigners; i++) {
      if (!signatureImporters[i]?.finalized) {
        return i;
      }
    }
    return null;
  };

  setSignatureImporter = (number, signatures) => {
    const { setSignatureImporterFinalized, setSignatureImporterSignature } = this.props;
    
    // Convert any signature objects to their raw hex strings
    const processedSignatures = signatures.map(sig => {
      if (typeof sig === 'object' && sig.signature && sig.signature.type === 'Buffer') {
        // Convert Buffer object to hex string
        return Buffer.from(sig.signature.data).toString('hex');
      }
      return sig;
    });

    setSignatureImporterSignature(number, processedSignatures);
    setSignatureImporterFinalized(number, true);
  };

  renderScanner = () => {
    const { showScanner, scanStatus } = this.state;
    if (!showScanner) return null;

    return (
      <Box mt={2}>
        <QrReader
          onResult={this.handleQRResult}
          constraints={{ facingMode: "environment" }}
          containerStyle={{ width: "100%" }}
        />
        <p>{scanStatus}</p>
        <Button
          variant="contained"
          onClick={() => this.setState({ showScanner: false })}
        >
          Close Scanner
        </Button>
      </Box>
    );
  };

  render = () => {
    const { spent, showExportQR } = this.state;
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

          <Button
            variant="contained"
            color="primary"
            onClick={this.handleImportClick}
          >
            Import Signature
          </Button>

          <Button
            variant="contained"
            color="secondary"
            onClick={this.handleExportClick}
            disabled={!unsignedPSBT}
          >
            Export for Signing
          </Button>
        </Box>

        {this.renderScanner()}

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

        <QRModal
          open={showExportQR}
          onClose={this.handleCloseQR}
          title="Scan to Import PSBT"
          mode="display"
          dataToEncode={unsignedPSBT || ""}
          displayCopyable={true}
          isPSBT={true}
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
  setSignatureImporterFinalized: PropTypes.func.isRequired,
  setSignatureImporterSignature: PropTypes.func.isRequired,
  setSignatureImporterPublicKeys: PropTypes.func.isRequired,
  inputs: PropTypes.arrayOf(
    PropTypes.shape({
      txid: PropTypes.string,
      index: PropTypes.number,
    }),
  ).isRequired,
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
    inputs: state.spend.transaction.inputs, // Add this line to include inputs
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
  setSignatureImporterFinalized,
  setSignatureImporterSignature,
  setSignatureImporterPublicKeys,
};

export default connect(mapStateToProps, mapDispatchToProps)(WalletSign);
