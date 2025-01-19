import React from "react";
import PropTypes from "prop-types";
import { AppBar, Toolbar, Button, Box } from "@mui/material";
import { Link } from "react-router-dom";
import { makeStyles } from "@mui/styles";
import Logo from "../../../../assets/images/caravan-logo-transparent.png";

const useStyles = makeStyles(() => ({
  root: {
    flexGrow: 1,
    width: "100%",
    backgroundColor: "#FFFFFF",
    outline: "none",
  },
  logoButton: {
    backgroundColor: "#fff",
    color: "#1976d2",
    padding: "10px 20px",
    fontSize: "2rem",
    outline: "none",
    boxShadow: "none",
    fontWeight: "bold",
    textTransform: "none",
    "&:hover": {
      backgroundColor: "#fff",
      color: "#1976d2",
      outline: "none",
      boxShadow: "none",
    },
    "&:focus": {
      outline: "none",
      boxShadow: "none",
    },
  },
  menuButton: {
    color: "#000",
    backgroundColor: "#fff",
    fontSize: "1rem",
    textTransform: "none",
  },
  getStartedButton: {
    backgroundColor: "#1976d2",
    color: "#fff",
    padding: "7.5px 12px",
    fontSize: "0.8rem",
    "&:hover": {
      backgroundColor: "#fff",
      color: "#1976d2",
      outline: "#1976d2 solid 1px",
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
  },
  logoLink: {
    textDecoration: "none",
  },
}));

const Navbar = () => {
  const classes = useStyles();

  return (
    <AppBar position="static" className={classes.root} elevation={0}>
      <Toolbar>
        <Link to="/" className={classes.logoLink}>
          <Button
            className={classes.logoButton}
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
            <Button className={classes.menuButton}>About</Button>
          </Link>
          <Link to="/help" className={classes.menuLink}>
            <Button className={classes.menuButton}>Resources</Button>
          </Link>
          <Link to="/test" className={classes.menuLink}>
            <Button className={classes.menuButton}>Test Suite</Button>
          </Link>
        </Box>
        <Button className={classes.getStartedButton}>Get Started</Button>
      </Toolbar>
    </AppBar>
  );
};

Navbar.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default Navbar;
