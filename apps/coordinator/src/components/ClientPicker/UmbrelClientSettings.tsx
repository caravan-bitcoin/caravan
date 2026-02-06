import React from "react";
import { Grid, TextField, Button, FormHelperText, Box } from "@mui/material";
import { ClientSettings } from "../../actions/clientActions";

export interface UmbrelClientSettingsProps {
  client: ClientSettings;
  handleWalletNameChange: (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => void;
  connectSuccess: boolean;
  connectError: string;
  testConnection: () => void;
}

const UmbrelClientSettings = ({
  client,
  handleWalletNameChange,
  connectSuccess,
  connectError,
  testConnection,
}: UmbrelClientSettingsProps) => {
  return (
    <div>
      <p>
        Connect directly to the Bitcoin Core node running on your Umbrel. The
        RPC connection is automatically configured through the built-in proxy.
      </p>
      <p>
        <small>
          No URL or credentials needed &mdash; authentication is handled
          automatically by the Umbrel app.
        </small>
      </p>
      <form>
        <Grid container direction="column" spacing={1}>
          <Grid item>
            <TextField
              id="umbrel-wallet-name"
              fullWidth
              type="text"
              label="Wallet Name"
              value={client.walletName}
              variant="standard"
              onChange={handleWalletNameChange}
              helperText="Name of loaded wallet on your Umbrel Bitcoin node (optional)"
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
                <FormHelperText>
                  Connected to Umbrel Bitcoin node!
                </FormHelperText>
              )}
              {connectError !== "" && (
                <FormHelperText error>{connectError}</FormHelperText>
              )}
            </Box>
          </Grid>
        </Grid>
      </form>
    </div>
  );
};

export default UmbrelClientSettings;
