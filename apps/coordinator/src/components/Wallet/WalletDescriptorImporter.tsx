import React, { Dispatch, useEffect, useState } from "react";
import { Button, TextField, Box } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";

import type { MultisigWalletConfig } from "@caravan/descriptors";
import { getWalletFromDescriptor, getChecksum } from "@caravan/descriptors";
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

  const handleClick = async () => {
    try {
      const config = await getWalletFromDescriptor(descriptor, network);
      const checksum = await getChecksum(descriptor);
      dispatch(updateWalletUuidAction(checksum));
      setWalletConfig(config);
    } catch (e) {
      console.error(e.message);
      setDescriptorError(e.message);
    }
  };

  const helperText = `Please enter one of the wallet's descriptors (change or receive).
Make sure any settings that are not in a descriptor are set before submitting.`;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <TextField
        multiline
        label="Descriptor"
        placeholder="sh(...)"
        onChange={handleChange}
        helperText={descriptorError || helperText}
        error={!!descriptorError}
      />
      <Button color="secondary" variant="contained" onClick={handleClick}>
        Import Descriptor
      </Button>
    </Box>
  );
};
