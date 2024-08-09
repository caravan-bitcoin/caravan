import React, { useState } from "react";
import { Button } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { BITBOX, RegisterWalletPolicy } from "@caravan/wallets";
import { getWalletConfig } from "../../selectors/wallet";
import { setErrorNotification } from "../../actions/errorNotificationActions";

const RegisterBitBoxButton = ({ ...otherProps }) => {
  const [isActive, setIsActive] = useState(false);
  const walletConfig = useSelector(getWalletConfig);
  const dispatch = useDispatch();

  const registerWallet = async () => {
    setIsActive(true);
    try {
      const interaction = new RegisterWalletPolicy({
        keystore: BITBOX,
        ...walletConfig,
      });
      await interaction.run();
    } catch (e) {
      dispatch(setErrorNotification(e.message));
    } finally {
      setIsActive(false);
    }
  };
  return (
    <Button
      variant="outlined"
      onClick={registerWallet}
      disabled={isActive}
      {...otherProps}
    >
      Register w/ BitBox
    </Button>
  );
};

export default RegisterBitBoxButton;
