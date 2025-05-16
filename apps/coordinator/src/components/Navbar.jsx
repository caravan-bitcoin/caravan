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
import { Link } from "react-router-dom";
import HomeIcon from "@mui/icons-material/Home";
import SettingsIcon from "@mui/icons-material/Settings";
import WalletIcon from "@mui/icons-material/AccountBalanceWallet";
import AddressIcon from "@mui/icons-material/LocationOn";
import ScriptIcon from "@mui/icons-material/Code";
import CreateIcon from "@mui/icons-material/Create";
import TestIcon from "@mui/icons-material/CheckCircle";
import HelpIcon from "@mui/icons-material/Help";
import Logo from "../../public/images/landing/logo_mark_white.webp";
import { useStyles } from "./Navbar.styles";

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
      <Button
        className={`${classes.logoButton} logoButton`}
        variant="contained"
        component={Link}
        to="/"
      >
        <img src={Logo} alt="Logo" style={{ width: 97, height: 77 }} />
      </Button>
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
      bgcolor="#00478E"
      color="#fff"
    >
      <List style={{ width: "100%" }}>
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
  <Box flexGrow={1} sx={{ backgroundColor: "#00478E" }} />
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
