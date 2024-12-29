import Copyable from "./Copyable";

import {
  deriveChildExtendedPublicKey,
  getNetworkFromPrefix,
  Network,
  validateBIP32Path,
  validateExtendedPublicKey,
} from "@caravan/bitcoin";
import { Box, Card, CardContent, CardHeader, TextField } from "@mui/material";
import { debounce } from "lodash";
import React, { useMemo, useState } from "react";

interface Event {
  target: { value: string };
}

export const DeriveXpub = () => {
  const [network, setNetwork] = useState<Network>(Network.MAINNET);
  const [xpub, setXpub] = useState("");
  const [xpubError, setXpubError] = useState("");
  const [bip32Path, setBip32Path] = useState("");
  const [bip32PathError, setBip32PathError] = useState("");

  const handleXpubChange = (event: Event) => {
    const { value } = event.target;
    if (!value) {
      setXpub("");
      setXpubError("");
      return;
    }

    const prefix = value.slice(0, 4);
    try {
      const network = getNetworkFromPrefix(prefix);
      const error = validateExtendedPublicKey(value, network);
      setNetwork(network);
      setXpub(value);
      setXpubError(error);
    } catch (e) {
      setXpubError(e.message);
    }
  };

  const debouncePathError = debounce((error: string) => {
    setBip32PathError(error);
  }, 450);

  const handleBIP32PathChange = (event: Event) => {
    let { value } = event.target;
    let error = "";

    if (value) {
      if (!value.startsWith("m")) value = `m/${value}`; // ensure depth 1 is validated
      try {
        error = validateBIP32Path(value, { mode: "unhardened" });
      } catch (e) {
        error = e.message;
      }
    }

    debouncePathError(error);
    if (!error || !value) {
      setBip32Path(value);
    }
  };

  const derivedXpub = useMemo(() => {
    if (!xpub || !bip32Path || xpubError || bip32PathError) return "";
    try {
      return deriveChildExtendedPublicKey(xpub, bip32Path, network);
    } catch (e) {
      debouncePathError(e.message);
      return "";
    }
  }, [xpub, bip32Path, xpubError, bip32PathError]);

  const derived = useMemo(() => {
    const text = (
      <TextField
        label="Derived"
        variant="standard"
        value={derivedXpub}
        multiline
        fullWidth
        InputProps={{
          readOnly: true,
        }}
      />
    );

    if (!derivedXpub) return text;
    return (
      <Copyable text={derivedXpub} showText={false}>
        {text}
      </Copyable>
    );
  }, [derivedXpub]);

  return (
    <Box>
      <Box>
        <h1>Extended Public Key Child Derivation</h1>
      </Box>
      <Card>
        <CardHeader title="XPUB" />
        <CardContent>
          <Box>
            <TextField
              label="Extended Public Key"
              variant="standard"
              onChange={handleXpubChange}
              error={!!xpubError}
              helperText={xpubError}
              multiline
              fullWidth
            />
          </Box>
          <Box mt={2}>
            <TextField
              label="BIP32 Path (relative to xpub)"
              variant="standard"
              onChange={handleBIP32PathChange}
              error={!!bip32PathError}
              helperText={bip32PathError}
              multiline
              fullWidth
            />
          </Box>
          <Box mt={4}>{derived}</Box>
        </CardContent>
      </Card>
    </Box>
  );
};
export default DeriveXpub;
