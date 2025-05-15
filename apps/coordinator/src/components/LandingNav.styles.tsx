import { makeStyles, createStyles } from "@mui/styles";
import { Theme } from "@mui/material/styles";

// Using the theme parameter to integrate with MUI's theming system
export const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      flexGrow: 1,
      width: "100%",
      // Using theme values and chaining selectors for higher specificity
      "&.MuiAppBar-root": {
        backgroundColor: "#FFFFFF",
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05)",
        position: "sticky",
        top: 0,
        zIndex: 1000,
      },
    },
    toolbar: {
      padding: "0 20px",
      display: "flex",
      justifyContent: "space-between", // This ensures proper spacing between elements
      width: "100%",
      "@media (min-width: 1200px)": {
        padding: "0 40px",
      },
    },
    logoButton: {
      // Chaining selectors to increase specificity
      "&.MuiButton-root": {
        backgroundColor: "#fff",
        color: theme.palette.primary.light || "#1976d2",
        padding: "10px 20px",
        fontSize: "2rem",
        outline: "none",
        boxShadow: "none",
        fontWeight: "bold",
        transition: "transform 0.2s ease",
        "&:hover": {
          backgroundColor: "#fff",
          transform: "scale(1.02)",
          boxShadow: "none",
        },
        "@media (max-width: 600px)": {
          fontSize: "1.5rem",
          padding: "5px 10px",
        },
      },
    },
    menuButton: {
      // Increasing specificity to override MUI defaults
      "&.MuiButton-root": {
        color: "#000",
        backgroundColor: "#fff",
        fontSize: "1rem",
        margin: "0 5px",
        borderRadius: "4px",
        transition: "all 0.2s ease",
        "&:hover": {
          backgroundColor: "rgba(25, 118, 210, 0.08)",
          color: theme.palette.primary.light || "#1976d2",
        },
      },
    },
    getStartedButton: {
      // Increasing specificity for button
      "&.MuiButton-root": {
        backgroundColor: theme.palette.primary.light || "#1976d2",
        color: "#fff",
        padding: "7.5px 16px",
        fontSize: "0.9rem",
        borderRadius: "6px",
        boxShadow: "0 2px 8px rgba(25, 118, 210, 0.2)",
        transition: "all 0.3s ease",
        "@media (max-width: 750px)": {
          display: "none", // Hide button on mobile
        },
        "&:hover": {
          backgroundColor: "#fff",
          color: theme.palette.primary.light || "#1976d2",
          outline: `${theme.palette.primary.light || "#1976d2"} solid 1px`,
          transform: "translateY(-2px)",
          boxShadow: "0 4px 12px rgba(25, 118, 210, 0.3)",
        },
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
      position: "absolute",
      left: "50%",
      transform: "translateX(-50%)", // This centers the menu container properly
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
      width: 240,
      height: 60,
      transition: "transform 0.2s ease",
      "&:hover": {
        transform: "scale(1.05)",
      },
    },
  }),
);
