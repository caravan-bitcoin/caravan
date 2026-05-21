import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  MAX_MESSAGE_BYTES,
  MessageSigningError,
  validateMessage,
  verifyMessageSignature,
} from "./index";

type FixtureEntry = {
  description: string;
  bip32Path: string;
  message: string;
  pubkey: string;
  unchainedPubkey: string;
  bip137: string;
  bip322: string;
};

const FIXTURES: FixtureEntry[] = JSON.parse(
  readFileSync(
    join(__dirname, "..", "test-fixtures", "signatures.json"),
    "utf8",
  ),
);

const NUL = String.fromCharCode(0);

describe("validateMessage", () => {
  it("accepts a basic ASCII message", () => {
    expect(() => validateMessage("Hello", "TEST")).not.toThrow();
  });

  it("accepts a UTF-8 message with multi-byte chars", () => {
    expect(() => validateMessage("Hello 世界", "TEST")).not.toThrow();
  });

  it("accepts an empty string", () => {
    expect(() => validateMessage("", "TEST")).not.toThrow();
  });

  it("accepts a message at exactly MAX_MESSAGE_BYTES", () => {
    expect(() =>
      validateMessage("a".repeat(MAX_MESSAGE_BYTES), "TEST"),
    ).not.toThrow();
  });

  it("rejects messages over MAX_MESSAGE_BYTES (ASCII)", () => {
    expect(() =>
      validateMessage("a".repeat(MAX_MESSAGE_BYTES + 1), "TEST"),
    ).toThrowError(MessageSigningError);
  });

  it("counts UTF-8 byte length, not character length", () => {
    // each "世" is 3 UTF-8 bytes; 81 chars = 243 bytes > 240
    expect(() => validateMessage("世".repeat(81), "TEST")).toThrowError(
      MessageSigningError,
    );
  });

  it("rejects messages containing NUL bytes", () => {
    expect(() => validateMessage(`a${NUL}b`, "TEST")).toThrowError(
      MessageSigningError,
    );
  });

  it("produces structured .message + bare .userMessage on the error", () => {
    try {
      validateMessage("a".repeat(MAX_MESSAGE_BYTES + 1), "JADE");
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(MessageSigningError);
      const e = err as MessageSigningError;
      expect(e.kind).toBe("MalformedRequest");
      expect(e.keystore).toBe("JADE");
      expect(e.message).toContain("[MalformedRequest/JADE]");
      expect(e.message).toContain(e.userMessage);
      expect(e.userMessage.startsWith("[")).toBe(false);
    }
  });
});

describe("verifyMessageSignature — input validation", () => {
  const { pubkey, message, bip137 } = FIXTURES[0];

  it("returns false for non-hex pubkey", () => {
    expect(
      verifyMessageSignature({
        message,
        signature: bip137,
        pubkey: "not-hex",
      }),
    ).toBe(false);
  });

  it("returns false for short (non-33-byte) pubkey", () => {
    expect(
      verifyMessageSignature({
        message,
        signature: bip137,
        pubkey: "0123abcd",
      }),
    ).toBe(false);
  });

  it("returns false for garbage signature input", () => {
    expect(
      verifyMessageSignature({
        message,
        signature: "not-base64-at-all-!!!",
        pubkey,
      }),
    ).toBe(false);
  });
});

describe("verifyMessageSignature — fixture round-trip", () => {
  FIXTURES.forEach((fix) => {
    describe(fix.description, () => {
      it("verifies the BIP-137 fixture", () => {
        expect(
          verifyMessageSignature({
            message: fix.message,
            signature: fix.bip137,
            pubkey: fix.pubkey,
          }),
        ).toBe(true);
      });

      it("verifies the BIP-322 fixture (loose-mode)", () => {
        expect(
          verifyMessageSignature({
            message: fix.message,
            signature: fix.bip322,
            pubkey: fix.pubkey,
          }),
        ).toBe(true);
      });

      it("rejects the same signature against the unchained cosigner pubkey", () => {
        expect(
          verifyMessageSignature({
            message: fix.message,
            signature: fix.bip137,
            pubkey: fix.unchainedPubkey,
          }),
        ).toBe(false);
      });

      it("rejects when the message differs from what was signed", () => {
        expect(
          verifyMessageSignature({
            message: `${fix.message} — tampered`,
            signature: fix.bip137,
            pubkey: fix.pubkey,
          }),
        ).toBe(false);
      });

      it("rejects a tampered signature", () => {
        const tampered = Buffer.from(fix.bip137, "base64");
        const mid = Math.floor(tampered.length / 2);
        tampered[mid] = 255 - tampered[mid];
        expect(
          verifyMessageSignature({
            message: fix.message,
            signature: tampered.toString("base64"),
            pubkey: fix.pubkey,
          }),
        ).toBe(false);
      });
    });
  });
});
