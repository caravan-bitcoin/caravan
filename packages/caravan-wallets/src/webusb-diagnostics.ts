/**
 * WebUSB diagnostics module for troubleshooting Ledger connection issues.
 *
 * This module provides functions to help users diagnose why their Ledger
 * device might not be connecting properly.
 */

/**
 * Browser detection result
 */
export interface BrowserInfo {
  name: string;
  version: string;
  supportsWebUSB: boolean;
  supportsWebHID: boolean;
}

/**
 * Ledger device info from WebUSB
 */
export interface LedgerDeviceInfo {
  productName: string;
  vendorId: number;
  productId: number;
  serialNumber?: string;
  opened: boolean;
}

/**
 * Comprehensive diagnostics result
 */
export interface WebUSBDiagnostics {
  browser: BrowserInfo;
  webUSBAvailable: boolean;
  webHIDAvailable: boolean;
  secureContext: boolean;
  permissionGranted: boolean;
  devicesFound: LedgerDeviceInfo[];
  issues: DiagnosticIssue[];
  troubleshootingSteps: string[];
}

/**
 * A diagnostic issue with severity
 */
export interface DiagnosticIssue {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
}

/**
 * Ledger USB vendor ID
 */
const LEDGER_VENDOR_ID = 0x2c97;

/**
 * Detects the current browser and its WebUSB/WebHID support.
 */
export function detectBrowser(): BrowserInfo {
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
  let name = "Unknown";
  let version = "0";

  // Detect browser from user agent
  if (userAgent.includes("Firefox/")) {
    name = "Firefox";
    const match = userAgent.match(/Firefox\/(\d+)/);
    version = match ? match[1] : "0";
  } else if (userAgent.includes("Edg/")) {
    name = "Edge";
    const match = userAgent.match(/Edg\/(\d+)/);
    version = match ? match[1] : "0";
  } else if (userAgent.includes("Chrome/")) {
    name = "Chrome";
    const match = userAgent.match(/Chrome\/(\d+)/);
    version = match ? match[1] : "0";
  } else if (userAgent.includes("Safari/") && !userAgent.includes("Chrome")) {
    name = "Safari";
    const match = userAgent.match(/Version\/(\d+)/);
    version = match ? match[1] : "0";
  } else if (userAgent.includes("Opera/") || userAgent.includes("OPR/")) {
    name = "Opera";
    const match = userAgent.match(/(?:Opera|OPR)\/(\d+)/);
    version = match ? match[1] : "0";
  }

  // Check WebUSB support
  const supportsWebUSB =
    typeof navigator !== "undefined" &&
    "usb" in navigator &&
    typeof (navigator as any).usb?.getDevices === "function";

  // Check WebHID support
  const supportsWebHID =
    typeof navigator !== "undefined" &&
    "hid" in navigator &&
    typeof (navigator as any).hid?.getDevices === "function";

  return {
    name,
    version,
    supportsWebUSB,
    supportsWebHID,
  };
}

/**
 * Checks if WebUSB is available in the current environment.
 */
export function isWebUSBAvailable(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "usb" in navigator &&
    typeof (navigator as any).usb?.getDevices === "function"
  );
}

/**
 * Checks if the page is running in a secure context (required for WebUSB).
 */
export function isSecureContext(): boolean {
  return typeof window !== "undefined" && window.isSecureContext === true;
}

/**
 * Gets a list of connected Ledger devices.
 * Returns an empty array if WebUSB is not available or permission not granted.
 */
export async function getConnectedLedgerDevices(): Promise<LedgerDeviceInfo[]> {
  if (!isWebUSBAvailable()) {
    return [];
  }

  try {
    const devices = await (navigator as any).usb.getDevices();
    return devices
      .filter((d: any) => d.vendorId === LEDGER_VENDOR_ID)
      .map((d: any) => ({
        productName: d.productName || "Ledger Device",
        vendorId: d.vendorId,
        productId: d.productId,
        serialNumber: d.serialNumber,
        opened: d.opened,
      }));
  } catch {
    return [];
  }
}

/**
 * Runs comprehensive WebUSB diagnostics and returns actionable information.
 */
