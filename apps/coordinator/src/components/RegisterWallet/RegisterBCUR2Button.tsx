import React, { useMemo, useState } from "react";
import { Button } from "@mui/material";
import { useSelector } from "react-redux";
import {
  BCUR2Encoder,
  COLDCARD,
  ColdcardMultisigWalletConfig,
  ConfigAdapter,
  MultisigWalletConfig,
} from "@caravan/wallets";
import { getWalletConfig } from "../../selectors/wallet";
import { BCUR2Encoder as BCUR2Display } from "../BCUR2";

export const getColdcardConfig = (walletConfig: MultisigWalletConfig) => {
  const interaction = ConfigAdapter({
    KEYSTORE: COLDCARD,
    jsonConfig: walletConfig,
  });
  return (interaction as ColdcardMultisigWalletConfig).adapt();
};

export const RegisterBCUR2Button = ({ ...otherProps }) => {
  const [isActive, setIsActive] = useState(false);
  const walletConfig = useSelector(getWalletConfig);

  const parts = useMemo(() => {
    const registrationData = getColdcardConfig(walletConfig);
    const encoder = new BCUR2Encoder(registrationData, 121, "bytes");
    return encoder.qrFragments;
  }, [walletConfig]);

  return (
    <>
      <BCUR2Display
        open={isActive}
        onClose={() => setIsActive(false)}
        qrCodeFrames={parts}
        title="Scan QR Codes to Register Wallet"
        instructions="Use your BCUR2-compatible wallet to scan the following QR codes in sequence to register your wallet."
      />
      <Button
        variant="outlined"
        onClick={() => setIsActive(true)}
        disabled={isActive}
        {...otherProps}
      >
        Register w/ BCUR2
      </Button>
    </>
  );
};
