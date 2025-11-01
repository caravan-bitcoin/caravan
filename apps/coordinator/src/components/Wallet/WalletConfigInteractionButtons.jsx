import React from "react";
import PropTypes from "prop-types";
import { Button, Grid } from "@mui/material";
import { CARAVAN_CONFIG } from "./constants";
import { DownloadDescriptors } from "./DownloadDescriptors";
import { WalletConfigQRExport } from "../BCUR2";

const WalletConfigInteractionButtons = ({
  onClearFn,
  onDownloadFn,
  walletConfig,
  walletName,
}) => {
  const handleClearClick = (e) => {
    e.preventDefault();
    if (sessionStorage) sessionStorage.removeItem(CARAVAN_CONFIG);
    onClearFn(e);
  };

  return (
    <Grid container spacing={2}>
      <Grid item>
        <Button variant="contained" color="primary" onClick={onDownloadFn}>
          Download Wallet Details
        </Button>
      </Grid>
      <Grid item>
        <WalletConfigQRExport
          walletConfig={walletConfig}
          walletName={walletName}
        />
      </Grid>
      <Grid item>
        <Button
          onClick={(e) => handleClearClick(e)}
          variant="contained"
          color="warning"
        >
          Clear Wallet
        </Button>
      </Grid>
      <Grid item>
        <DownloadDescriptors />
      </Grid>
    </Grid>
  );
};

WalletConfigInteractionButtons.propTypes = {
  onClearFn: PropTypes.func.isRequired,
  onDownloadFn: PropTypes.func.isRequired,
  walletConfig: PropTypes.string.isRequired,
  walletName: PropTypes.string,
};

WalletConfigInteractionButtons.defaultProps = {
  walletName: "wallet",
};

export default WalletConfigInteractionButtons;
