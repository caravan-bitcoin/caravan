# Contributing E2E Tests

## Architecture Overview
```
pages/       → Page Objects (UI interaction with built-in wait contracts)
fixtures/    → Playwright fixtures (DI) + precondition validators
services/    → Bitcoin RPC helpers (no browser interaction)
state/       → Shared test state (file-based IPC between projects)
setup/       → Global lifecycle (Docker, Bitcoin Core)
tests/       → Test files split by project phase
```

### Project Phases

| Phase | Project | Files | Dependencies |
|-------|---------|-------|-------------|
| Smoke | `smoke` | `smoke.spec.ts` | None |
| Setup | `wallet-setup` | `wallet.setup.ts` | None |
| Tests | `wallet-tests` | `*.spec.ts` (except smoke) | `wallet-setup` |

Playwright enforces the dependency chain. If setup fails, all
dependent tests are skipped with a clear message in the report.

---

## Rules for New Tests

### 1. Never use `waitForTimeout`
```typescript
// ✅ Wait for a condition
await expect(locator).toBeVisible({ timeout: 15000 });
await page.waitForFunction(() => /* DOM condition */);
await expect.poll(() => /* async check */).toBe(expected);

// ❌ Never do this — arbitrary sleep
await page.waitForTimeout(2000);
```

### 2. Always use Page Objects
```typescript
// ✅ Selectors + waits encapsulated in page object
await sendTab.fillRecipient(address, "0.5");
await sendTab.downloadUnsignedPsbt(savePath);

// ❌ Raw selectors in test files
await page.locator('input[name="destination"]').fill(address);
```

### 3. Import from fixtures, not @playwright/test
```typescript
// ✅ Gets typed page objects + btcClient via fixtures
import { test, expect } from "../fixtures/caravan.fixture";
test("my test", async ({ walletImport, sendTab, btcClient }) => { ... });

// ❌ No fixture injection
import { test } from "@playwright/test";
```

### 4. Use preconditions for cross-project dependencies
```typescript
test.beforeAll(() => {
  assertModifiedWalletConfig(); // Fails fast with clear message
});
```

### 5. No try/catch in test bodies

Playwright captures screenshots, traces, and stack traces automatically.
Wrapping in try/catch destroys the original stack trace.

### 6. Download pattern (pit of success)
```typescript
// Inside page objects — contributors can't get this wrong
await expect(btn).toBeVisible();      // 1. Button ready
const promise = page.waitForEvent("download"); // 2. Listener
await btn.click();                     // 3. Click
const file = await promise;            // 4. Save
```

### 7. Arrange-Act-Assert discipline

Keep each test focused on one behavior:
```typescript
// ✅ One behavior per test
test("balance display shows total", async ({ walletNav }) => {
  await walletNav.refresh();             // Arrange
  await walletNav.expectBalance("8 BTC"); // Act + Assert
});

// ❌ Multiple behaviors crammed together
test("import wallet, fund it, check addresses, check balance", ...);
```

### 8. expect.poll vs waitForFunction
```typescript
// expect.poll — for Node-side composed checks (preferred in tests)
await expect.poll(async () => {
  const suffix = await receiveTab.getCurrentPathSuffix();
  return suffix.split("/")[2];
}).toBe("4");

// waitForFunction — for browser-context DOM checks (use in page objects)
await page.waitForFunction(() => {
  return document.querySelector("td code")?.textContent?.trim().length > 0;
});
```

### 9. Document dependencies in test file headers
```typescript
/**
 * Test File: 04-fee-bumping.spec.ts
 * Dependencies: wallet.setup.ts
 * Preconditions: assertModifiedWalletConfig()
 * State produced: (describe what downstream tests need)
 */
```

---

## Adding a New Page Object

1. Create `pages/MyNewComponent.ts`
2. Implement the **wait contract**: every public method waits for stable state
3. Add to `fixtures/caravan.fixture.ts`
4. Use in tests via fixture destructuring

---

## Test File Naming Convention

The Playwright config uses filename patterns to determine execution order.
Choose the correct suffix when creating a new test file:

| Suffix | When to Use | Example |
|--------|------------|---------|
| `.smoke.spec.ts` | Test does not require a funded wallet | `connection.smoke.spec.ts` |
| `.verify.spec.ts` | Test only READS wallet state (addresses, balances, UI display) | `receive-tab.verify.spec.ts` |
| `.mutate.spec.ts` | Test MODIFIES wallet state (sends transactions, fee bumps) | `cpfp.mutate.spec.ts` |

Execution order: smoke → wallet-setup → verify → mutate

The Playwright config matches these patterns with regexes.
You do NOT need to modify playwright.config.ts when adding a new test file.
Just pick the right suffix.

### How to decide: verify or mutate?

Eg: Ask -> "After my test runs, is the wallet balance different?"

- No  → `.verify.spec.ts`
- Yes → `.mutate.spec.ts`

Use a **phase prefix** so files sort naturally in the IDE alongside the `testMatch` patterns we already have , Eg:

```
apps/coordinator/e2e/tests
├── 0-smoke.smoke.spec.ts
├── 1-wallet.setup.ts
├── 2-wallet-display.verify.spec.ts
├── 2-address-generation.verify.spec.ts
├── 3-transaction-send.mutate.spec.ts
├── 3-fee-bump-rbf.mutate.spec.ts
└── 3-fee-bump-cpfp.mutate.spec.ts
```

The pattern is: **`{phase}-{feature}.{category}.spec.ts`**

| Phase | Category | `testMatch` | Purpose |
|-------|----------|-------------|---------|
| `0-` | `.smoke.spec.ts` | `/\.smoke\.spec\.ts$/` | App loads, basic health |
| `1-` | `.setup.ts` | `wallet.setup.ts` | Wallet import, fund addresses |
| `2-` | `.verify.spec.ts` | `/\.verify\.spec\.ts$/` | Read-only assertions (balances, addresses, UTXO display) |
| `3-` | `.mutate.spec.ts` | `/\.mutate\.spec\.ts$/` | State-changing ops (sends, fee bumps) |


## Future: data-testid Attributes

When modifying React components that E2E tests interact with, add
stable test handles using the convention:
```
data-testid="{scope}-{name}-{type}"
```

Examples:
- `data-testid="send-download-psbt-button"`
- `data-testid="receive-address-cell"`
- `data-testid="wallet-balance-display"`

This decouples tests from button text and CSS structure.
