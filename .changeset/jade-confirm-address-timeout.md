---
"@caravan/wallets": patch
---

Stop Jade address confirmation from timing out. jadets sends `get_receive_address` with a 5 second timeout, but the Jade holds the reply until the user confirms the address on the device. `JadeConfirmMultisigAddress` now sends the call without a timeout.
