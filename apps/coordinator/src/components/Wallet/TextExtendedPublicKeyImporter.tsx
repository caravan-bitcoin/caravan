import React, { useEffect, useState } from "react";

// Components
import {
  TextField,
  Box,
  Button,
  Grid,
  Alert,
  AlertTitle,
  Typography,
} from "@mui/material";
import { Network, validateExtendedPublicKey } from "@caravan/bitcoin";
import { getBlindedXpub } from "@caravan/bip32";
import Copyable from "../Copyable";

const TextExtendedPublicKeyImporter = ({
  validateAndSetExtendedPublicKey,
  network,
}: {
  validateAndSetExtendedPublicKey: (
    extendedPublicKey: string,
    errCb: (e: string) => void,
  ) => void;
  network: Network;
}) => {
  const [error, setError] = useState("");
  const [xpub, setXpub] = useState("");
  const [original, setOriginal] = useState("");
  const [blindedPath, setBlindedPath] = useState("");

  const handleSubmit = () => {
    validateAndSetExtendedPublicKey(xpub, setError);
  };

  const handleBlind = () => {
    setOriginal(xpub);
    const blinded = getBlindedXpub(xpub);
    setXpub(blinded.xpub);
    setBlindedPath(blinded.bip32Path);
  };

  useEffect(() => {
    if (xpub) {
      const error = validateExtendedPublicKey(xpub, network);
      setError(error);
    }
  }, [xpub]);

  return (
    <Box mt={2}>
      <TextField
        fullWidth
        name="publicKey"
        label="Extended Public Key"
        value={xpub}
        variant="standard"
        onChange={(e) => setXpub(e.target.value)}
        error={error !== ""}
        helperText={error}
        multiline
        disabled={Boolean(original && blindedPath)}
      />
      <Grid container style={{ marginTop: "12px" }} spacing={2}>
        <Grid item>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            Enter
          </Button>
        </Grid>
        <Grid item>
          <Button
            variant="outlined"
            color="info"
            disabled={!(!error && xpub)}
            onClick={handleBlind}
          >
            Blind
          </Button>
        </Grid>
      </Grid>
      {blindedPath && original && (
        <Box my={4}>
          <Alert variant="outlined" severity="warning">
            <AlertTitle>
              <h3 style={{ marginTop: "0px" }}>
                Blinded Info (IMPORTANT: Save this info)
              </h3>
            </AlertTitle>
            <Typography my={1}>
              <strong>
                Without the full bip32 path, your funds will be irrecoverable
              </strong>
              . This notice will disappear once you hit &quot;Enter&quot;.
            </Typography>
            <Typography variant="h6">Blinded Path:</Typography>
            <Copyable showIcon text={blindedPath} />
            <Typography variant="h6"> Source Xpub:</Typography>
            <Copyable showIcon text={original} />
            <Typography variant="h6">Blinded Xpub:</Typography>
            <Copyable showIcon text={xpub} />
          </Alert>
        </Box>
      )}
    </Box>
  );
};

export default TextExtendedPublicKeyImporter;
