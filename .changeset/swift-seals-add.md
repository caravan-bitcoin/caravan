---
"@caravan/wallets": minor
---

This integration is similar to the other wallet integrations into Caravan. I have added the jade.ts file as a direct keystore interaction wallet, and updated the caravan-wallet index.ts to support it. I have also added the test suite for this wallet. One caveat about the test suite is that you will have to either choose testnet or mainnet when initializing the wallet with the test seed phrase. If there are any other changes that should be added, let me know. I might need to update the PR for signing messages for testnet. As the wallet only works for signing messages on mainnet right now.
