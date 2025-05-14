import React from "react";
import { AppBar, Toolbar, Button, Box } from "@mui/material";
import { Link } from "react-router-dom";
import Logo from "../../public/images/caravan-logo-transparent.webp";
import { useStyles } from "./LandingNav.styles";

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
