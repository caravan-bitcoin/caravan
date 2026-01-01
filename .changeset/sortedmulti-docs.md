---
"@caravan/bitcoin": patch
---

Add documentation for sortedmulti public key ordering

Clarifies that `generateMultisigFromPublicKeys` uses public keys in the order passed,
and that callers must sort keys lexicographically for `sortedmulti` compatibility
(required by hardware wallets like Ledger and Trezor, and standard in descriptors).

Updated both the README and JSDoc comments with examples showing proper usage.
