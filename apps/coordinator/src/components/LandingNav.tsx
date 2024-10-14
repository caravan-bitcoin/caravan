import React from "react";
import PropTypes from "prop-types";
import {
  AppBar,
  Toolbar,
  Button,
  MenuItem,
  Box,
} from "@mui/material";
import { Link } from "react-router-dom";
import styled from 'styled-components';
import Logo from '../../../../assets/images/caravan-logo-transparent.png'; // Import your logo image

const rootStyles = {
  flexGrow: 1,
  width: '100%',
  backgroundColor: '#FFFFFF',
  outline: 'none', // Remove outline from the entire navbar
};

const LogoButton = styled(Button)`
  && {
    background-color: #fff;
    color: #1976D2;
    padding: 10px 20px;
    font-size: 2rem;
    outline: none;
    box-shadow: none;
    &:hover {
      background-color: #fff;
      color: #1976D2;
    }
    font-weight: bold;
    text-transform: none;
  }
`;

const MenuButton = styled(Button)`
  && {
    color: #000;
    background-color: #fff;
    font-size: 1rem;
    text-transform: none;
  }
`;

const MenuGetStartedButton = styled(Button)`
  && {
    background-color: #1976D2;
    color: #fff;
    padding: 7.5px 12px;
    font-size: 0.8rem;
    &:hover {
      background-color: #fff;
      color: #1976D2;
    }
  }
`;

const menuItemStyles = {
  paddingTop: '8px', // Assuming theme.spacing(1) is 8px
  paddingBottom: '8px',
  paddingLeft: '32px', // Assuming theme.spacing(4) is 32px
  paddingRight: '32px',
  backgroundColor: 'rgba(0, 0, 0, 0.04)', // Assuming theme.palette.action.hover is rgba(0, 0, 0, 0.04)
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.08)', // Assuming theme.palette.action.selected is rgba(0, 0, 0, 0.08)
  },
};

const menuLinkStyles = {
  color: 'black', // Assuming theme.palette.black.main is black
  textDecoration: 'underline',
  '&:hover': {
    textDecoration: 'none',
  },
};

const Navbar = () => {
    return (
      <AppBar position="static" style={rootStyles} elevation={0}>
        <Toolbar>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <LogoButton variant="contained" startIcon={<img src={Logo} alt="Logo" style={{ width: 75, height: 60 }} />}>
              Caravan
            </LogoButton>
          </Link>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
            <Link to="/home" style={menuLinkStyles}>
              <MenuButton>About</MenuButton>
            </Link>
            <Link to="/about" style={menuLinkStyles}>
              <MenuButton>Resources</MenuButton>
            </Link>
            <Link to="/about" style={menuLinkStyles}>
              <MenuButton>Test Suite</MenuButton>
            </Link>
          </Box>
          <MenuGetStartedButton>
            Get Started
          </MenuGetStartedButton>
        </Toolbar>
      </AppBar>
    );
  };
  
  Navbar.propTypes = {
    classes: PropTypes.object.isRequired,
  };
  
  export default Navbar;