---
"@caravan/wallets": major
---

Per-cosigner message signing across Ledger, Trezor, Jade, BitBox, and Coldcard with a normalized `Entry = {bip32Path, signature, expectedPubkey}` return shape and a pubkey-aware `verifyMessageSignature` verifier. Breaking: `SignMessage` requires `expectedPubkey`, `.run()` returns `Entry` instead of the SDK-native value, and SDK errors surface as `MessageSigningError`.
