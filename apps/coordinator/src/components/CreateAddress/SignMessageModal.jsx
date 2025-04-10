import React, { useState } from "react";
import PropTypes from "prop-types";
import { SignMessage, LEDGER, TREZOR } from "@caravan/wallets";
import { verifyMessageSignature } from "utils/verifyMessage";
import Copyable from "../Copyable";
import {
  Modal,
  Card,
  Typography,
  TextField,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Grid,
} from "@mui/material";
const SUPPORTED_KEYSTORES = {
  ledger: LEDGER,
  trezor: TREZOR,
};

const SignMessageModal = ({ onClose, multisig, publicKeyImporters }) => {
  const [keystoreType, setKeystoreType] = useState("");
  const [selectedKeyIndex, setSelectedKeyIndex] = useState("");
  const [message, setMessage] = useState("Sign to prove ownership of this multisig address.");
  const [signatureResult, setSignatureResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSignerChange = (e) => {
    const index = e.target.value;
    setSelectedKeyIndex(index);
  };

  const selectedImporter = publicKeyImporters?.[selectedKeyIndex] || {};
  const bip32Path = selectedImporter?.bip32Path || "";
  const publicKey = selectedImporter?.publicKey || "";

  const handleSign = async () => {
    setLoading(true);
    setSignatureResult(null);
    setError(null);

    try {
      const keystore = SUPPORTED_KEYSTORES[keystoreType];
      if (!keystore) throw new Error("Unsupported or missing keystore");
      if (!bip32Path || !publicKey) throw new Error("No signer selected");

      const interaction = SignMessage({ keystore, bip32Path, message });
      const result = await interaction.run();

      const verified = verifyMessageSignature(multisig.address, message, result.signature);

      setSignatureResult({
        signature: result.signature,
        verified,
      });
    } catch (e) {
      console.error("Signing failed:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open onClose={onClose}>
      <Card style={{ padding: 20, margin: "10% auto", width: 600 }}>
        <Typography variant="h6">Sign Message</Typography>

        <TextField
          select
          label="Keystore Type"
          fullWidth
          value={keystoreType}
          onChange={(e) => setKeystoreType(e.target.value)}
          margin="normal"
        >
          <MenuItem value="ledger">Ledger</MenuItem>
          <MenuItem value="trezor">Trezor</MenuItem>
        </TextField>

        <TextField
          select
          label="Select Signer (Public Key)"
          fullWidth
          value={selectedKeyIndex}
          onChange={handleSignerChange}
          margin="normal"
        >
          {Object.entries(publicKeyImporters).map(([index, importer]) => (
            <MenuItem key={index} value={index}>
              {importer.name || `Signer ${index}`} - {importer.publicKey.slice(0, 16)}...
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="BIP32 Path"
          fullWidth
          value={bip32Path}
          margin="normal"
          InputProps={{ readOnly: true }}
        />

        <TextField
          label="Message"
          fullWidth
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          multiline
          margin="normal"
        />

        <Box mt={2}>
          <Button
            variant="contained"
            color="primary"
            disabled={loading || !keystoreType || !publicKey || !bip32Path}
            onClick={handleSign}
          >
            {loading ? <CircularProgress size={16} /> : "Sign Message"}
          </Button>
        </Box>

        {signatureResult && (
          <Box mt={2}>
            <Typography>
              {signatureResult.verified ? "✅ Signature verified!" : "❌ Signature invalid"}
            </Typography>
            <Grid container alignItems="center" spacing={1} mt={1}>
              <Grid item>
                <strong>Signature (base64):</strong>
              </Grid>
              <Grid item xs>
                <Copyable text={signatureResult.signature} showIcon />
              </Grid>
            </Grid>
          </Box>
        )}


        {error && (
          <Box mt={2}>
            <Typography color="error">❌ Error: {error}</Typography>
          </Box>
        )}

        <Box mt={3}>
          <Button onClick={onClose} variant="contained" color="secondary">
            Close
          </Button>
        </Box>
      </Card>
    </Modal>
  );
};

SignMessageModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  multisig: PropTypes.object,
  publicKeyImporters: PropTypes.object.isRequired,
};

export default SignMessageModal;