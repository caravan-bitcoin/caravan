import React from "react";
import PropTypes from "prop-types";
import { BCUR2ExportExtendedPublicKey } from "@caravan/wallets";
import { FormGroup, FormHelperText } from "@mui/material";
import BCUR2Reader from "./BCUR2Reader";

class BCUR2ExtendedPublicKeyImporter extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      extendedPublicKeyError: "",
    };
  }

  interaction = () => {
    const { network, extendedPublicKeyImporter } = this.props;
    return new BCUR2ExportExtendedPublicKey({
      network,
      bip32Path: extendedPublicKeyImporter.bip32Path,
    });
  };

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
      // The data is already parsed as an object with the correct structure
      const { xpub, xfp: fingerprint, path } = data;

      validateAndSetRootFingerprint(fingerprint, (error) => {
        this.setError(error);
      });

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
        <BCUR2Reader
          startText="Import Extended Public Key"
          onSuccess={this.import}
          onClear={this.onClear}
          width="400px"
        />
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
  network: PropTypes.string.isRequired,
  validateAndSetBIP32Path: PropTypes.func.isRequired,
  validateAndSetExtendedPublicKey: PropTypes.func.isRequired,
  validateAndSetRootFingerprint: PropTypes.func.isRequired,
};

export default BCUR2ExtendedPublicKeyImporter;
