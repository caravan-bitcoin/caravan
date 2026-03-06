---
"caravan-coordinator": minor
"@caravan/wallets": minor
---

Add address verification support for Coldcard hardware wallets

Implements ColdcardConfirmMultisigAddress interaction for manual address verification via address explorer. Users can now verify multisig addresses on Coldcard devices by:
1. Selecting Coldcard from the address verification dropdown (now enabled)
2. Receiving clear instructions for manual verification using popular block explorers
3. Manually confirming the address matches their device
4. Completing the verification workflow

This enables Coldcard to achieve feature parity with other supported hardware wallets (Trezor, Ledger, Jade, BitBox) for address verification. Direct on-device verification via message signing can be added in future when Coldcard implements that capability.

Includes comprehensive E2E test coverage for the new address verification flow.

Fixes #476
