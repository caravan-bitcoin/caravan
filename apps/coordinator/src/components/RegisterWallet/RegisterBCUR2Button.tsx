import React, { useMemo, useState } from "react";
import { Button } from "@mui/material";
import { useSelector } from "react-redux";
import { BCUR2, RegisterWalletPolicy } from "@caravan/wallets";
import { getWalletConfig } from "../../selectors/wallet";
import { BCUR2Encoder as BCUR2Display } from "../BCUR2";

export const RegisterBCUR2Button = ({
  title = "Register w/ BCUR2",
  ...otherProps
}: {
  title: string;
}) => {
  const [isActive, setIsActive] = useState(false);
  const walletConfig = useSelector(getWalletConfig);

  const parts = useMemo(() => {
    return RegisterWalletPolicy({ keystore: BCUR2, ...walletConfig }).request()
      ?.qrCodeFrames;
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
        {title}
      </Button>
    </>
  );
};
