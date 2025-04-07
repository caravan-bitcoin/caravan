import React, { useState } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import * as bitcoin from "bitcoinjs-lib";
import { Signer } from "bip322-js";
const { payments } = bitcoin;

import { ECPairFactory } from "ecpair";
import * as ecc from "tiny-secp256k1";
import { Buffer } from "buffer";
// initialize ECPair
const ECPair = ECPairFactory(ecc);
import {
  generateMultisigFromPublicKeys,
  scriptToHex,
  multisigRedeemScript,
  multisigWitnessScript,
  validatePublicKey,
} from "@caravan/bitcoin";
import {
  Box,
  Grid,
  Button,
  Card,
  CardHeader,
  CardContent,
  FormHelperText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
} from "@mui/material";
import { downloadFile } from "utils";
import { externalLink } from "utils/ExternalLink";
import Copyable from "../Copyable";

// Actions
import {
  sortPublicKeyImporters as sortPublicKeyImportersAction,
  setMultisigAddress as setMultisigAddressAction,
} from "../../actions/publicKeyImporterActions";

// Components
import MultisigDetails from "../MultisigDetails";
import Conflict from "./Conflict";

const AddressGenerator = ({
  publicKeyImporters,
  addressType,
  sortPublicKeyImporters,
  network,
  totalSigners,
  requiredSigners,
  setMultisigAddress,
}) => {
  const [isSignMessageOpen, setSignMessageOpen] = useState(false);
  const [messageToSign, setMessageToSign] = useState("");
  const [selectedPublicKey, setSelectedPublicKey] = useState("");
  const [privateKeyType, setPrivateKeyType] = useState("wif");
  const [privateKey, setPrivateKey] = useState("");
  const [signedMessage, setSignedMessage] = useState("");
  const [keyMismatchError, setKeyMismatchError] = useState("");

  const getBitcoinNetwork = () => {
    return network === "testnet"
      ? bitcoin.networks.testnet
      : bitcoin.networks.bitcoin;
  };

  const handleSignMessageOpen = () => setSignMessageOpen(true);
  const handleSignMessageClose = () => {
    setSignMessageOpen(false);
    setMessageToSign("");
    setSelectedPublicKey("");
    setPrivateKey("");
    setKeyMismatchError("");
  };

  const handlePrivateKeyChange = (event) => {
    const key = event.target.value;
    setPrivateKey(key);

    try {
      let keyPair;
      if (privateKeyType === "wif") {
        keyPair = ECPair.fromWIF(key, getBitcoinNetwork());
      }
      const derivedKey = Buffer.from(keyPair.publicKey).toString("hex");

      if (selectedPublicKey) {
        if (derivedKey !== selectedPublicKey) {
          setKeyMismatchError(
            "The private key does not match the selected public key.",
          );
        } else {
          setKeyMismatchError("");
        }
      }
    } catch (err) {
      setKeyMismatchError("Invalid private key.");
    }
  };

  const handleSignMessage = async () => {
    try {
      let keyPair;
      const bitcoinNetwork = getBitcoinNetwork();

      if (privateKeyType === "wif") {
        keyPair = ECPair.fromWIF(privateKey, bitcoinNetwork);
      }

      if (!keyPair || !keyPair.privateKey) {
        throw new Error("Invalid key pair generated.");
      }

      const address = payments.p2pkh({
        pubkey: Buffer.from(keyPair.publicKey),
        network: bitcoinNetwork,
      }).address;

      const wif = keyPair.toWIF();
      const signature = Signer.sign(wif, address, messageToSign);

      // Convert the signature to base64 format
      const base64Signature = Buffer.from(signature).toString("base64");
      setSignedMessage(base64Signature);
      handleSignMessageClose();
    } catch (err) {
      setSignedMessage("Failed to sign message.");
    }
  };

  const handlePublicKeyChange = (event) => {
    const newSelectedPublicKey = event.target.value;
    setSelectedPublicKey(newSelectedPublicKey);
    setPrivateKey("");
    setKeyMismatchError("");
  };

  const isInConflict = () => {
    return Object.values(publicKeyImporters).some(
      (importer) => importer.conflict,
    );
  };

  const publicKeyCount = () => {
    return Object.values(publicKeyImporters).filter(
      ({ publicKey, finalized }) => {
        return finalized && !validatePublicKey(publicKey, addressType);
      },
    ).length;
  };

  const publicKeysAreCanonicallySorted = () => {
    const publicKeys = Object.values(publicKeyImporters)
      .map((publicKeyImporter) => publicKeyImporter.publicKey)
      .filter((publicKey) => publicKey !== "");
    const sortedPublicKeys = Object.values(publicKeyImporters)
      .map((publicKeyImporter) => publicKeyImporter.publicKey)
      .filter((publicKey) => publicKey !== "")
      .sort(); // sort mutates the array
    const sorted =
      publicKeys.filter((publicKey, index) => {
        return publicKey === sortedPublicKeys[index];
      }).length === publicKeys.length;
    return sorted;
  };

  const canonicallySortPublicKeys = () => {
    sortPublicKeyImporters();
  };

  const generateMultisig = () => {
    const publicKeys = [];
    for (
      let publicKeyImporterNum = 1;
      publicKeyImporterNum <= totalSigners;
      publicKeyImporterNum += 1
    ) {
      publicKeys.push(publicKeyImporters[publicKeyImporterNum].publicKey);
    }

    const multisig = generateMultisigFromPublicKeys(
      network,
      addressType,
      requiredSigners,
      ...publicKeys,
    );
    setMultisigAddress(multisig.address);
    return multisig;
  };

  const addressDetailsFilename = (multisig) => {
    return `bitcoin-${requiredSigners}-of-${totalSigners}-${addressType}-${multisig.address}.txt`;
  };

  const publicKeyImporterBIP32Path = (number) => {
    const publicKeyImporter = publicKeyImporters[number];
    const bip32Path =
      publicKeyImporter.method === "text"
        ? "Unknown (make sure you have written this down previously!)"
        : publicKeyImporter.bip32Path;
    return `  * ${publicKeyImporter.name}: ${bip32Path}: ${publicKeyImporter.publicKey}`;
  };

  const publicKeyImporterBIP32Paths = () => {
    const formattedReturnArray = [];
    for (
      let publicKeyImporterNum = 1;
      publicKeyImporterNum <= totalSigners;
      publicKeyImporterNum += 1
    ) {
      formattedReturnArray.push(
        publicKeyImporterBIP32Path(publicKeyImporterNum),
      );
    }
    return formattedReturnArray.join("\n");
  };

  const addressDetailsText = (multisig) => {
    const redeemScript = multisigRedeemScript(multisig);
    const witnessScript = multisigWitnessScript(multisig);
    const redeemScriptLine = redeemScript
      ? `Redeem Script: ${scriptToHex(redeemScript)}`
      : "";
    const witnessScriptLine = witnessScript
      ? `Witness Script: ${scriptToHex(witnessScript)}`
      : "";
    const scriptsSpacer = redeemScript && witnessScript ? "\n\n" : "";
    return `Address: ${multisig.address}

Type: ${addressType}

Network: ${network}

Quorum: ${requiredSigners}-of-${totalSigners}

BIP32 Paths:
${publicKeyImporterBIP32Paths()}

${redeemScriptLine}${scriptsSpacer}${witnessScriptLine}
`;
  };

  const downloadAddressDetails = (event) => {
    event.preventDefault();
    const multisig = generateMultisig();
    const body = addressDetailsText(multisig);
    const filename = addressDetailsFilename(multisig);
    downloadFile(body, filename);
  };

  const title = () => {
    return (
      <Grid container justifyContent="space-between">
        <Grid item>
          {requiredSigners}
          -of-
          {totalSigners} Multisig {addressType}{" "}
        </Grid>
        <Grid item>
          <small>{`Public Keys: ${publicKeyCount()}/${totalSigners}`}</small>
        </Grid>
      </Grid>
    );
  };

  const body = () => {
    if (publicKeyCount() === totalSigners) {
      const multisig = generateMultisig();

      const canonicallySorted = publicKeysAreCanonicallySorted();
      return (
        <div>
          {isInConflict() && <Conflict />}
          {!canonicallySorted && (
            <Grid container justifyContent="space-between">
              <Grid item md={8}>
                <FormHelperText error>
                  WARNING: These public keys are not in the standard{" "}
                  {externalLink(
                    "https://github.com/bitcoin/bips/blob/master/bip-0067.mediawiki",
                    "BIP67 order",
                  )}
                  .
                </FormHelperText>
              </Grid>
              <Grid item md={4}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={canonicallySortPublicKeys}
                >
                  Sort Public Keys
                </Button>
              </Grid>
            </Grid>
          )}

          <Box mt={2}>
            <MultisigDetails multisig={multisig} />
          </Box>

          {signedMessage && (
            <Box mt={2}>
              <Grid container alignItems="center" spacing={2}>
                <Grid item>
                  <strong>Signed Message:</strong>
                </Grid>
                <Grid item>
                  <Copyable text={signedMessage} showIcon />
                </Grid>
              </Grid>
            </Box>
          )}

          <Box mt={2}>
            <Button
              variant="contained"
              color="primary"
              onClick={downloadAddressDetails}
            >
              Download Address Details
            </Button>
          </Box>
          <Box mt={2}>
            <Button
              variant="contained"
              color="secondary"
              onClick={handleSignMessageOpen}
            >
              Sign Message
            </Button>
          </Box>
        </div>
      );
    }
    return (
      <p>
        {`Once you have imported all ${totalSigners} public keys, your address details will be displayed here.`}
      </p>
    );
  };

  const publicKeyOptions = Object.values(publicKeyImporters)
    .filter(({ publicKey }) => publicKey) // Only include valid public keys
    .map(({ publicKey }, index) => ({
      label: `Public Key ${index + 1}`,
      value: publicKey,
    }));

  return (
    <>
      <Card>
        <CardHeader title={title()} />
        <CardContent>{body()}</CardContent>
      </Card>
      <Dialog
        open={isSignMessageOpen}
        onClose={handleSignMessageClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Sign Message</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Message"
            value={messageToSign}
            onChange={(e) => setMessageToSign(e.target.value)}
            variant="standard"
          />
          <Box mt={2}>
            <TextField
              select
              fullWidth
              label="Public Key"
              value={selectedPublicKey}
              onChange={handlePublicKeyChange} // Use the new handler
              variant="standard"
            >
              {publicKeyOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>
          <Box mt={2}>
            <TextField
              select
              fullWidth
              label="Private Key Type"
              value={privateKeyType}
              onChange={(e) => setPrivateKeyType(e.target.value)}
              variant="standard"
              disabled
            >
              <MenuItem value="wif">WIF</MenuItem>
            </TextField>
          </Box>
          <Box mt={2}>
            <TextField
              fullWidth
              label="Private Key"
              value={privateKey}
              onChange={handlePrivateKeyChange}
              variant="standard"
              disabled={!selectedPublicKey} // Disable until a public key is selected
              error={!!keyMismatchError}
              helperText={keyMismatchError}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSignMessageClose} color="secondary">
            Cancel
          </Button>
          <Button
            onClick={handleSignMessage}
            color="primary"
            disabled={
              !messageToSign ||
              !privateKey ||
              !selectedPublicKey ||
              !!keyMismatchError
            }
          >
            Sign
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

AddressGenerator.propTypes = {
  network: PropTypes.string.isRequired,
  totalSigners: PropTypes.number.isRequired,
  requiredSigners: PropTypes.number.isRequired,
  addressType: PropTypes.string.isRequired,
  publicKeyImporters: PropTypes.shape({}).isRequired,
  sortPublicKeyImporters: PropTypes.func.isRequired,
  setMultisigAddress: PropTypes.func.isRequired,
};

function mapStateToProps(state) {
  return {
    ...state.settings,
    ...state.address,
  };
}

const mapDispatchToProps = {
  sortPublicKeyImporters: sortPublicKeyImportersAction,
  setMultisigAddress: setMultisigAddressAction,
};

export default connect(mapStateToProps, mapDispatchToProps)(AddressGenerator);
