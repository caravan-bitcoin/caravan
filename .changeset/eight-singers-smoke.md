---
"@caravan/psbt": minor
---

Fixes PsbtV2.isReadyForConstructor by not requiring that PSBT_GLOBAL_FALLBACK_LOCKTIME be set. This field is not required on a psbtv2 per BIP370.
