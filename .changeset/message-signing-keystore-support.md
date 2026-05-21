---
"@caravan/wallets": major
---

Add per-cosigner message-signing primitives and `Entry`-returning
keystore implementations.

`SignMessage({keystore, network?, bip32Path, message, expectedPubkey})`
is the canonical surface. The factory requires `expectedPubkey`
(caller-supplied; the test runner or wallet UI derives it from the
descriptor) and validates `message` (UTF-8, no NUL, ≤240 bytes) before
constructing any per-keystore interaction. The returned interaction's
`.run()` produces `Entry = {bip32Path, signature, expectedPubkey}` — a
uniform shape across keystores.

Supported keystores after this release (all BIP-137):

- `LEDGER` / `LEDGER_V2` — single class dispatches on app version (the
  earlier code called the nonexistent `app.signMessageNew`; that latent
  bug is fixed here).
- `TREZOR` — also fixes a `Network` enum reverse-lookup bug that caused
  `trezorCoin()` to always pick the testnet branch.
- `JADE` — reconstructs the recovery byte from a raw 64-byte EC sig by
  trying both `v` candidates.
- `BITBOX` — new.
- `COLDCARD` — new indirect-keystore SD-card flow.

Verification: `verifyMessageSignature({message, signature, expectedPubkey})`
exported from the package. Wraps `bip322-js` in loose mode so BIP-137
sigs over P2WPKH-derived cosigner paths (caravan's canonical multisig
cosigner shape) verify correctly; strict mode would reject them per the
BIP-322 spec.

Error contract: new `MessageSigningError` discriminated union with
kinds `DeviceRejected`, `TransportError`, `MalformedResponse`,
`MalformedRequest`, each carrying `keystore`, optional `cause`, and
`userMessage`. `e.message` is structured (`[Kind/KEYSTORE] {userMessage}`)
for logs; `e.userMessage` is the bare string for UI surfaces. Every
per-keystore `.run()` wraps raw SDK throws via `wrapSdkError(keystore,
err)` so consumers branch on `e.kind` rather than vendor error shapes.

New exports: `verifyMessageSignature`, `validateMessage`, `wrapSdkError`,
`MessageSigningError`, `MAX_MESSAGE_BYTES`, types `Entry`,
`MessageSigningErrorKind`.

**Design note — protocol selection.** caravan does not model BIP-137 vs
BIP-322 as a runtime flag on these interaction classes. Each class
implements exactly one protocol. Future BIP-322 support will land as
additional per-keystore interaction classes (e.g. a
`ColdcardSignMessageBIP322` wrapping Coldcard's Proof-of-Reserve PSBT
flow, with its own factory routing). A keystore that does not yet have
a BIP-322 class will naturally fall through to `UnsupportedInteraction`
in any future `SignMessageBIP322` factory, matching how every other
caravan-wallets factory handles unsupported (keystore, action) pairs.

**Breaking:** existing `LedgerSignMessage` / `TrezorSignMessage` /
`JadeSignMessage` callers receiving the SDK-native return from
`.run()` (Ledger `{v,r,s}`, Trezor `{address,signature}`, Jade raw hex
EC sig) now receive `Entry`. The factory's `expectedPubkey` argument is
also newly required. Even though `@caravan/wallets` is on a 0.x version
where minor-as-breaking is conventional, this package is broadly
deployed, so the bump is a true major (0.10.1 → 1.0.0).

The next follow-up commit will add BCUR2 message signing once the UR
convention is settled (research in `.claude/feature-plans/bcur2-message-signing-research.md`).
True aggregate BIP-322 FULL Proof-of-Funds across the multisig script
is out of scope for Stage 4a; Stage 4a delivers per-cosigner single-key
signatures (the SeedSigner pattern) sufficient for proof-of-control
over a specific cosigner.
