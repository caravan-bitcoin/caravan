---
"@caravan/wallets": major
---

Per-cosigner message signing across Ledger, Trezor, Jade, and Coldcard. `SignMessage` normalizes each SDK's native output into `SignMessageResult = {bip32Path, signature, pubkey}` and surfaces SDK errors as `MessageSigningError`. Each `.run()` verifies the returned signature against the cosigner `pubkey` before yielding a result. Breaking: `SignMessage` requires `pubkey` and `.run()` now returns `SignMessageResult`; the verifier, the result type, and the error taxonomy live in the new internal `@caravan/messages` package. BitBox is not supported — its firmware refuses `sign_message` at multisig-purpose cosigner paths (BIP-45/48); only BIP-49/84 are accepted.
