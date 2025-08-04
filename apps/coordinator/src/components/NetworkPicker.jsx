import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { Network } from "@caravan/bitcoin";

// Components

import {
  Card,
  CardHeader,
  CardContent,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormHelperText,
} from "@mui/material";

// Actions
import { setNetwork as setNetworkAction } from "../actions/settingsActions";

const NetworkPicker = ({ setNetwork, network, frozen }) => {
  const handleNetworkChange = (event) => {
    setNetwork(event.target.value);
  };

  return (
    <Card>
      <CardHeader title="Network" />
      <CardContent>
        <FormControl component="fieldset">
          <RadioGroup>
            <FormControlLabel
              id="mainnet"
              control={<Radio color="primary" />}
              name="network"
              value="mainnet"
              label={<strong>Mainnet</strong>}
              onChange={handleNetworkChange}
              checked={network === Network.MAINNET}
              disabled={frozen}
            />
            <FormControlLabel
              id="testnet"
              control={<Radio color="primary" />}
              name="network"
              value="testnet"
              label="Testnet"
              onChange={handleNetworkChange}
              checked={network === Network.TESTNET}
              disabled={frozen}
            />
            <FormControlLabel
              id="regtest"
              control={<Radio color="primary" />}
              name="network"
              value="regtest"
              label="Regtest"
              onChange={handleNetworkChange}
              checked={network === Network.REGTEST}
              disabled={frozen}
            />
          </RadioGroup>
          <FormHelperText>
            <small>
              Choose &apos;Mainnet&apos; for real Bitcoin, &apos;Testnet&apos;
              for testing with test coins, or &apos;Regtest&apos; for local
              development with a private bitcoind node.
            </small>
          </FormHelperText>
        </FormControl>
      </CardContent>
    </Card>
  );
};

NetworkPicker.propTypes = {
  network: PropTypes.string.isRequired,
  frozen: PropTypes.bool.isRequired,
  setNetwork: PropTypes.func.isRequired,
};

function mapStateToProps(state) {
  return {
    network: state.settings.network,
    frozen: state.settings.frozen,
  };
}

const mapDispatchToProps = {
  setNetwork: setNetworkAction,
};

export default connect(mapStateToProps, mapDispatchToProps)(NetworkPicker);
