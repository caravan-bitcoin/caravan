// React and third party imports
import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { QrReader } from "react-qr-reader";
import {
  Card,
  CardHeader,
  CardContent,
  FormControl,
  MenuItem,
  Button,
  FormHelperText,
  Box,
  TextField,
  Typography,
} from "@mui/material";
import { withStyles } from "@mui/styles";

// Project imports
import {
  validateBIP32Path,
  validateRootFingerprint,
  convertExtendedPublicKey,
  validateExtendedPublicKey,
  Network,
  P2SH,
} from "@caravan/bitcoin";
import {
  BITBOX,
  TREZOR,
  LEDGER,
  HERMIT,
  COLDCARD,
  BCURDecoder2,
} from "@caravan/wallets";

// Local imports
import Copyable from "../Copyable";
import DirectExtendedPublicKeyImporter from "./DirectExtendedPublicKeyImporter";
import TextExtendedPublicKeyImporter from "./TextExtendedPublicKeyImporter";
import EditableName from "../EditableName";
import Conflict from "../CreateAddress/Conflict";
import {
  setExtendedPublicKeyImporterName,
  resetExtendedPublicKeyImporterBIP32Path,
  setExtendedPublicKeyImporterBIP32Path,
  setExtendedPublicKeyImporterMethod,
  setExtendedPublicKeyImporterExtendedPublicKey,
  setExtendedPublicKeyImporterExtendedPublicKeyRootFingerprint,
  setExtendedPublicKeyImporterFinalized,
} from "../../actions/extendedPublicKeyImporterActions";
import ColdcardExtendedPublicKeyImporter from "../Coldcard/ColdcardExtendedPublicKeyImporter";
import HermitExtendedPublicKeyImporter from "../Hermit/HermitExtendedPublicKeyImporter";

// Constants
const TEXT = "text";
const SCAN_QR = "scan_qr";

// Styles
const useStyles = () => ({
  xpub: {
    lineHeight: ".8rem",
    overflowWrap: "break-word",
  },
  scannerOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: "250px",
    height: "250px",
    transform: "translate(-50%, -50%)",
    border: "2px solid #00ff00",
    animation: "scan 2s infinite",
    zIndex: 2,
  },
  "@keyframes scan": {
    "0%": {
      borderColor: "#00ff00",
      boxShadow: "0 0 0 0 rgba(0,255,0,0.4)",
    },
    "50%": {
      borderColor: "#00ff0080",
      boxShadow: "0 0 0 3px rgba(0,255,0,0.1)",
    },
    "100%": {
      borderColor: "#00ff00",
      boxShadow: "0 0 0 0 rgba(0,255,0,0.4)",
    },
  },
  scannerContainer: {
    width: "100%",
    maxWidth: "400px",
    height: "400px",
    margin: "auto",
  },
});

