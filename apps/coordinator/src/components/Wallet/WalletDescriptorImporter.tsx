import React, { Dispatch, useEffect, useState } from "react";
import { Button, TextField, Box, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";

import type { MultisigWalletConfig } from "@caravan/descriptors";
import { getWalletFromDescriptor } from "@caravan/descriptors";
import { KeyOrigin } from "@caravan/wallets";
import {
  setRequiredSigners,
  setTotalSigners,
} from "../../actions/transactionActions";
import { setAddressType } from "../../actions/settingsActions";
import {
  setExtendedPublicKeyImporterBIP32Path,
  setExtendedPublicKeyImporterExtendedPublicKey,
  setExtendedPublicKeyImporterExtendedPublicKeyRootFingerprint,
  setExtendedPublicKeyImporterFinalized,
  setExtendedPublicKeyImporterMethod,
  setExtendedPublicKeyImporterName,
} from "../../actions/extendedPublicKeyImporterActions";
import { updateWalletUuidAction } from "../../actions/walletActions";
import { BitcoinNetwork, MultisigAddressType } from "@caravan/bitcoin";
import {
  parseDescriptorInput,
  selectDescriptor,
  ensureChecksum,
  extractChecksum,
} from "../../utils/descriptors";

const importWalletDetails = (
  {
    keyOrigins,
    requiredSigners,
    addressType,
  }: {
    keyOrigins: KeyOrigin[];
    requiredSigners: number;
    addressType: MultisigAddressType;
  },
  dispatch: Dispatch<any>,
) => {
  dispatch(setTotalSigners(keyOrigins.length));
  dispatch(setRequiredSigners(requiredSigners));
  dispatch(setAddressType(addressType));
  keyOrigins.forEach(({ xfp, bip32Path, xpub }, index) => {
    const number = index + 1;
    dispatch(setExtendedPublicKeyImporterName(number, `key_${number}_${xfp}`));
    dispatch(setExtendedPublicKeyImporterMethod(number, "text"));
    dispatch(setExtendedPublicKeyImporterBIP32Path(number, bip32Path));
    dispatch(
      setExtendedPublicKeyImporterExtendedPublicKeyRootFingerprint(number, xfp),
    );
    dispatch(setExtendedPublicKeyImporterExtendedPublicKey(number, xpub));
    dispatch(setExtendedPublicKeyImporterFinalized(number, true));
  });
};

export const WalletDescriptorImporter = () => {
  const [walletConfig, setWalletConfig] = useState<MultisigWalletConfig>();
  const [descriptor, setDescriptor] = useState<string>("");
  const [descriptorError, setDescriptorError] = useState<string>("");

  const network = useSelector(
    (state: { quorum: { network: BitcoinNetwork } }) => state.quorum.network,
  );
  const dispatch = useDispatch();
  useEffect(() => {
    if (walletConfig) {
      importWalletDetails(walletConfig, dispatch);
    }
  }, [walletConfig]);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();

    const { value } = e.target;

    if (!value) {
      setDescriptorError("");
    } else {
      setDescriptor(value);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setDescriptorError("");

    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    // Reset file input
    e.target.value = "";

    const maxSize = 5 * 1024; // 5KB
    if (file.size > maxSize) {
      setDescriptorError(`File too large. Maximum size is 10KB.`);
      return;
    }

    try {
      const text = await file.text();
      await processDescriptorInput(text);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(errorMessage);
      setDescriptorError(`File import error: ${errorMessage}`);
    }
  };

  const processDescriptorInput = async (input: string) => {
    try {
      // Parse and select best descriptor (priority: multipath > receive > change)
      const parsed = parseDescriptorInput(input);
      const descriptorToUse = selectDescriptor(parsed);

      if (!descriptorToUse) {
        throw new Error("No valid descriptor found in input");
      }

      // Ensure descriptor has a checksum (required by getWalletFromDescriptor)
      const descriptorWithChecksum = await ensureChecksum(descriptorToUse);

      // Parse the descriptor to get wallet config
      const config = await getWalletFromDescriptor(
        descriptorWithChecksum,
        network,
      );
      // Extract checksum from descriptor for wallet UUID
      const checksum = extractChecksum(descriptorWithChecksum) || "";
      dispatch(updateWalletUuidAction(checksum));
      setWalletConfig(config);
      setDescriptorError("");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse descriptor: ${errorMessage}`);
    }
  };

  const handleClick = async () => {
    if (!descriptor.trim()) {
      setDescriptorError("Please enter a descriptor");
      return;
    }

    try {
      await processDescriptorInput(descriptor);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(errorMessage);
      setDescriptorError(errorMessage);
    }
  };

  const helperText = `You can import descriptors in multiple formats:
- JSON format: { "change": "...", "receive": "...", "multipath": "..." }
- Sparrow format: Text file with comments and descriptors
- Plain descriptor: Single descriptor (multipath, receive, or change)
- Multipath descriptor: BIP389 format with <0;1>/* notation`;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <TextField
        multiline
        rows={4}
        label="Descriptor"
        placeholder="Paste descriptor text, JSON, or Sparrow format here..."
        value={descriptor}
        onChange={handleChange}
        helperText={descriptorError || helperText}
        error={!!descriptorError}
      />
      <Box sx={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <Button color="secondary" variant="contained" onClick={handleClick}>
          Import Descriptor
        </Button>
        <label htmlFor="descriptor-file-upload">
          <input
            style={{ display: "none" }}
            id="descriptor-file-upload"
            type="file"
            accept=".txt,.json,text/plain,application/json"
            onChange={handleFileUpload}
          />
          <Button variant="outlined" component="span">
            Upload File
          </Button>
        </label>
      </Box>
      <Typography variant="caption" color="text.secondary">
        Supported formats: JSON, Sparrow text format, or plain descriptor text
      </Typography>
    </Box>
  );
};
