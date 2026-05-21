---
"@caravan/wallets": major
---

Per-cosigner message signing across Ledger, Trezor, Jade, BitBox, and Coldcard. `SignMessage` normalizes each SDK's native output into `Entry = {bip32Path, signature, expectedPubkey}` and surfaces SDK errors as `MessageSigningError`. Breaking: `SignMessage` requires `expectedPubkey` and `.run()` now returns `Entry`; the verifier, `Entry` type, and error taxonomy move to the new `@caravan/messages` package.
