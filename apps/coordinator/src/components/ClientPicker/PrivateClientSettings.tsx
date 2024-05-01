import React from "react";

// Components
import { Grid, TextField, Button, FormHelperText, Box } from "@mui/material";

import { externalLink } from "utils/ExternalLink";
import {
  ClientSettings,
  setClientWalletName,
} from "../../actions/clientActions";
import { useDispatch } from "react-redux";

export interface PrivateClientSettingsProps {
  handleUrlChange: () => void;
  handleUsernameChange: () => void;
  handlePasswordChange: () => void;
  client: ClientSettings;
  urlError: string;
  usernameError: string;
  passwordError: string;
  privateNotes: string;
  connectSuccess: boolean;
  connectError: string;
  testConnection: () => void;
}

const PrivateClientSettings = ({
  handleUrlChange,
  handleUsernameChange,
  handlePasswordChange,
  client,
  urlError,
  usernameError,
  passwordError,
  privateNotes,
  connectSuccess,
  connectError,
  testConnection,
}: PrivateClientSettingsProps) => {
  const dispatch = useDispatch();

  const handleWalletNameChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    dispatch(setClientWalletName(event.target.value));
  };
  return (
    <div>
      <p>
        A <code>bitcoind</code>
        -compatible client is required to query UTXO data, estimate fees, and
        broadcast transactions.
      </p>
      <p>
        <small>
          {
            "Due to CORS requirements, you must use a proxy around the node. Instructions are available "
          }
          {externalLink(
            "https://github.com/caravan-bitcoin/caravan#adding-cors-headers",
            "here",
          )}
          {"."}
        </small>
      </p>
      <form>
        <Grid container direction="column" spacing={1}>
          <Grid item>
            <TextField
              fullWidth
              label="URL"
              value={client.url}
              variant="standard"
              onChange={handleUrlChange}
              error={urlError !== ""}
              helperText={urlError}
            />
          </Grid>

          <Grid item>
            <TextField
              id="bitcoind-username"
              fullWidth
              label="Username"
              value={client.username}
              variant="standard"
              onChange={handleUsernameChange}
              error={usernameError !== ""}
              helperText={usernameError}
            />
          </Grid>

          <Grid item>
            <TextField
              id="bitcoind-password"
              fullWidth
              type="password"
              label="Password"
              value={client.password}
              variant="standard"
              onChange={handlePasswordChange}
              error={passwordError !== ""}
              helperText={passwordError}
            />
          </Grid>
          <Grid item>
            <TextField
              id="wallet-name"
              fullWidth
              type="text"
              label="Wallet Name"
              value={client.walletName}
              variant="standard"
              onChange={handleWalletNameChange}
              helperText="Name of loaded wallet on bitcoind node (optional)"
            />
          </Grid>
          <Grid item>
            <Box mt={1}>
              <Button variant="contained" onClick={testConnection}>
                Test Connection
              </Button>
            </Box>
            <Box mt={2}>
              {connectSuccess && (
                <FormHelperText>Connection Success!</FormHelperText>
              )}
              {connectError !== "" && (
                <FormHelperText error>{connectError}</FormHelperText>
              )}
            </Box>
          </Grid>
        </Grid>
      </form>
      {privateNotes}
    </div>
  );
};

PrivateClientSettings.defaultProps = {
  urlError: "",
  usernameError: "",
  passwordError: "",
  privateNotes: React.createElement("span"),
};

export default PrivateClientSettings;
