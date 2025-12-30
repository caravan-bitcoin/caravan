---
"@caravan/wallets": minor
---

Add WebUSB diagnostics module for troubleshooting Ledger connection issues

New module `webusb-diagnostics` provides functions to help users diagnose Ledger connection problems:

- `detectBrowser()` - Identifies browser and WebUSB/WebHID support
- `isWebUSBAvailable()` - Checks if WebUSB API is available
- `isSecureContext()` - Checks if page is served over HTTPS
- `getConnectedLedgerDevices()` - Lists connected Ledger devices
- `runWebUSBDiagnostics()` - Comprehensive diagnostics with issues and troubleshooting steps
- `getDiagnosticReport()` - Human-readable diagnostic report string

Common issues detected:
- Unsupported browsers (Safari, Firefox)
- Insecure context (HTTP instead of HTTPS)
- Missing device permission
- Device already in use by another application
