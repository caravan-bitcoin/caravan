import React from "react";
import PropTypes from "prop-types";
import {
  AppBar,
  Toolbar,
  Button,
  Typography,
  Menu,
  MenuItem,
  Box,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import { makeStyles } from "@mui/styles";
import MenuIcon from "@mui/icons-material/Menu";
import { Link } from "react-router-dom";

const useStyles = makeStyles((theme) => ({
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
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
    color: "inherit",
    textDecoration: "none",
  },
  list: {
    flexGrow: 1,
  },
}));

const NavItem = ({ href, title, classes, handleClose }) => {
  return (
    <Link to={href} className={classes.menuLink}>
      <MenuItem className={classes.menuItem} onClick={handleClose}>
        {title}
      </MenuItem>
    </Link>
  );
};

NavItem.propTypes = {
  href: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  classes: PropTypes.shape({
    menuLink: PropTypes.string.isRequired,
    menuItem: PropTypes.string.isRequired,
  }).isRequired,
  handleClose: PropTypes.func.isRequired,
};

const NavbarHeader = ({ classes, handleClick }) => (
  <AppBar position="static">
    <Toolbar>
      <Typography variant="h6" className={classes.title}>
        <Button color="inherit" component={Link} to="/">
          Caravan
        </Button>
      </Typography>
    </Toolbar>
  </AppBar>
);

NavbarHeader.propTypes = {
  classes: PropTypes.object.isRequired,
  handleClick: PropTypes.func.isRequired,
};

const NavbarMenu = ({ anchorEl, handleClose, menuItems, classes }) => (
  <Menu
    id="simple-menu"
    anchorEl={anchorEl}
    keepMounted
    open={Boolean(anchorEl)}
    onClose={handleClose}
  >
    {menuItems.map(({ href, title }) => (
      <NavItem
        href={href}
        title={title}
        classes={classes}
        key={href}
        handleClose={handleClose}
      />
    ))}
  </Menu>
);

NavbarMenu.propTypes = {
  anchorEl: PropTypes.object,
  handleClose: PropTypes.func.isRequired,
  menuItems: PropTypes.arrayOf(
    PropTypes.shape({
      href: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
    })
  ).isRequired,
  classes: PropTypes.object.isRequired,
};

const Navbar = () => {
  const classes = useStyles();
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const menuItems = [
    { href: "/wallet", title: "Wallet" },
    { href: "/address", title: "Create Address" },
    { href: "/script", title: "Script Explorer" },
    { href: "/hermit-psbt", title: "Hermit PSBT Interface" },
    { href: "/test", title: "Test Suite" },
    { href: "/help", title: "Help" },
  ];

  return (
    <div className={classes.root}>
      <NavbarHeader classes={classes} handleClick={handleClick} />
      <List className={classes.list}>
        {menuItems.map(({ href, title }) => (
          <ListItem button component={Link} to={href} key={href}>
            <ListItemText primary={title} />
          </ListItem>
        ))}
      </List>
      <NavbarMenu
        anchorEl={anchorEl}
        handleClose={handleClose}
        menuItems={menuItems}
        classes={classes}
      />
    </div>
  );
};

export default Navbar;