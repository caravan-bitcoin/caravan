---
"@caravan/wallets": patch
---

Fix Jade signing when the signed PSBT comes back in more than one chunk. Jade stayed on "Processing" or failed with `Expected chunk 2, got undefined`. `JadeSignMultisigTransaction` now requests every chunk itself instead of relying on jadets.
