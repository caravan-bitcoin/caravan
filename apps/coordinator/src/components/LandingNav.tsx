import React from "react";
import { AppBar, Toolbar, Button, Box } from "@mui/material";
import { Link } from "react-router-dom";
import { makeStyles, createStyles } from "@mui/styles";
import Logo from "../../../../assets/images/caravan-logo-transparent.png";

const useStyles = makeStyles(() =>
  createStyles({
    root: {
      flexGrow: 1,
      width: "100%",
      backgroundColor: "#FFFFFF !important",
      boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05) !important",
      position: "sticky",
      top: 0,
      zIndex: 1000,
    },
    toolbar: {
      padding: "0 20px",
      "@media (min-width: 1200px)": {
        padding: "0 40px",
      },
    },
    logoButton: {
      backgroundColor: "#fff !important",
      color: "#1976d2 !important",
      padding: "10px 20px !important",
      fontSize: "2rem !important",
      "@media (max-width: 600px)": {
        fontSize: "1.5rem !important",
        padding: "5px 10px !important",
      },
      outline: "none !important",
      boxShadow: "none !important",
      fontWeight: "bold !important",
      transition: "transform 0.2s ease !important",
      "&:hover": {
        backgroundColor: "#fff !important",
        transform: "scale(1.02) !important",
      },
    },
    menuButton: {
      color: "#000 !important",
      backgroundColor: "#fff !important",
      fontSize: "1rem !important",
      margin: "0 5px !important",
      borderRadius: "4px !important",
      transition: "all 0.2s ease !important",
      "&:hover": {
        backgroundColor: "rgba(25, 118, 210, 0.08) !important",
        color: "#1976d2 !important",
      },
    },
    getStartedButton: {
      backgroundColor: "#1976d2 !important",
      color: "#fff !important",
      padding: "7.5px 16px !important",
      fontSize: "0.9rem !important",
      borderRadius: "6px !important",
      boxShadow: "0 2px 8px rgba(25, 118, 210, 0.2) !important",
      transition: "all 0.3s ease !important",
      "@media (max-width: 750px)": {
        display: "none !important", // Hide button on mobile
      },
      "&:hover": {
        backgroundColor: "#fff !important",
        color: "#1976d2 !important",
        outline: "#1976d2 solid 1px !important",
        transform: "translateY(-2px) !important",
        boxShadow: "0 4px 12px rgba(25, 118, 210, 0.3) !important",
      },
    },
    menuLink: {
      color: "black",
      "&:hover": {
        textDecoration: "none",
      },
    },
    menuContainer: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      flexGrow: 1,
      "@media (max-width: 750px)": {
        display: "none", // Hide menu items on mobile
      },
    },
    logoLink: {
      textDecoration: "none",
      display: "flex",
      alignItems: "center",
    },
    logoImage: {
      width: 75,
      height: 60,
      transition: "transform 0.2s ease",
      "&:hover": {
        transform: "scale(1.05)",
      },
    },
  }),
);

const Navbar = () => {
  const classes = useStyles();

  const scrollToFooter = () => {
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth",
    });
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const yOffset = -80; // Adjust for header height
      const y =
        element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <AppBar position="sticky" className={classes.root} elevation={0}>
      <Toolbar className={classes.toolbar}>
        <Link to="/" className={classes.logoLink}>
          <Button
            className={classes.logoButton}
            style={{ textTransform: "none" }}
            variant="contained"
            aria-label="Go to homepage"
            startIcon={
              <img
                src={Logo}
                alt="Caravan Logo"
                className={classes.logoImage}
              />
            }
          >
            Caravan
          </Button>
        </Link>
        <Box className={classes.menuContainer}>
          <Button
            className={classes.menuButton}
            style={{ textTransform: "none" }}
            onClick={() => scrollToSection("about")}
            aria-label="Learn about Caravan"
          >
            About
          </Button>
          <Button
            className={classes.menuButton}
            style={{ textTransform: "none" }}
            onClick={() => scrollToSection("features")}
            aria-label="View Caravan features"
          >
            Features
          </Button>
          <Button
            className={classes.menuButton}
            style={{ textTransform: "none" }}
            onClick={scrollToFooter}
            aria-label="View resources"
          >
            Resources
          </Button>
          <Link to="/test" className={classes.menuLink}>
            <Button
              className={classes.menuButton}
              style={{ textTransform: "none" }}
              aria-label="Go to test suite"
            >
              Test Suite
            </Button>
          </Link>
        </Box>
        <Link to="/setup" style={{ textDecoration: "none" }}>
          <Button
            className={classes.getStartedButton}
            aria-label="Get started with Caravan"
          >
            Get Started
          </Button>
        </Link>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
