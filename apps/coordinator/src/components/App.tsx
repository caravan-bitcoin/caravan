import React from "react";
import {
  HashRouter as Router,
  Route,
  Switch,
  Redirect,
  useLocation,
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
import Setup from "./Setup";
import LandingPage from "./LandingPage";
import Wallet from "./Wallet";
import CreateAddress from "./CreateAddress";
import TestSuiteRun from "./TestSuiteRun";
import ScriptExplorer from "./ScriptExplorer";
import HermitPsbtInterface from "./Hermit/HermitPsbtInterface";
import Navbar from "./Navbar";
import LandingNav from "./LandingNav";
import Footer from "./Footer";
import ErrorBoundary from "./ErrorBoundary";
import ErrorNotification from "./ErrorNotification";

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="App" style={{ display: "flex", flexDirection: "column" }}>
        <SnackbarProvider maxSnack={3}>
          <Router basename="/">
            <AppContent />
          </Router>
        </SnackbarProvider>
      </div>
    </ThemeProvider>
  );
};

const AppContent = () => {
  const location = useLocation();

  return (
    <>
      {location.pathname === "/" ? (
        <LandingNav />
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            width: 300,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: { width: 300, boxSizing: "border-box" },
          }}
        >
          <Navbar />
        </Drawer>
      )}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: "background.default",
          p: 3,
          marginLeft: location.pathname === "/" ? 0 : `300px`,
        }}
      >
        <Container maxWidth={false} disableGutters sx={{ maxWidth: "100%" }}>
          <ErrorBoundary>
            <Switch>
              <Route path="/test" component={TestSuiteRun} />
              <Route path="/address" component={CreateAddress} />
              <Redirect from="/spend" to="/script" />
              <Route path="/script" component={ScriptExplorer} />
              <Route path="/hermit-psbt" component={HermitPsbtInterface} />
              <Route path="/wallet" component={Wallet} />
              <Route path="/help" component={Help} />
              <Route path="/setup" component={Setup} />
              <Route path="/" component={LandingPage} />
            </Switch>
            <ErrorNotification />
          </ErrorBoundary>
          {location.pathname !== "/" && <Footer />}
        </Container>
      </Box>
    </>
  );
};

export default App;
