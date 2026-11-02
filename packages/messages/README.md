# @caravan/messages

Internal package. Bitcoin message-signing protocol primitives — verifier, `Entry` shape, encoding validation, error taxonomy.

```ts
import {
  type Entry,
  MessageSigningError,
  validateMessage,
  verifyMessageSignature,
} from "@caravan/messages";

validateMessage(message, "MY_SOURCE");
const ok = verifyMessageSignature({ message, signature, pubkey });
```

Verifier wraps `bip322-js` in loose mode against the P2WPKH address derived from `pubkey`. Hardware-wallet drivers that produce signatures live in `@caravan/wallets`.
