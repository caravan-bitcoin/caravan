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
    },
    title: {
      flexGrow: 1,
    },
    menuItem: {
      paddingTop: 12,
      paddingBottom: 12,
      paddingLeft: 24,
      paddingRight: 24,
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
    },
    logoButton: {
      padding: "10px 20px",
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
    },
    list: {
      width: "100%",
    },
  }),
);
