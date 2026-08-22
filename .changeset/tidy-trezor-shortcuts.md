---
"@caravan/wallets": minor
---

Fix Trezor Connect coin params for Suite 26.8+ by returning shortcuts (`btc`, `test`, `regtest`) from `trezorCoin()` instead of names (`Bitcoin`, `Testnet`, `Regtest`).
