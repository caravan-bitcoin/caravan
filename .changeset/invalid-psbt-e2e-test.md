---
"caravan-coordinator": none
---

Add an end-to-end test that validates error handling when importing an invalid PSBT file.
The test asserts that an error is surfaced to the user and that the signing flow is blocked
when PSBT parsing fails.

