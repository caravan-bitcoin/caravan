---
"@caravan/wallets": patch
---

This patch fixes signing large PSBTs on Jade devices as the device break up the transaction into sequenced chunks and we were not supporting that. Also extends timeout time for confirming address on device.
