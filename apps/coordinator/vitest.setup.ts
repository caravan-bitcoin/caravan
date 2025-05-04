import { vi } from "vitest";

vi.mock("bitcoinjs-lib-v6", async () => {
  const actual = await vi.importActual("bitcoinjs-lib-v6");
  return {
    ...actual,
    initEccLib: vi.fn(),
  };
});
