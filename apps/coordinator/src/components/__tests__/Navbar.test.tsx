import { render, screen } from "../../utils/test-utils";
import { UserEvent } from "@testing-library/user-event";
import { describe, test, expect, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

import Navbar from "../Navbar";
import { createTheme, ThemeProvider } from "@mui/material";

const theme = createTheme({
  typography: {
    fontSize: 12,
  },
  palette: {
    secondary: {
      main: "#e0e0e0",
    },
  },
});

const renderNavbar = () => {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    </ThemeProvider>,
  );
};
beforeEach(() => {
  renderNavbar();
});

describe("Testing Navbar Component", () => {
  test("renders initial state correctly", () => {
    const titleLink = screen.getByRole("link", { name: /caravan/i });

    expect(titleLink).toBeInTheDocument();

    const menuButton = screen.getByRole("button", { name: /menu/i });
    expect(menuButton).toBeInTheDocument();
  });
});
