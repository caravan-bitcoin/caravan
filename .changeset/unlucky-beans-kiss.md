---
"caravan-coordinator": major
"@caravan/clients": minor
---

Caravan Coordinator:
Adds descriptor import support for caravan coordinator. This is a backwards incompatible
change for instances that need to interact with bitcoind nodes older than v21 which introduced
descriptor wallets.

@caravan/clients
- named wallet interactions
- import descriptor support
