---
"@caravan/bitcoin": patch
"@caravan/psbt": patch
---

Replaced the setters with the private functions so that the output and input count always stays in sync with the actual coutns in the PSBT.
