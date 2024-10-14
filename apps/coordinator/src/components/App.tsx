import React from "react";
import {
  HashRouter as Router,
  Route,
  Switch,
  Redirect,
} from "react-router-dom";

// Components
import Container from "@mui/material/Container";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { SnackbarProvider } from "notistack";
import Drawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";

import theme from "./theme";
import Help from "./Help";
import Wallet from "./Wallet";
import CreateAddress from "./CreateAddress";
import TestSuiteRun from "./TestSuiteRun";
import ScriptExplorer from "./ScriptExplorer";
import HermitPsbtInterface from "./Hermit/HermitPsbtInterface";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ErrorBoundary from "./ErrorBoundary";
import ErrorNotification from "./ErrorNotification";

const drawerWidth = 240;

const App = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <div className="App" style={{ display: 'flex' }}>
      <SnackbarProvider maxSnack={3}>
        <Router basename="/">
          <Drawer
            variant="permanent"
            sx={{
              width: drawerWidth,
              flexShrink: 0,
              [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
            }}
          >
            <Navbar />
          </Drawer>
          <Box
            component="main"
            sx={{ flexGrow: 1, bgcolor: 'background.default', p: 3, marginLeft: `${drawerWidth}px` }}
          >
            <Container maxWidth={false} sx={{ maxWidth: "100%" }}>
              <ErrorBoundary>
                <Switch>
                  <Route path="/test" component={TestSuiteRun} />
                  <Route path="/address" component={CreateAddress} />
                  <Redirect from="/spend" to="/script" />
                  <Route path="/script" component={ScriptExplorer} />
                  <Route path="/hermit-psbt" component={HermitPsbtInterface} />
                  <Route path="/wallet" component={Wallet} />
                  <Route path="/help" component={Help} />
                  <Route path="/" component={Help} />
                </Switch>
                <ErrorNotification />
              </ErrorBoundary>
              <Footer />
            </Container>
          </Box>
        </Router>
      </SnackbarProvider>
    </div>
  </ThemeProvider>
);

export default App;