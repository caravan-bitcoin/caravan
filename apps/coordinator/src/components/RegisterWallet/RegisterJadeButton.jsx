import React, { useState } from "react";
import { Button } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { JADE, RegisterWalletPolicy } from "@caravan/wallets";
import { getWalletConfig } from "../../selectors/wallet";
import { setErrorNotification } from "../../actions/errorNotificationActions";

const RegisterJadeButton= ({ ...otherProps }) => {
  const [isActive, setIsActive] = useState(false);
  const walletConfig = useSelector(getWalletConfig);
  const dispatch = useDispatch();

  const registerWallet = async () => {
    setIsActive(true);
    try {
      const interaction = new RegisterWalletPolicy({
        keystore: JADE,
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
      Register w/ Jade 
    </Button>
  );
};

export default RegisterJadeButton;
