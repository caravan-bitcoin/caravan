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
      outline: "none",
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
    },
    menuButton: {
      color: "#000 !important",
      backgroundColor: "#fff !important",
      fontSize: "1rem !important",
    },
    getStartedButton: {
      backgroundColor: "#1976d2 !important",
      color: "#fff !important",
      padding: "7.5px 12px !important",
      fontSize: "0.8rem !important",
      "@media (max-width: 750px)": {
        display: "none !important", // Hide button on mobile
      },
      "&:hover": {
        backgroundColor: "#fff !important",
        color: "#1976d2 !important",
        outline: "#1976d2 solid 1px !important",
      },
    },
    menuLink: {
      color: "black",
      textDecoration: "underline",
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
    },
  }),
);

const Navbar = () => {
  const classes = useStyles();

  return (
    <AppBar position="static" className={classes.root} elevation={0}>
      <Toolbar>
        <Link to="/" className={classes.logoLink}>
          <Button
            className={classes.logoButton}
            style={{ textTransform: "none" }}
            variant="contained"
            startIcon={
              <img src={Logo} alt="Logo" style={{ width: 75, height: 60 }} />
            }
          >
            Caravan
          </Button>
        </Link>
        <Box className={classes.menuContainer}>
          <Link to="/" className={classes.menuLink}>
            <Button
              className={classes.menuButton}
              style={{ textTransform: "none" }}
            >
              About
            </Button>
          </Link>
          <Link to="/help" className={classes.menuLink}>
            <Button
              className={classes.menuButton}
              style={{ textTransform: "none" }}
            >
              Resources
            </Button>
          </Link>
          <Link to="/test" className={classes.menuLink}>
            <Button
              className={classes.menuButton}
              style={{ textTransform: "none" }}
            >
              Test Suite
            </Button>
          </Link>
        </Box>
        <Button className={classes.getStartedButton}>Get Started</Button>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
