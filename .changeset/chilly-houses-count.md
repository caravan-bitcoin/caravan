---
"@caravan/psbt": patch
---

Replaced the setters with the private functions so that the output and input count always stays in sync with the actual counts in the PSBT.
