import { makeStyles, createStyles } from "@mui/styles";

export const useStyles = makeStyles(() =>
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
