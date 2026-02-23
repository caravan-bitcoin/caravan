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
