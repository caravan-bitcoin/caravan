---
"@caravan/psbt": minor
---

PsbtV2 operator role validation getters are added to provide a way for validating role readiness. These getters are used in some Constructor and Signer methods. For example, an error will be thrown if `addPartialSig` is called when the PsbtV2 is not ready for a Signer.
