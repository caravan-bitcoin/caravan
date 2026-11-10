---
"@caravan/wallets": patch
---

Trezor: read error text from Trezor Suite desktop responses, and only retry public key export with a bundle call when the response has no descriptor (Model One). Cancelling no longer opens a second Trezor prompt.
