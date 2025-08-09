import React from "react";
import PropTypes from "prop-types";
import { FormGroup, FormHelperText, Box } from "@mui/material";
import BCUR2Reader from "./BCUR2Reader";

class BCUR2ExtendedPublicKeyImporter extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      extendedPublicKeyError: "",
    };
  }

  setError = (value) => {
    this.setState({ extendedPublicKeyError: value });
  };

  import = (data) => {
    const {
      validateAndSetBIP32Path,
      validateAndSetExtendedPublicKey,
      validateAndSetRootFingerprint,
      enableChangeMethod,
    } = this.props;

    enableChangeMethod();
    try {
      // Handle different possible data formats
      let xpub, fingerprint, path;

      if (data && typeof data === "object") {
        // Try multiple possible property names for the data
        xpub = data.xpub || data.extendedPublicKey || data.key;
        fingerprint = data.xfp || data.rootFingerprint || data.fingerprint;
        path = data.path || data.bip32Path || data.derivationPath;
      } else {
        this.setError("Invalid BCUR2 data format from QR code scan");
        return;
      }

      // Validate required fields
      if (!xpub) {
        this.setError("QR code does not contain extended public key");
        return;
      }

      if (!fingerprint) {
        fingerprint = "00000000"; // Default fingerprint
      }

      if (!path) {
        path = this.props.extendedPublicKeyImporter.bip32Path || "m/0'/0'";
      } // Set root fingerprint first
      validateAndSetRootFingerprint(fingerprint, (error) => {
        if (error) {
          this.setError(error);
          return;
        }
      });

      // Set BIP32 path
      validateAndSetBIP32Path(
        path,
        () => {
          validateAndSetExtendedPublicKey(xpub, this.setError);
        },
        this.setError,
      );
    } catch (e) {
      this.setError(e.message);
    }
  };

  onClear = () => {
    const { enableChangeMethod } = this.props;
    this.setError("");
    enableChangeMethod();
  };

  render = () => {
    const { extendedPublicKeyError } = this.state;

    return (
      <FormGroup>
        <Box mt={2}>
          <BCUR2Reader
            startText="Import Extended Public Key"
            onSuccess={this.import}
            onClear={this.onClear}
            width="400px"
            mode="xpub"
          />
        </Box>
        <FormHelperText error>{extendedPublicKeyError}</FormHelperText>
      </FormGroup>
    );
  };
}

BCUR2ExtendedPublicKeyImporter.propTypes = {
  enableChangeMethod: PropTypes.func.isRequired,
  extendedPublicKeyImporter: PropTypes.shape({
    bip32Path: PropTypes.string,
  }).isRequired,
  validateAndSetBIP32Path: PropTypes.func.isRequired,
  validateAndSetExtendedPublicKey: PropTypes.func.isRequired,
  validateAndSetRootFingerprint: PropTypes.func.isRequired,
};

export default BCUR2ExtendedPublicKeyImporter;
