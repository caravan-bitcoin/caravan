---
"@caravan/bitcoin": minor
"@caravan/clients": minor
---

@caravan/client 
We are exposing a new method `getAddressTransactions` which will fetch all the transaction for a given address and format it as per needs. To facilitate the change, we had moved the interfaces in the new file `types.ts`.

Another change was about getting the block fee-rate percentile history from mempool as a client.

@caravan/bitcoin
The new function that has the capability to detect the address type (i.e P2SH, P2PKH, P2WSH or P2TR) was added.

Overall, The changes were to support the new library within caravan called @caravan/health.