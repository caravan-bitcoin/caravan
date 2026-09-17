---
"@caravan/bitcoin": patch
---

Deprecate the `psbtv2` module. `PsbtV2`, `PsbtV2Maps` and `getPsbtVersionNumber` exported from `@caravan/bitcoin` are an unmaintained copy of the implementation in `@caravan/psbt` and should be imported from there instead. These exports will be removed in a future major release.
