# @caravan/messages

Protocol-layer primitives for signing and verifying Bitcoin messages against a known cosigner pubkey — independent of any specific hardware wallet or keystore.

```ts
import {
  type Entry,
  MessageSigningError,
  validateMessage,
  verifyMessageSignature,
} from "@caravan/messages";

validateMessage(message, "MY_SOURCE"); // throws MessageSigningError on bad encoding

const ok = verifyMessageSignature({ message, signature, expectedPubkey });
```

Hardware-wallet drivers that produce signatures live in `@caravan/wallets`; that package consumes the types here and routes through `SignMessage(...)` to a per-keystore implementation. This package is the recovery / verification side and stays driver-agnostic.

Verifier behaviour: wraps `bip322-js` in loose mode so caravan's canonical P2WPKH cosigner paths verify under BIP-137. Address type is hardcoded P2WPKH.
