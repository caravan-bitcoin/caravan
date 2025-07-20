import React from "react";
import PropTypes from "prop-types";
import { Box, Typography, Alert, Button } from "@mui/material";
import BCUR2Reader from "./BCUR2Reader";
import { extractSignaturesFromPSBT } from "../../utils/psbtUtils";

class BCUR2SignatureImporter extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: "",
      showScanner: false,
    };
  }

  render = () => {
    const { error, showScanner } = this.state;
    return (
      <Box mt={2}>
        {!showScanner ? (
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={this.showScanner}
          >
            Scan PSBT QR Code
          </Button>
        ) : (
          <>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <BCUR2Reader
              mode="psbt"
              onPSBTSuccess={this.handlePSBTSuccess}
              onError={this.setError}
            />
          </>
        )}
      </Box>
    );
  };

  showScanner = () => {
    this.setState({ showScanner: true });
  };

  setError = (value) => {
    this.setState({ error: value });
  };

  handlePSBTSuccess = (psbtData) => {
    const { validateAndSetSignature } = this.props;
    
    try {
      // Extract signatures from the PSBT
      const signatures = extractSignaturesFromPSBT(psbtData);
      if (!signatures || signatures.length === 0) {
        this.setError("No signatures found in the PSBT");
        return;
      }
      
      // Use the existing validation function
      validateAndSetSignature(signatures, this.setError);
    } catch (e) {
      this.setError(`Failed to extract signatures: ${e.message}`);
    }
  };
}

BCUR2SignatureImporter.propTypes = {
  signatureImporter: PropTypes.shape({}).isRequired,
  validateAndSetSignature: PropTypes.func.isRequired,
};

export default BCUR2SignatureImporter;
