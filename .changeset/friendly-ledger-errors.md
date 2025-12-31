---
"@caravan/wallets": minor
---

Add human-readable Ledger error messages

This change adds a comprehensive mapping of Ledger device error codes to user-friendly messages. When a Ledger operation fails, users will now see helpful messages like "User denied the request on the Ledger device" instead of cryptic codes like "0x6985" or "21781".

New exports:
- `LEDGER_ERROR_MESSAGES`: A map of error codes to human-readable messages
- `translateLedgerError`: A function to translate Ledger errors into user-friendly messages

Common error codes now have helpful translations:
- 6985/21781: User denied the request
- 6e00: Device locked or wrong app open
- 6a82: Bitcoin app not found
- Various transport-level errors (disconnected, busy, access denied)
