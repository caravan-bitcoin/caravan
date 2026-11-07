---
"@caravan/wallets": patch
---

Fix Jade signing when the signed PSBT comes back in more than one chunk. Jade stayed on "Processing" or failed with `Expected chunk 2, got undefined`. `JadeSignMultisigTransaction` now requests every chunk itself instead of relying on jadets.

This is #545 again without `Buffer.concat`. Apps that bundle the buffer@4 polyfill rejected the plain `Uint8Array` chunks with `"list" argument must be an Array of Buffers`, which broke every Jade signature in those apps.
