---
"@caravan/wallets": patch
"caravan-coordinator": patch
---

fixes an issue where esbuild was polyfilling process.env which breaks the ability to override trezor connect settings and pass other env vars at run time in dependent applications
