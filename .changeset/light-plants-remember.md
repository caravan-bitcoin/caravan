---
"@caravan/bitcoin": minor
---

transaction parser was stripping out network information from global xpubs being added to psbt. global xpubs will now respect the network and include appropriate prefix
