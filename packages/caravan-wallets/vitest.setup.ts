import { vi } from "vitest";

// Mock tiny-secp256k1-asmjs
vi.mock("../caravan-psbt/vendor/tiny-secp256k1-asmjs/lib/index.js", () => {
  return {
    __initializeContext: vi.fn(),
    isPoint: vi.fn(() => true),
    isPointCompressed: vi.fn(() => true),
    isPrivate: vi.fn(() => true),
    pointAdd: vi.fn(),
    pointAddScalar: vi.fn(),
    pointCompress: vi.fn(),
    pointFromScalar: vi.fn(),
    pointMultiply: vi.fn(),
    privateAdd: vi.fn(),
    privateSub: vi.fn(),
    sign: vi.fn(),
    signSchnorr: vi.fn(),
    verify: vi.fn(() => true),
    verifySchnorr: vi.fn(() => true),
  };
});

// Mock bitcoinjs-lib-v6 ECC initialization
vi.mock("bitcoinjs-lib-v6", async () => {
  const actual = await vi.importActual("bitcoinjs-lib-v6");
  return {
    ...actual,
    initEccLib: vi.fn(),
  };
});
