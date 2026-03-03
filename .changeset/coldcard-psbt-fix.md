---
"@caravan/psbt": patch
"caravan-coordinator": patch
---

Fix PSBT signature validation fallback to handle cases where hardware wallets (like ColdCard Q) strip derivation metadata. Reverted silent error swallowing in multisig validation to allow errors to surface in the UI.