export async function runWebUSBDiagnostics(): Promise<WebUSBDiagnostics> {
  const browser = detectBrowser();
  const webUSBAvailable = isWebUSBAvailable();
  const secureContext = isSecureContext();
  const webHIDAvailable =
    typeof navigator !== "undefined" &&
    "hid" in navigator &&
    typeof (navigator as any).hid?.getDevices === "function";

  let devicesFound: LedgerDeviceInfo[] = [];
  let permissionGranted = false;

  if (webUSBAvailable) {
    devicesFound = await getConnectedLedgerDevices();
    permissionGranted = devicesFound.length > 0;
  }

  const issues: DiagnosticIssue[] = [];
  const troubleshootingSteps: string[] = [];

  // Check for issues and build troubleshooting steps

  // Browser support
  if (!browser.supportsWebUSB) {
    if (browser.name === "Safari") {
      issues.push({
        severity: "error",
        code: "SAFARI_NOT_SUPPORTED",
        message: "Safari does not support WebUSB. Please use Chrome or Edge.",
      });
      troubleshootingSteps.push(
        "Switch to Chrome, Edge, or another Chromium-based browser."
      );
    } else if (browser.name === "Firefox") {
      issues.push({
        severity: "error",
        code: "FIREFOX_WEBUSB",
        message:
          "Firefox has limited WebUSB support. Please use Chrome or Edge for best compatibility.",
      });
      troubleshootingSteps.push(
        "Switch to Chrome, Edge, or another Chromium-based browser."
      );
    } else {
      issues.push({
        severity: "error",
        code: "WEBUSB_NOT_SUPPORTED",
        message:
          "Your browser does not support WebUSB. Please use Chrome or Edge.",
      });
      troubleshootingSteps.push(
        "Switch to Chrome, Edge, or another Chromium-based browser."
      );
    }
  }

  // Secure context
  if (!secureContext) {
    issues.push({
      severity: "error",
      code: "INSECURE_CONTEXT",
      message:
        "WebUSB requires a secure context (HTTPS). The page is not being served over HTTPS.",
      });
    troubleshootingSteps.push(
      "Access this page over HTTPS, or use localhost for development."
    );
  }

  // Permission
  if (webUSBAvailable && !permissionGranted) {
    issues.push({
      severity: "warning",
      code: "NO_PERMISSION",
      message:
        "No Ledger device permission granted yet. User needs to select device.",
    });
    troubleshootingSteps.push(
      "Click the connect button and select your Ledger device in the browser dialog."
    );
  }

  // Device state
  if (permissionGranted && devicesFound.length > 0) {
    const openedDevice = devicesFound.find((d) => d.opened);
    if (openedDevice) {
      issues.push({
        severity: "warning",
        code: "DEVICE_IN_USE",
        message:
          "A Ledger device is already opened. It may be in use by another application or browser tab.",
      });
      troubleshootingSteps.push(
        "Close Ledger Live if it's running.",
        "Close other browser tabs that might be using the device.",
        "Unplug and replug the device."
      );
    }
  }

  // General tips if no specific issues found
  if (issues.length === 0 && !permissionGranted) {
    troubleshootingSteps.push(
      "Make sure your Ledger device is connected via a data-capable USB cable (not a charge-only cable).",
      "Unlock your Ledger device and open the Bitcoin app.",
      "Click the connect button and select your Ledger in the browser dialog."
    );
  }

  // Common troubleshooting steps
  if (troubleshootingSteps.length === 0) {
    troubleshootingSteps.push(
      "Ensure your Ledger device is unlocked.",
      "Make sure the Bitcoin app is open on your Ledger.",
      "Try unplugging and replugging the device.",
      "Make sure you're using a data-capable USB cable."
    );
  }

  return {
    browser,
    webUSBAvailable,
    webHIDAvailable,
    secureContext,
    permissionGranted,
    devicesFound,
    issues,
    troubleshootingSteps,
  };
}

/**
 * Returns a human-readable diagnostic report as a string.
 */
export async function getDiagnosticReport(): Promise<string> {
  const diagnostics = await runWebUSBDiagnostics();
  const lines: string[] = [];

  lines.push("=== Ledger WebUSB Diagnostics ===\n");

  lines.push(`Browser: ${diagnostics.browser.name} v${diagnostics.browser.version}`);
  lines.push(`WebUSB Support: ${diagnostics.browser.supportsWebUSB ? "Yes" : "No"}`);
  lines.push(`WebHID Support: ${diagnostics.browser.supportsWebHID ? "Yes" : "No"}`);
  lines.push(`Secure Context: ${diagnostics.secureContext ? "Yes" : "No"}`);
  lines.push(`Permission Granted: ${diagnostics.permissionGranted ? "Yes" : "No"}`);
  lines.push(`Devices Found: ${diagnostics.devicesFound.length}`);

  if (diagnostics.devicesFound.length > 0) {
    lines.push("\nConnected Devices:");
    for (const device of diagnostics.devicesFound) {
      lines.push(`  - ${device.productName} (opened: ${device.opened})`);
    }
  }

  if (diagnostics.issues.length > 0) {
    lines.push("\nIssues Found:");
    for (const issue of diagnostics.issues) {
      const prefix = issue.severity === "error" ? "❌" : issue.severity === "warning" ? "⚠️" : "ℹ️";
      lines.push(`  ${prefix} [${issue.code}] ${issue.message}`);
    }
  }

  if (diagnostics.troubleshootingSteps.length > 0) {
    lines.push("\nTroubleshooting Steps:");
    diagnostics.troubleshootingSteps.forEach((step, i) => {
      lines.push(`  ${i + 1}. ${step}`);
    });
  }

  return lines.join("\n");
}
