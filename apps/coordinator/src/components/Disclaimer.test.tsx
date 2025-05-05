import { describe, expect, test } from "vitest";
import { render, screen } from "../utils/test-utils";

import Disclaimer from "./Disclaimer";

describe("Disclaimer Component", () => {
  test("renders the component without crashing", () => {
    render(<Disclaimer />);

    const titleElement = screen.getByText("Disclaimer");
    expect(titleElement).toBeInTheDocument();
  });

  test("displays the disclaimer text content", () => {
    render(<Disclaimer />);

    // checking for a specific part of disclaimer text
    const searchText = screen.getByText(
      /This application is in “alpha” state/i,
    );
    expect(searchText).toBeInTheDocument();
  });
});
