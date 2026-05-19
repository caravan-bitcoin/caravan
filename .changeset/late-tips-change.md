---
"@caravan/clients": patch
---

Export `callBitcoind` from the package index. Previously only reachable
via the internal `./bitcoind` subpath, this is a generic JSON-RPC helper
useful for any consumer talking directly to bitcoind.
