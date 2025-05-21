import React, { useState } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import {
  Grid,
  Card,
  CardHeader,
  CardContent,
  FormControlLabel,
  FormControl,
  Radio,
  RadioGroup,
} from "@mui/material";
import { ClientType, PublicBitcoinProvider } from "@caravan/clients";

// Components

// Actions
import { wrappedActions } from "../../actions/utils";
import {
  SET_CLIENT_TYPE,
  SET_CLIENT_URL,
  SET_CLIENT_USERNAME,
  SET_CLIENT_PASSWORD,
  SET_CLIENT_URL_ERROR,
  SET_CLIENT_USERNAME_ERROR,
  SET_CLIENT_PASSWORD_ERROR,
  SET_CLIENT_PROVIDER,
} from "../../actions/clientActions";

import PrivateClientSettings from "./PrivateClientSettings";
import { useGetClient } from "../../hooks";

const ClientPicker = ({
  setType,
  network,
  setUrl,
  setUrlError,
  setUsername,
  setUsernameError,
  setPassword,
  setPasswordError,
  client,
  onSuccess,
  urlError,
  usernameError,
  passwordError,
  privateNotes,
  setProvider,
}) => {
  const [urlEdited, setUrlEdited] = useState(false);
  const [connectError, setConnectError] = useState("");
  const [connectSuccess, setConnectSuccess] = useState(false);
  const blockchainClient = useGetClient();

  const validatePassword = () => {
    return "";
  };

  const validateUsername = () => {
    return "";
  };

  const validateUrl = (host) => {
    const validhost = /^http(s)?:\/\/[^\s]+$/.exec(host);
    if (!validhost) return "Must be a valid URL.";
    return "";
  };

  const handleTypeChange = async (event) => {
    const value = event.target.value;
    if (value === ClientType.PRIVATE) {
      if (!urlEdited) {
        setUrl(`http://localhost:${network === "mainnet" ? 8332 : 18332}`);
      }
      setType(ClientType.PRIVATE);
    } else {
      setType(ClientType.PUBLIC);
      // Set the provider based on selection
      const provider =
        value === "mempool"
          ? PublicBitcoinProvider.MEMPOOL
          : PublicBitcoinProvider.BLOCKSTREAM;
      if (setProvider) {
        setProvider(provider);
      }
    }
  };

  const handleUrlChange = async (event) => {
    const url = event.target.value;
    const error = validateUrl(url);
    if (!urlEdited && !error) setUrlEdited(true);
    setUrl(url);
    setUrlError(error);
  };

  const handleUsernameChange = (event) => {
    const username = event.target.value;
    const error = validateUsername(username);
    setUsername(username);
    setUsernameError(error);
  };

  const handlePasswordChange = async (event) => {
    const password = event.target.value;
    const error = validatePassword(password);
    setPassword(password);
    setPasswordError(error);
  };

  const testConnection = async () => {
    setConnectError("");
    setConnectSuccess(false);
    try {
      if (blockchainClient.bitcoindParams.walletName) {
        await blockchainClient.getWalletInfo();
      } else {
        await blockchainClient.getFeeEstimate();
      }
      if (onSuccess) {
        onSuccess();
      }
      setConnectSuccess(true);
    } catch (e) {
      setConnectError(e.response?.data?.error?.message || e.message);
    }
  };

  return (
    <Card>
      <Grid container justifyContent="space-between">
        <CardHeader title="Bitcoin Client" />
      </Grid>
      <CardContent>
        <Grid item>
          <FormControl component="fieldset">
            <RadioGroup>
              <FormControlLabel
                id={PublicBitcoinProvider.MEMPOOL}
                control={<Radio color="primary" />}
                name="clientType"
                value={PublicBitcoinProvider.MEMPOOL}
                label={<strong>Mempool.space</strong>}
                onChange={handleTypeChange}
                checked={
                  client.type === ClientType.PUBLIC &&
                  client.provider === PublicBitcoinProvider.MEMPOOL
                }
              />
              <FormControlLabel
                id={PublicBitcoinProvider.BLOCKSTREAM}
                control={<Radio color="primary" />}
                name="clientType"
                value={PublicBitcoinProvider.BLOCKSTREAM}
                label={<strong>Blockstream.info</strong>}
                onChange={handleTypeChange}
                checked={
                  client.type === ClientType.PUBLIC &&
                  client.provider === PublicBitcoinProvider.BLOCKSTREAM
                }
              />
              <FormControlLabel
                id={ClientType.PRIVATE}
                control={<Radio color="primary" />}
                name="clientType"
                value={ClientType.PRIVATE}
                label="Private"
                onChange={handleTypeChange}
                checked={client.type === ClientType.PRIVATE}
              />
            </RadioGroup>
            {client.type === ClientType.PRIVATE && (
              <PrivateClientSettings
                handleUrlChange={(event) => handleUrlChange(event)}
                handleUsernameChange={(event) => handleUsernameChange(event)}
                handlePasswordChange={(event) => handlePasswordChange(event)}
                client={client}
                urlError={urlError}
                usernameError={usernameError}
                passwordError={passwordError}
                privateNotes={privateNotes}
                connectSuccess={connectSuccess}
                connectError={connectError}
                testConnection={() => testConnection()}
              />
            )}
          </FormControl>
        </Grid>
      </CardContent>
    </Card>
  );
};

ClientPicker.propTypes = {
  client: PropTypes.shape({
    type: PropTypes.string.isRequired,
    provider: PropTypes.string,
  }).isRequired,
  network: PropTypes.string.isRequired,
  privateNotes: PropTypes.shape({}),
  setUrl: PropTypes.func.isRequired,
  urlError: PropTypes.string,
  onSuccess: PropTypes.func,
  setUrlError: PropTypes.func.isRequired,
  setPassword: PropTypes.func.isRequired,
  passwordError: PropTypes.string,
  setPasswordError: PropTypes.func.isRequired,
  setType: PropTypes.func.isRequired,
  usernameError: PropTypes.string,
  setUsername: PropTypes.func.isRequired,
  setUsernameError: PropTypes.func.isRequired,
  setProvider: PropTypes.func,
};

ClientPicker.defaultProps = {
  urlError: "",
  usernameError: "",
  onSuccess: null,
  passwordError: "",
  privateNotes: React.createElement("span"),
};

function mapStateToProps(state) {
  return {
    network: state.settings.network,
    client: state.client,
    urlError: state.client.urlError,
    url: state.client.url,
  };
}

export default connect(
  mapStateToProps,
  wrappedActions({
    setType: SET_CLIENT_TYPE,
    setUrl: SET_CLIENT_URL,
    setUsername: SET_CLIENT_USERNAME,
    setPassword: SET_CLIENT_PASSWORD,
    setUrlError: SET_CLIENT_URL_ERROR,
    setUsernameError: SET_CLIENT_USERNAME_ERROR,
    setPasswordError: SET_CLIENT_PASSWORD_ERROR,
    setProvider: SET_CLIENT_PROVIDER,
  }),
)(ClientPicker);
