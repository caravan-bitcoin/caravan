---
"@caravan/wallets": major
---

Per-cosigner message signing across Ledger, Trezor, Jade, BitBox, and Coldcard. `SignMessage` normalizes each SDK's native output into `Entry = {bip32Path, signature, pubkey}` and surfaces SDK errors as `MessageSigningError`. Each `.run()` verifies the returned signature against the cosigner `pubkey` before yielding an Entry. Breaking: `SignMessage` requires `pubkey` and `.run()` now returns `Entry`; the verifier, `Entry` type, and error taxonomy live in the new internal `@caravan/messages` package.
