---
"@caravan/health": patch
"caravan-coordinator": patch
---

Added missing `export` statements to the `WalletState` interface and selector functions in `wallet.ts`. 
Also added `export * from "./spendType";` to`caravan-health` to re-export spend type utilities.  
Added `@caravan/fees` as a dependency to coordinator.  
Improves type safety and makes exports consistent across packages. 

