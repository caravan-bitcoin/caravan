import React from "react";
import PropTypes from "prop-types";
import {
  AppBar,
  Toolbar,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Box,
} from "@mui/material";
import { makeStyles } from "@mui/styles";
import styled from "styled-components";
import { Link } from "react-router-dom";
import HomeIcon from "@mui/icons-material/Home";
import SettingsIcon from "@mui/icons-material/Settings";
import WalletIcon from "@mui/icons-material/AccountBalanceWallet";
import AddressIcon from "@mui/icons-material/LocationOn";
import ScriptIcon from "@mui/icons-material/Code";
import CreateIcon from "@mui/icons-material/Create";
import TestIcon from "@mui/icons-material/CheckCircle";
import HelpIcon from "@mui/icons-material/Help";
import Logo from "../../../../assets/images/caravan-logo-transparent.png";

const useStyles = makeStyles((theme) => ({
  root: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#00478E",
  },
  menuButton: {
    marginRight: theme.spacing(2),
  },
  title: {
    flexGrow: 1,
  },
  menuItem: {
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(2),
    paddingX: theme.spacing(3),
  },
  menuLink: {
    color: "#fff",
    textDecoration: "none",
  },
  bottomList: {
    marginTop: "auto",
    backgroundColor: "#00478E",
    color: "#fff",
  },
  toolbar: {
    padding: 0,
    backgroundColor: "#00478E",
  },
  icon: {
    color: "#fff",
  },
}));

const LogoButton = styled(Button)`
  && {
    background-color: #00478e;
    color: #fff;
    padding: 10px 20px;
    font-size: 2rem;
    outline: none;
    box-shadow: none;
    &:hover {
      background-color: #fff;
      color: #00478e;
    }
    font-weight: bold;
    text-transform: none;
  }
`;

const NavItem = ({ href, title, icon, classes }) => {
  return (
    <Link to={href} className={classes.menuLink}>
      <ListItem button className={classes.menuItem}>
        <ListItemIcon className={classes.icon}>{icon}</ListItemIcon>
        <ListItemText primary={title} />
      </ListItem>
    </Link>
  );
};

NavItem.propTypes = {
  href: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  icon: PropTypes.element.isRequired,
  classes: PropTypes.shape({
    menuLink: PropTypes.string.isRequired,
    menuItem: PropTypes.string.isRequired,
    icon: PropTypes.string.isRequired,
  }).isRequired,
};

const NavbarHeader = ({ classes }) => (
  <AppBar position="static">
    <Toolbar className={classes.toolbar}>
      <LogoButton
        variant="contained"
        component={Link}
        to="/"
        startIcon={
          <img src={Logo} alt="Logo" style={{ width: 75, height: 60 }} />
        }
      >
        Caravan
      </LogoButton>
    </Toolbar>
  </AppBar>
);

NavbarHeader.propTypes = {
  classes: PropTypes.object.isRequired,
};

const NavbarActive = ({ classes }) => {
  const navItems = [
    { title: "Overview", icon: <HomeIcon />, href: "/overview" },
    { title: "Setup", icon: <SettingsIcon />, href: "/setup" },
  ];

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="flex-start"
      width="100%"
      p={2}
      backgroundColor="#00478E"
      color="#fff"
    >
      <List>
        {navItems.map((item, index) => (
          <NavItem
            key={index}
            title={item.title}
            icon={item.icon}
            href={item.href}
            classes={classes}
          />
        ))}
      </List>
    </Box>
  );
};

NavbarActive.propTypes = {
  classes: PropTypes.object.isRequired,
};

const NavbarEmpty = () => (
  <Box flexGrow={1} style={{ backgroundColor: "#00478E" }} />
);

const Navbar = () => {
  const classes = useStyles();

  const menuItems = [
    { href: "/wallet", title: "Wallet", icon: <WalletIcon /> },
    { href: "/address", title: "Create Address", icon: <AddressIcon /> },
    { href: "/script", title: "Script Explorer", icon: <ScriptIcon /> },
    {
      href: "/hermit-psbt",
      title: "Hermit PSBT Interface",
      icon: <CreateIcon />,
    },
    { href: "/test", title: "Test Suite", icon: <TestIcon /> },
    { href: "/help", title: "Help", icon: <HelpIcon /> },
  ];

  return (
    <div className={classes.root}>
      <NavbarHeader classes={classes} />
      <NavbarActive classes={classes} />
      <NavbarEmpty />
      <List className={`${classes.list} ${classes.bottomList}`}>
        {menuItems.map(({ href, title, icon }) => (
          <NavItem
            href={href}
            title={title}
            icon={icon}
            classes={classes}
            key={href}
          />
        ))}
      </List>
    </div>
  );
};

export default Navbar;
