import React, { useState } from "react";
import {
  HashRouter as Router,
  Route,
  Switch,
  Redirect,
  useLocation,
} from "react-router-dom";

// Components
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { SnackbarProvider } from "notistack";
import Drawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";

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
import { useMediaQuery, useTheme } from "@mui/material";

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div
        className="App"
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
        }}
      >
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
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const DRAWER_WIDTH = 300;
  const showDrawer = location.pathname !== "/";

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <>
      {isSmallScreen && showDrawer && (
        <IconButton
          color="inherit"
          aria-label={mobileOpen ? "close drawer" : "open drawer"}
          edge="start"
          onClick={handleDrawerToggle}
          sx={{
            mr: 2,
            position: "fixed",
            top: 16,
            left: 16,
            zIndex: theme.zIndex.drawer + 1,
            bgcolor: mobileOpen ? "primary.main" : "transparent",
            color: mobileOpen ? "white" : "inherit",
            "&:hover": {
              bgcolor: mobileOpen ? "primary.dark" : "rgba(0, 0, 0, 0.04)",
            },
          }}
        >
          {mobileOpen ? <CloseIcon /> : <MenuIcon />}
        </IconButton>
      )}
      {location.pathname === "/" ? (
        <LandingNav />
      ) : (
        <>
          {/* Mobile Drawer (Temporary) */}
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true, // Better mobile performance
            }}
            sx={{
              display: { xs: "block", md: "none" },
              "& .MuiDrawer-paper": {
                boxSizing: "border-box",
                width: DRAWER_WIDTH,
              },
            }}
          >
            <Navbar />
          </Drawer>

          {/* Desktop Drawer (Permanent) */}
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: "none", md: "block" },
              width: DRAWER_WIDTH,
              flexShrink: 0,
              [`& .MuiDrawer-paper`]: {
                width: DRAWER_WIDTH,
                boxSizing: "border-box",
                borderRight: "none",
              },
            }}
          >
            <Navbar />
          </Drawer>
        </>
      )}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          bgcolor: "background.default",
          p: { xs: 1, sm: 2, md: 3 },
          marginLeft: !showDrawer ? 0 : { xs: 0, md: `${DRAWER_WIDTH}px` },
          width: {
            xs: "100%",
            md: showDrawer ? `calc(100% - ${DRAWER_WIDTH}px)` : "100%",
          },
          overflowX: "hidden",
        }}
      >
        <Box sx={{ width: "100%" }}>
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
        </Box>
        {location.pathname !== "/" && (
          <Box component="footer" sx={{ mt: "auto", width: "100%" }}>
            <Footer />
          </Box>
        )}
      </Box>
    </>
  );
};

export default App;
