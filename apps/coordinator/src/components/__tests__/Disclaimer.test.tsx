import { beforeEach, describe, expect, test } from "vitest";
import { render, screen } from "../../utils/test-utils";

import Disclaimer from "../Disclaimer";

describe("Disclaimer Component", () => {
  beforeEach(() => {
    render(<Disclaimer />);
  });
  test("renders the component without crashing", () => {
    const titleElement = screen.getByText("Disclaimer");
    expect(titleElement).toBeInTheDocument();
  });

  test("displays the disclaimer text content", () => {
    // checking for a specific part of disclaimer text
    const searchText = screen.getByText(
      /This application is in “alpha” state/i,
    );
    expect(searchText).toBeInTheDocument();
  });
});
