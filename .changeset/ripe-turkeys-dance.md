---
"@caravan/psbt": minor
---

Add BIP375 silent payment sending support to PsbtV2

- Add PSBT_OUT_SP_V0_INFO and PSBT_OUT_SP_V0_LABEL getters and methods
- Add PSBT_GLOBAL_SP_ECDH_SHARE, PSBT_GLOBAL_SP_DLEQ getters and methods
- Add PSBT_IN_SP_ECDH_SHARE, PSBT_IN_SP_DLEQ getters and methods
- Add silentPayment option to addOutput() for SP output construction
- Add computeSilentPaymentOutputScripts() implementing BIP352 derivation
- Add hasSilentPaymentOutputs, hasAllSPOutputScripts, hasCompleteECDHCoverage predicates
- Update isReadyForSigner to enforce BIP375 signing rules
- Update getTransactionId() for BIP375 unique identification

Behaviour changes to existing APIs:

- addPartialSig() now rethrows after rolling back. It previously swallowed
  errors from handleSighashType(), leaving callers to believe a signature had
  been added when it had not.
- convertToV0() now throws when a silent payment output has no computed
  PSBT_OUT_SCRIPT. Per BIP375 such a PSBT is not backwards compatible, and the
  unique-identification placeholder must never reach a real transaction.

The silent payment helpers in silentpayment.ts and dleq.ts are internal and are
deliberately not exported from the package root; the public surface will be
settled alongside the signer/coordinator integration.
