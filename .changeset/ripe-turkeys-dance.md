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
- Add eligibleIndices, sumECDHShares, computeInputHash, deriveSilentPaymentOutput to silentpayment.ts
- Update isReadyForSigner to enforce BIP375 signing rules
- Update getTransactionId() for BIP375 unique identification