class ExtendedPublicKeyImporter extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      disableChangeMethod: false,
      conversionMessage: "",
      showScanner: false,
      scanStatus: "",
      errorTimeout: null
    };
    this.decoder = new BCURDecoder2();
  }

  // Clear any existing error timeouts
  componentWillUnmount() {
    if (this.state.errorTimeout) {
      clearTimeout(this.state.errorTimeout);
    }
  }

  // Helper to show temporary errors
  showTemporaryError = (error) => {
    if (this.state.errorTimeout) {
      clearTimeout(this.state.errorTimeout);
    }
    
    const timeout = setTimeout(() => {
      this.setState({ scanStatus: "", errorTimeout: null });
    }, 2000);

    this.setState({ 
      scanStatus: error,
      errorTimeout: timeout
    });
  };

  title = () => {
    const { number, extendedPublicKeyImporter, setName } = this.props;
    return (
      <EditableName
        number={number}
        name={extendedPublicKeyImporter.name}
        setName={setName}
      />
    );
  };

  renderImport = () => {
    const { extendedPublicKeyImporter, number, addressType } = this.props;
    const { disableChangeMethod } = this.state;
    return (
      <div>
        <FormControl fullWidth>
          <TextField
            label="Select Method"
            id={`public-key-${number}-importer-select`}
            disabled={disableChangeMethod}
            select
            value={extendedPublicKeyImporter.method}
            variant="standard"
            onChange={this.handleMethodChange}
          >
            {addressType != P2SH && <MenuItem value={BITBOX}>BitBox</MenuItem>}
            <MenuItem value={TREZOR}>Trezor</MenuItem>
            <MenuItem value={COLDCARD}>Coldcard</MenuItem>
            <MenuItem value={LEDGER}>Ledger</MenuItem>
            <MenuItem value={HERMIT}>Hermit</MenuItem>
            <MenuItem value={TEXT}>Enter as text</MenuItem>
            <MenuItem value={SCAN_QR}>Scan QR Code</MenuItem>
          </TextField>
        </FormControl>
        <FormControl style={{ width: "100%" }}>
          {this.renderImportByMethod()}
        </FormControl>
      </div>
    );
  };

  renderImportByMethod = () => {
    const {
      extendedPublicKeyImporter,
      network,
      addressType,
      defaultBIP32Path,
    } = this.props;
    const { method } = extendedPublicKeyImporter;

    if (method === SCAN_QR) {
      return this.renderScanner();
    }

    if (method === BITBOX || method === TREZOR || method === LEDGER) {
      return (
        <DirectExtendedPublicKeyImporter
          extendedPublicKeyImporter={extendedPublicKeyImporter}
          validateAndSetExtendedPublicKey={this.validateAndSetExtendedPublicKey}
          validateAndSetBIP32Path={this.validateAndSetBIP32Path}
          validateAndSetRootFingerprint={this.validateAndSetRootFingerprint}
          resetBIP32Path={this.resetBIP32Path}
          enableChangeMethod={this.enableChangeMethod}
          disableChangeMethod={this.disableChangeMethod}
          addressType={addressType}
          defaultBIP32Path={defaultBIP32Path}
          network={network}
        />
      );
    }
    if (method === HERMIT) {
      return (
        <HermitExtendedPublicKeyImporter
          extendedPublicKeyImporter={extendedPublicKeyImporter}
          validateAndSetExtendedPublicKey={this.validateAndSetExtendedPublicKey}
          validateAndSetBIP32Path={this.validateAndSetBIP32Path}
          validateAndSetRootFingerprint={this.validateAndSetRootFingerprint}
          enableChangeMethod={this.enableChangeMethod}
          disableChangeMethod={this.disableChangeMethod}
          addressType={addressType}
          defaultBIP32Path={defaultBIP32Path}
          network={network}
          resetBIP32Path={this.resetBIP32Path}
          reset={this.reset}
        />
      );
    }
    if (method === COLDCARD) {
      return (
        <ColdcardExtendedPublicKeyImporter
          extendedPublicKeyImporter={extendedPublicKeyImporter}
          validateAndSetExtendedPublicKey={this.validateAndSetExtendedPublicKey}
          validateAndSetBIP32Path={this.validateAndSetBIP32Path}
          validateAndSetRootFingerprint={this.validateAndSetRootFingerprint}
          addressType={addressType}
          defaultBIP32Path={defaultBIP32Path}
          network={network}
        />
      );
    }
    if (method === TEXT) {
      return (
        <TextExtendedPublicKeyImporter
          extendedPublicKeyImporter={extendedPublicKeyImporter}
          validateAndSetExtendedPublicKey={this.validateAndSetExtendedPublicKey}
        />
      );
    }
    return null;
  };

  //
  // Method
  //

  handleMethodChange = (event) => {
    const { number, setMethod, setExtendedPublicKey } = this.props;
    const method = event.target.value;
    setMethod(number, method);
    setExtendedPublicKey(number, "");
    
    // Reset scan status when changing methods
    this.setState({ 
      scanStatus: "",
      showScanner: method === SCAN_QR 
    });

    if (this.state.errorTimeout) {
      clearTimeout(this.state.errorTimeout);
    }
  };

  disableChangeMethod = () => {
    this.setState({ disableChangeMethod: true });
  };

  enableChangeMethod = () => {
    this.setState({ disableChangeMethod: false });
  };

  //
  // State
  //

  finalize = () => {
    const { number, setFinalized } = this.props;
    setFinalized(number, true);
  };

  reset = (resetBIP32Path) => {
    const { number, setExtendedPublicKey, setFinalized } = this.props;
    setExtendedPublicKey(number, "");
    setFinalized(number, false);
    if (resetBIP32Path) {
      this.resetBIP32Path();
    }
  };

  //
  // BIP32 Path
  //

  renderBIP32Path = () => {
    const { extendedPublicKeyImporter } = this.props;
    if (extendedPublicKeyImporter.method === TEXT) {
      return (
        <div className="mt-4">
          <p>
            Make sure you <strong>record the corresponding BIP32 path.</strong>
          </p>
        </div>
      );
    }
    // Add m/ prefix to display if not already present
    const displayPath = extendedPublicKeyImporter.bip32Path.startsWith("m/")
      ? extendedPublicKeyImporter.bip32Path
      : `m/${extendedPublicKeyImporter.bip32Path}`;

    return (
      <div className="mt-4">
        <p>The BIP32 path for this extended public key is:</p>
        <div className="text-center">
          <Copyable text={displayPath} showIcon />
        </div>
        <p className="mt-4">
          You will need this BIP32 path to sign for this key later.{" "}
          <strong>Write down this BIP32 path!</strong>
        </p>
      </div>
    );
  };

  validateAndSetBIP32Path = (bip32Path, callback, errback, options) => {
    const { number, setBIP32Path } = this.props;
    // Ensure path has m/ prefix for storage
    const normalizedPath = bip32Path.startsWith("m/")
      ? bip32Path
      : `m/${bip32Path}`;
    const error = validateBIP32Path(normalizedPath, options);
    setBIP32Path(number, normalizedPath);
    if (error) {
      errback(error);
    } else {
      errback("");
      callback();
    }
  };

  resetBIP32Path = () => {
    const { number, resetBIP32Path } = this.props;
    resetBIP32Path(number);
  };

  //
  // Extended Public Key
  //

  renderExtendedPublicKey = () => {
    const { extendedPublicKeyImporter, network, classes } = this.props;
    const { conversionMessage } = this.state;
    const conversionAppend =
      extendedPublicKeyImporter.method === HERMIT && network === Network.TESTNET
        ? "this should not be an issue as hermit signing is not affected by the conversion."
        : "this may indicate an invalid network setting, if so correct setting, remove key and try again.";
    return (
      <div>
        <p>The following extended public key was imported:</p>
        <div className={classes.xpub}>
          <Copyable
            text={extendedPublicKeyImporter.extendedPublicKey}
            showIcon
          />
        </div>
        {this.renderBIP32Path()}
        {conversionMessage !== "" && (
          <Box mb={2}>
            <FormHelperText>
              {conversionMessage}, {conversionAppend}{" "}
            </FormHelperText>
          </Box>
        )}
        <Button
          variant="contained"
          color="secondary"
          size="small"
          onClick={() => {
            this.reset(extendedPublicKeyImporter.method === HERMIT);
          }}
        >
          Remove Extended Public Key
        </Button>
      </div>
    );
  };

  validateAndSetExtendedPublicKey = (extendedPublicKey, errback, callback) => {
    const {
      number,
      network,
      extendedPublicKeyImporters,
      setExtendedPublicKey,
    } = this.props;
    const networkError = validateExtendedPublicKey(extendedPublicKey, network);
    let actualExtendedPublicKey = extendedPublicKey;
    if (networkError !== "") {
      try {
        actualExtendedPublicKey = convertExtendedPublicKey(
          extendedPublicKey,
          network === "testnet" ? "tpub" : "xpub",
        );
      } catch (error) {
        errback(error.message);
        setExtendedPublicKey(number, extendedPublicKey);
        return;
      }
    }

    const validationError = validateExtendedPublicKey(
      actualExtendedPublicKey,
      network,
    );
    if (validationError !== "") {
      errback(validationError);
      setExtendedPublicKey(number, extendedPublicKey);
      return;
    }
    setExtendedPublicKey(number, actualExtendedPublicKey);

    if (
      actualExtendedPublicKey &&
      Object.values(extendedPublicKeyImporters).find(
        (extendedPublicKeyImporter, extendedPublicKeyImporterIndex) =>
          extendedPublicKeyImporterIndex !== number - 1 &&
          extendedPublicKeyImporter.extendedPublicKey ===
            actualExtendedPublicKey,
      )
    ) {
      errback("This extended public key has already been imported.");
    } else {
      errback("");
      const conversionMessage =
        actualExtendedPublicKey === extendedPublicKey
          ? ""
          : `Your extended public key has been converted from ${extendedPublicKey.slice(
              0,
              4,
            )} to ${actualExtendedPublicKey.slice(0, 4)}`;
      this.setState({ conversionMessage });
      this.finalize();

      if (callback) {
        callback();
      }
    }
  };

  validateAndSetRootFingerprint = (rootFingerprint, errback) => {
    const { number, setExtendedPublicKeyRootXfp } = this.props;
    const error = validateRootFingerprint(rootFingerprint);
    if (error) {
      errback(error);
    } else {
      setExtendedPublicKeyRootXfp(number, rootFingerprint);
    }
  };

  handleQRResult = (result) => {
    const text = typeof result === "string" ? result : result?.text;

    if (!text || typeof text !== "string") {
      console.error("No valid string result from QR scanner:", result);
      return;
    }

    console.log("QR text scanned:", text);

    try {
      // Handle legacy [xfp/path]xpub format first
      const legacyRegex =
        /\[([a-fA-F0-9]{8})(\/[^\]]+)?\]([A-Za-z0-9]+pub[a-zA-Z0-9]+)$/;
      const match = text.match(legacyRegex);

      if (match) {
        const xfp = match[1].toUpperCase();
        const path = match[2]?.slice(1) ?? "";
        const xpub = match[3];

        this.validateAndSetExtendedPublicKey(xpub, (error) => {
          if (error) {
            this.showTemporaryError("❌ " + error);
          } else {
            this.showTemporaryError("✅ Successfully imported");
            this.resetToDefaultMethod();
          }
        });

        if (xfp) this.validateAndSetRootFingerprint(xfp, () => {});
        if (path)
          this.validateAndSetBIP32Path(
            path,
            () => {},
            () => {},
          );
        return;
      }

      // Handle UR format using BCURDecoder2
      this.decoder.receivePart(text);
      this.setState({ scanStatus: this.decoder.getProgress() });
      if (!this.decoder.isComplete()) return;

      const error = this.decoder.getError();
      if (error) {
        this.showTemporaryError("❌ " + error);
        this.decoder.reset();
        return;
      }

      const decodedData = this.decoder.getDecodedData();
      console.log("Decoded data:", decodedData);
      if (!decodedData) {
        this.showTemporaryError("❌ Failed to decode QR data");
        this.decoder.reset();
        return;
      }

      // Extract and parse xpub from decoded data
      let xpub;
      xpub = decodedData.xpub;

      if (!xpub) {
        this.showTemporaryError("❌ Invalid xpub format in QR code");
        this.decoder.reset();
        return;
      }

      const { xfp, path } = decodedData;

      this.validateAndSetExtendedPublicKey(xpub, (error) => {
        if (error) {
          this.showTemporaryError("❌ " + error);
        } else {
          this.showTemporaryError("✅ Successfully imported");
          this.resetToDefaultMethod();
        }
      });

      if (xfp) {
        this.validateAndSetRootFingerprint(xfp, (error) => {
          if (error) console.warn("Error setting fingerprint:", error);
        });
      }

      if (path) {
        this.validateAndSetBIP32Path(
          path,
          () => {},
          (error) => {
            if (error) console.warn("Error setting BIP32 path:", error);
          },
        );
      }

      this.decoder.reset();
    } catch (err) {
      console.error("Error while handling QR:", err);
      const message = err?.message || String(err);
      this.showTemporaryError("❌ " + message);
      this.decoder.reset();
    }
  };

  handleScanFingerprint = async (fingerprint) => {
    this.setState({
      scanStatus: "",
      showScanner: false,
      fingerprintScanned: fingerprint,
    });
  };

  handleBIP32PathChange = (event) => {
    const path = event.target.value;
    this.validateAndSetBIP32Path(
      path,
      () => {},
      () => {},
    );
  };

  handleScanError = () => {
    // Prevent error from killing scanner
    this.setState({
      scanStatus: "❌ Failed to decode QR data",
      showScanner: false,
    });
  };

  handleScanInvalid = () => {
    this.setState({
      scanStatus: "❌ Invalid xpub format in QR code",
      showScanner: false,
    });
  };

  handleScanSuccess = () => {
    this.setState({
      scanStatus: "✅ Successfully imported xpub",
      showScanner: false,
    });
  };

  handleCloseDialog = () => {
    this.setState({ dialogOpen: false });
  };

  resetToDefaultMethod = () => {
    const { number, setMethod } = this.props;
    setMethod(number, ""); // Set to empty string to show "Select Method"
    this.setState({ showScanner: false });
  };

  renderScanner = () => {
    const { showScanner, scanStatus } = this.state;
    if (!showScanner) return null;

    return (
      <Box mt={2} sx={{
        '& .scannerOverlay': {
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '250px',
          height: '250px',
          transform: 'translate(-50%, -50%)',
          border: '2px solid #00ff00',
          animation: 'scan 2s infinite',
          zIndex: 2
        },
        '@keyframes scan': {
          '0%': {
            borderColor: '#00ff00',
            boxShadow: '0 0 0 0 rgba(0,255,0,0.4)'
          },
          '50%': {
            borderColor: '#00ff0080',
            boxShadow: '0 0 0 3px rgba(0,255,0,0.1)' 
          },
          '100%': {
            borderColor: '#00ff00',
            boxShadow: '0 0 0 0 rgba(0,255,0,0.4)'
          }
        }
      }}>
        <Box position="relative" width="100%" maxWidth="400px" margin="auto">
          <QrReader
            onResult={this.handleQRResult}
            constraints={{ facingMode: "environment" }}
            containerStyle={{ 
              width: '100%',
              maxWidth: '400px',
              height: '400px',
              margin: 'auto'
            }}
          />
          <div className="scannerOverlay" />
        </Box>
        <Typography align="center" color="textSecondary" sx={{mt: 2}}>
          {scanStatus}
        </Typography>
        <Box textAlign="center" mt={2}>
          <Button
            variant="contained"
            onClick={() => this.setState({ showScanner: false })}
          >
            Close Scanner
          </Button>
        </Box>
      </Box>
    );
  };

  render() {
    const { extendedPublicKeyImporter, finalizedNetwork, network } = this.props;
    const hasConflict =
      extendedPublicKeyImporter.method && extendedPublicKeyImporter.conflict;
    let conflictMessage = "";
    if (hasConflict) {
      if (finalizedNetwork !== network) {
        conflictMessage =
          "Warning, you can not mix xpub and tpub.  Do not proceed without resolving by either removing conflicting imported keys or returning network type to original state!";
      } else {
        conflictMessage =
          "Warning, BIP32 path is in conflict with the network and address type settings.  Do not proceed unless you are absolutely sure you know what you are doing!";
      }
    }
    return (
      <Card data-testid="extended-key-importer">
        <CardHeader title={this.title()} />
        <CardContent>
          {hasConflict && <Conflict message={conflictMessage} />}
          {extendedPublicKeyImporter.finalized
            ? this.renderExtendedPublicKey()
            : this.renderImport()}
        </CardContent>
      </Card>
    );
  }
}

