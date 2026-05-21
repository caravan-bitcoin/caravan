---
"caravan-coordinator": minor
---

Add a message-signing category to the `/#/test` keystore test suite, exercising per-cosigner BIP-137 signing on Ledger, Trezor, Jade, and Coldcard. Includes a new Coldcard SD-card UX (download request `.txt`, upload signed `.txt`) and a `ColdcardTextReader` for the signed-message file.
