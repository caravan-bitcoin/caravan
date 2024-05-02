---
"@caravan/clients": patch
"caravan-coordinator": patch
---

Rescan functionality was not correctly being passed into bitcoindImportDescriptors which it needs to be in order to correctly set timestamp equal to "0" when rescan equals true.