ExtendedPublicKeyImporter.propTypes = {
  addressType: PropTypes.string.isRequired,
  classes: PropTypes.shape({
    xpub: PropTypes.string,
  }).isRequired,
  defaultBIP32Path: PropTypes.string.isRequired,
  extendedPublicKeyImporter: PropTypes.shape({
    bip32Path: PropTypes.string,
    conflict: PropTypes.bool,
    extendedPublicKey: PropTypes.string,
    finalized: PropTypes.bool,
    name: PropTypes.string,
    method: PropTypes.string,
  }).isRequired,
  extendedPublicKeyImporters: PropTypes.shape({}).isRequired,
  finalizedNetwork: PropTypes.string.isRequired,
  network: PropTypes.string.isRequired,
  number: PropTypes.number.isRequired,
  resetBIP32Path: PropTypes.func.isRequired,
  setBIP32Path: PropTypes.func.isRequired,
  setExtendedPublicKey: PropTypes.func.isRequired,
  setExtendedPublicKeyRootXfp: PropTypes.func.isRequired,
  setFinalized: PropTypes.func.isRequired,
  setName: PropTypes.func.isRequired,
  setMethod: PropTypes.func.isRequired,
};

function mapStateToProps(state, ownProps) {
  return {
    ...state.settings,
    ...state.quorum,
    ...{
      extendedPublicKeyImporter:
        state.quorum.extendedPublicKeyImporters[ownProps.number],
    },
  };
}

const mapDispatchToProps = {
  setName: setExtendedPublicKeyImporterName,
  resetBIP32Path: resetExtendedPublicKeyImporterBIP32Path,
  setBIP32Path: setExtendedPublicKeyImporterBIP32Path,
  setMethod: setExtendedPublicKeyImporterMethod,
  setExtendedPublicKey: setExtendedPublicKeyImporterExtendedPublicKey,
  setExtendedPublicKeyRootXfp:
    setExtendedPublicKeyImporterExtendedPublicKeyRootFingerprint,
  setFinalized: setExtendedPublicKeyImporterFinalized,
};

const ExtendedPublicKeyImporterWithStyles = withStyles(useStyles)(
  ExtendedPublicKeyImporter,
);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ExtendedPublicKeyImporterWithStyles);
