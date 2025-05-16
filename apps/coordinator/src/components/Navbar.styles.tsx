import { createStyles, makeStyles } from "@mui/styles";

export const useStyles = makeStyles(() =>
  createStyles({
    root: {
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      backgroundColor: "#00478E",
    },
    menuButton: {
      marginRight: 16,
      "&.MuiButton-root": {
        color: "#000",
        backgroundColor: "#fff",
        "&:hover": {
          backgroundColor: "rgba(25, 118, 210, 0.08)",
          color: "#1976d2",
        },
      },
    },
    title: {
      flexGrow: 1,
    },
    menuItem: {
      paddingTop: 12,
      paddingBottom: 12,
      paddingLeft: 24,
      paddingRight: 24,
      "&.MuiListItem-root.MuiListItem-button": {
        minHeight: "auto",
        height: 48,
      },
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
      display: "flex",
      justifyContent: "center",
    },
    icon: {
      color: "#fff",
      "& .MuiSvgIcon-root": {
        color: "#fff",
      },
    },
    logoButton: {
      padding: "10px 20px",
      backgroundColor: "transparent",
      outline: "none",
      boxShadow: "none",
      width: "100%",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      "&:hover": {
        backgroundColor: "rgba(0, 0, 0, 0.04)",
        transform: "scale(1.02)",
        boxShadow: "none",
      },
      "&:focus": {
        outline: "none",
        boxShadow: "none",
      },
      "&.MuiButton-root": {
        color: "#1976d2",
      },
      "&.MuiButton-root[variant='contained']": {
        backgroundColor: "#00478e",
        color: "#fff",
        padding: 0,
        fontSize: "2rem",
        outline: "none",
        boxShadow: "none",
        textTransform: "none",
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        "&:focus": {
          outline: "none",
          boxShadow: "none",
        },
      },
      "@media (max-width: 600px)": {
        fontSize: "1.5rem",
        padding: "5px 10px",
      },
    },
    list: {
      width: "100%",
    },
    getStartedButton: {
      "&.MuiButton-root": {
        backgroundColor: "#1976d2",
        color: "#fff",
        "&:hover": {
          backgroundColor: "#fff",
          color: "#1976d2",
          outline: "#1976d2 solid 1px",
        },
      },
      "@media (max-width: 750px)": {
        display: "none",
      },
    },
  }),
);
