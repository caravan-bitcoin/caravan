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
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { AccountBalanceWallet, SportsVolleyball } from "@mui/icons-material";
import { Link } from "react-router-dom";

const Setup = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="flex-start"
      minHeight="100vh"
      mt={10}
      sx={{
        mt: { xs: 10, sm: 10, md: 10 },
        px: { xs: 2, sm: 3 },
      }}
    >
      <Grid container spacing={3} justifyContent="center">
        <Grid item xs={12} sm={10} md={8} lg={8}>
          <Card
            sx={{
              borderRadius: { xs: 2, md: 3 },
              boxShadow: { xs: 2, md: 4 },
            }}
          >
            <Typography
              variant={isMobile ? "h6" : "h4"}
              align="center"
              fontWeight="bold"
              sx={{ mb: { xs: 2, md: 3 } }}
            >
              Welcome to Caravan!
            </Typography>
            <CardContent
              sx={{
                px: { xs: 2, sm: 3, md: 4 },
                pb: { xs: 3, md: 4 },
              }}
            >
              <Box mb={{ xs: 2, md: 3 }}>
                <Typography
                  color="text.secondary"
                  align="center"
                  variant={isMobile ? "body2" : "body1"}
                  sx={{
                    lineHeight: { xs: 1.4, md: 1.6 },
                    px: { xs: 0, sm: 1 },
                  }}
                >
                  Let&apos;s get you started. To use Caravan&apos;s
                  multisignature features, you&apos;ll need a compatible wallet.
                  You can either create a new wallet directly in Caravan or
                  import an existing one.
                </Typography>
              </Box>
              <Grid
                container
                alignItems="center"
                justifyContent="center"
                spacing={{ xs: 2, sm: 3 }}
                sx={{ mt: { xs: 1, md: 2 } }}
              >
                <Grid
                  item
                  xs={10}
                  sm={6}
                  md={4}
                  display="flex"
                  justifyContent="center"
                >
                  <Button
                    component={Link}
                    to="/wallet"
                    variant="contained"
                    data-cy="setup-wallet-button"
                    size={isMobile ? "medium" : "large"}
                    color="primary"
                    startIcon={<AccountBalanceWallet />}
                    fullWidth={isMobile}
                    sx={{
                      py: { xs: 1.5, md: 2 },
                      px: { xs: 3, md: 4 },
                      fontSize: { xs: "0.875rem", sm: "1rem", md: "1.125rem" },
                      fontWeight: 600,
                      minWidth: { sm: 140, md: 160 },
                      maxWidth: { xs: "100%", sm: 200 },
                    }}
                  >
                    Wallet
                  </Button>
                </Grid>
                <Grid
                  item
                  xs={10}
                  sm={6}
                  md={5}
                  display="flex"
                  justifyContent="center"
                >
                  <Button
                    variant="contained"
                    data-cy="setup-address-button"
                    size={isMobile ? "medium" : "large"}
                    color="secondary"
                    component={Link}
                    to="/address"
                    startIcon={<SportsVolleyball />}
                    fullWidth={isMobile}
                    sx={{
                      py: { xs: 1.5, md: 2 },
                      px: { xs: 3, md: 4 },
                      fontSize: { xs: "0.875rem", sm: "1rem", md: "1.125rem" },
                      fontWeight: 600,
                      minWidth: { sm: 140, md: 160 },
                      maxWidth: { xs: "100%", sm: 200 },
                    }}
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
};

export default Setup;
