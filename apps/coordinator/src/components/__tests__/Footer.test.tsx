import { render, screen } from "../../utils/test-utils";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import Footer from "../Footer";

// Mocking static assets (like images)
vi.mock("../../images/logo.png", () => {
  return {
    default: "logo-mock.png",
  };
});

describe("Testing Footer Component", () => {
  //Defining mock values for global variables
  const mockAppVersion = "1.0.0-test";
  const mockGitSha = "abhishek-123test";
  const mockYear = 2025;
  const mockDate = new Date(mockYear, 0, 15);

  beforeEach(() => {
    vi.stubGlobal("__APP_VERSION__", mockAppVersion);
    vi.stubGlobal("__GIT_SHA__", mockGitSha);

    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
    render(<Footer />);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  test("renders logo image with correct alt text and link", () => {
    const logoImg = screen.getByAltText("Unchained Capital logo");

    expect(logoImg).toBeInTheDocument();
    // console.log("logo img", logoImg);

    expect(logoImg).toHaveAttribute("src", "logo-mock.png");

    const logoLink = screen.getByRole("link", {
      name: /unchained capital logo/i,
    });
    console.log("logolink", logoLink);

    expect(logoLink).toBeInTheDocument();

    expect(logoLink).toHaveAttribute("href", "https://www.unchained.com");
  });

  test("display the copyright notive with the current (mocked) year", () => {
    const copyrightText = screen.getByText(
      /Copyright.*2025.*by Unchained Capital/i,
    );
    expect(copyrightText).toBeInTheDocument();
  });

  test("display the version and commit SHA", () => {
    const versionReg = new RegExp(
      `v${mockAppVersion.replace(/\./g, "\\.")} commit: ${mockGitSha}`,
      "i",
    );
    console.log("versionreg", versionReg);

    const versionText = screen.getByText(versionReg);

    expect(versionText).toBeInTheDocument();
  });
});
