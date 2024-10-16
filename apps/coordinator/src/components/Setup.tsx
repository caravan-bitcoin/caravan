import React from "react";
import "./styles.css"; // Import the CSS file

// Components
import {
  Box,
  Typography,
  CardContent,
  Grid,
  Card,
  Button,
} from "@mui/material";
import {
  AccountBalanceWallet,
  SportsVolleyball,
} from "@mui/icons-material";
import { Link } from "react-router-dom";

const Setup = () => (
  <Box
    display="flex"
    justifyContent="center"
    alignItems="flex-start"
    minHeight="100vh"
    mt={10}
  >
    <Grid container spacing={3} justifyContent="center">
      <Grid item md={8}>
        <Card>
          <Typography variant="h5" align="center" fontWeight="Bold">
            Welcome to Caravan!
          </Typography>
          <CardContent>
            <Box mb={3}>
              <Typography color="gray" align="center">
                Let&apos;s get you started. To use Caravan&apos;s multisignature features,
                you&apos;ll need a compatible wallet. You can either create a new
                wallet directly in Caravan or import an existing one.
              </Typography>
            </Box>
            <Grid
              container
              alignItems="center"
              justifyContent="center"
              spacing={3}
            >
              <Grid item xs={10} md={4} display="flex" justifyContent="center">
                <Button
                  component={Link}
                  to="/wallet"
                  variant="contained"
                  data-cy="setup-wallet-button"
                  size="large"
                  color="primary"
                  startIcon={<AccountBalanceWallet />}
                >
                  Wallet
                </Button>
              </Grid>
              <Grid item xs={10} md={4} display="flex" justifyContent="center">
                <Button
                  variant="contained"
                  data-cy="setup-address-button"
                  size="large"
                  color="secondary"
                  component={Link}
                  to="/address"
                  startIcon={<SportsVolleyball />}
                >
                  Address
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  </Box>
);

export default Setup;
