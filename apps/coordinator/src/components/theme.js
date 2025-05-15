import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  typography: {
    fontSize: 14,
    button: {
      textTransform: "none",
    },
  },
  palette: {
    secondary: {
      main: "#e0e0e0",
    },
    primary: {
      main: "#00478E",
      light: "#1976d2",
    },
    action: {
      hoverOpacity: 0.08,
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#FFFFFF",
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          textTransform: "none",
          transition: "all 0.2s ease",
        },
        containedPrimary: {
          color: "#fff",
          boxShadow: "0 2px 8px rgba(25, 118, 210, 0.2)",
          "&:hover": {
            boxShadow: "0 4px 12px rgba(25, 118, 210, 0.3)",
          },
        },
      },
    },
  },
});

export default theme;
