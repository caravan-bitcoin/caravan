import {
  detectBrowser,
  isWebUSBAvailable,
  isSecureContext,
  getConnectedLedgerDevices,
  runWebUSBDiagnostics,
  getDiagnosticReport,
} from "./webusb-diagnostics";

describe("webusb-diagnostics", () => {
  const originalNavigator = global.navigator;
  const originalWindow = global.window;

  afterEach(() => {
    // Restore original globals
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      writable: true,
    });
    Object.defineProperty(global, "window", {
      value: originalWindow,
      writable: true,
    });
  });

  describe("detectBrowser", () => {
    it("detects Chrome browser", () => {
      Object.defineProperty(global, "navigator", {
        value: {
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        writable: true,
      });

      const result = detectBrowser();
      expect(result.name).toBe("Chrome");
      expect(result.version).toBe("120");
    });

    it("detects Firefox browser", () => {
      Object.defineProperty(global, "navigator", {
        value: {
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121",
        },
        writable: true,
      });

      const result = detectBrowser();
      expect(result.name).toBe("Firefox");
      expect(result.version).toBe("121");
    });

    it("detects Safari browser", () => {
      Object.defineProperty(global, "navigator", {
        value: {
          userAgent:
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        },
        writable: true,
      });

      const result = detectBrowser();
      expect(result.name).toBe("Safari");
      expect(result.version).toBe("17");
    });

    it("detects Edge browser", () => {
      Object.defineProperty(global, "navigator", {
        value: {
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
        },
        writable: true,
      });

      const result = detectBrowser();
      expect(result.name).toBe("Edge");
      expect(result.version).toBe("120");
    });

    it("reports WebUSB support correctly", () => {
      Object.defineProperty(global, "navigator", {
        value: {
          userAgent: "Chrome/120",
          usb: {
            getDevices: vi.fn(),
          },
        },
        writable: true,
      });

      const result = detectBrowser();
      expect(result.supportsWebUSB).toBe(true);
    });

    it("reports lack of WebUSB support", () => {
      Object.defineProperty(global, "navigator", {
        value: {
          userAgent: "Safari/17",
        },
        writable: true,
      });

      const result = detectBrowser();
      expect(result.supportsWebUSB).toBe(false);
    });
  });

  describe("isWebUSBAvailable", () => {
    it("returns true when WebUSB is available", () => {
      Object.defineProperty(global, "navigator", {
        value: {
          usb: {
            getDevices: vi.fn(),
          },
        },
        writable: true,
      });

      expect(isWebUSBAvailable()).toBe(true);
    });

    it("returns false when navigator.usb is undefined", () => {
      Object.defineProperty(global, "navigator", {
        value: {},
        writable: true,
      });

      expect(isWebUSBAvailable()).toBe(false);
    });

    it("returns false when navigator is undefined", () => {
      Object.defineProperty(global, "navigator", {
        value: undefined,
        writable: true,
      });

      expect(isWebUSBAvailable()).toBe(false);
    });
  });

  describe("isSecureContext", () => {
    it("returns true in secure context", () => {
      Object.defineProperty(global, "window", {
        value: {
          isSecureContext: true,
        },
        writable: true,
      });

      expect(isSecureContext()).toBe(true);
    });

    it("returns false in insecure context", () => {
      Object.defineProperty(global, "window", {
        value: {
          isSecureContext: false,
        },
        writable: true,
      });

      expect(isSecureContext()).toBe(false);
    });

    it("returns false when window is undefined", () => {
      Object.defineProperty(global, "window", {
        value: undefined,
        writable: true,
      });

      expect(isSecureContext()).toBe(false);
    });
  });

  describe("getConnectedLedgerDevices", () => {
    it("returns empty array when WebUSB not available", async () => {
      Object.defineProperty(global, "navigator", {
        value: {},
        writable: true,
      });

      const devices = await getConnectedLedgerDevices();
      expect(devices).toEqual([]);
    });

    it("filters to only Ledger devices", async () => {
      const mockDevices = [
        { vendorId: 0x2c97, productName: "Nano S", opened: false },
        { vendorId: 0x1234, productName: "Other Device", opened: false },
      ];

      Object.defineProperty(global, "navigator", {
        value: {
          usb: {
            getDevices: vi.fn().mockResolvedValue(mockDevices),
          },
        },
        writable: true,
      });

      const devices = await getConnectedLedgerDevices();
      expect(devices).toHaveLength(1);
      expect(devices[0].productName).toBe("Nano S");
    });

    it("handles errors gracefully", async () => {
      Object.defineProperty(global, "navigator", {
        value: {
          usb: {
            getDevices: vi.fn().mockRejectedValue(new Error("Permission denied")),
          },
        },
        writable: true,
      });

      const devices = await getConnectedLedgerDevices();
      expect(devices).toEqual([]);
    });
  });

  describe("runWebUSBDiagnostics", () => {
    it("identifies Safari as unsupported", async () => {
      Object.defineProperty(global, "navigator", {
        value: {
          userAgent:
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        },
        writable: true,
      });
      Object.defineProperty(global, "window", {
        value: { isSecureContext: true },
        writable: true,
      });

      const diagnostics = await runWebUSBDiagnostics();
      expect(diagnostics.browser.name).toBe("Safari");
      expect(diagnostics.issues.some((i) => i.code === "SAFARI_NOT_SUPPORTED")).toBe(
        true
      );
    });

    it("identifies insecure context issue", async () => {
      Object.defineProperty(global, "navigator", {
        value: {
          userAgent: "Chrome/120",
          usb: { getDevices: vi.fn().mockResolvedValue([]) },
        },
        writable: true,
      });
      Object.defineProperty(global, "window", {
        value: { isSecureContext: false },
        writable: true,
      });

      const diagnostics = await runWebUSBDiagnostics();
      expect(diagnostics.issues.some((i) => i.code === "INSECURE_CONTEXT")).toBe(
        true
      );
    });

    it("provides troubleshooting steps", async () => {
      Object.defineProperty(global, "navigator", {
        value: {
          userAgent: "Chrome/120",
          usb: { getDevices: vi.fn().mockResolvedValue([]) },
        },
        writable: true,
      });
      Object.defineProperty(global, "window", {
        value: { isSecureContext: true },
        writable: true,
      });

      const diagnostics = await runWebUSBDiagnostics();
      expect(diagnostics.troubleshootingSteps.length).toBeGreaterThan(0);
    });

    it("identifies device in use", async () => {
      const mockDevices = [
        {
          vendorId: 0x2c97,
          productName: "Nano S",
          productId: 0x1011,
          opened: true,
        },
      ];

      Object.defineProperty(global, "navigator", {
        value: {
          userAgent: "Chrome/120",
          usb: { getDevices: vi.fn().mockResolvedValue(mockDevices) },
        },
        writable: true,
      });
      Object.defineProperty(global, "window", {
        value: { isSecureContext: true },
        writable: true,
      });

      const diagnostics = await runWebUSBDiagnostics();
      expect(diagnostics.issues.some((i) => i.code === "DEVICE_IN_USE")).toBe(true);
    });
  });

  describe("getDiagnosticReport", () => {
    it("returns a formatted string report", async () => {
      Object.defineProperty(global, "navigator", {
        value: {
          userAgent: "Chrome/120",
          usb: { getDevices: vi.fn().mockResolvedValue([]) },
        },
        writable: true,
      });
      Object.defineProperty(global, "window", {
        value: { isSecureContext: true },
        writable: true,
      });

      const report = await getDiagnosticReport();
      expect(report).toContain("Ledger WebUSB Diagnostics");
      expect(report).toContain("Browser:");
      expect(report).toContain("WebUSB Support:");
    });
  });
});
