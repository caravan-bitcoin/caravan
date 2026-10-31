---
"@caravan/bitcoin": patch
---

Add pre-computed BIP-137 and BIP-322 signatures to each `TEST_FIXTURES.multisigs` entry under a new `signedMessages: { message, bip137, bip322 }` field. Signed at the entry's `bip32Path` with the open_source seed; consumers can verify the signatures without re-signing in-test.
