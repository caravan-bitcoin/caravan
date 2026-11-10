---
"@caravan/wallets": patch
---

Fix Jade Classic signing. Switch from `jadets` to the `@caravan/jadets` fork, which fetches the last chunk of a multipart `sign_psbt` reply and clears DTR/RTS after opening serial. Before this, Jade Classic stayed on "Processing" after the user approved a transaction and never returned a signature.
