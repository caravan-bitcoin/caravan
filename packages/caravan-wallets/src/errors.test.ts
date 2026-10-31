import { Network } from "@caravan/bitcoin";
import { MAX_MESSAGE_BYTES, MessageSigningError } from "@caravan/messages";

import { wrapSdkError } from "./errors";

import { BITBOX, COLDCARD, JADE, LEDGER, SignMessage, TREZOR } from "./index";

describe("wrapSdkError", () => {
  it("passes MessageSigningError instances through unchanged", () => {
    const original = new MessageSigningError({
      kind: "MalformedResponse",
      keystore: "LEDGER",
      userMessage: "garbage from device",
    });
    expect(wrapSdkError("LEDGER", original)).toBe(original);
  });

  it("classifies Ledger statusCode 0x6985 as DeviceRejected", () => {
    const err = Object.assign(new Error("CONDITIONS_OF_USE_NOT_SATISFIED"), {
      statusCode: 0x6985,
    });
    const wrapped = wrapSdkError("LEDGER", err);
    expect(wrapped.kind).toBe("DeviceRejected");
    expect(wrapped.keystore).toBe("LEDGER");
    expect(wrapped.cause).toBe(err);
  });

  it.each([
    "User cancelled",
    "Action rejected by user",
    "denied",
    "Aborted by user",
    "user abort",
  ])("classifies %s as DeviceRejected", (msg) => {
    expect(wrapSdkError("TREZOR", new Error(msg)).kind).toBe("DeviceRejected");
  });

  it("classifies anything else as TransportError", () => {
    const err = new Error("USB device unplugged");
    const wrapped = wrapSdkError("JADE", err);
    expect(wrapped.kind).toBe("TransportError");
    expect(wrapped.userMessage).toBe("USB device unplugged");
    expect(wrapped.cause).toBe(err);
  });

  it("handles non-Error throws by stringifying", () => {
    const wrapped = wrapSdkError("BITBOX", "raw string thrown");
    expect(wrapped.kind).toBe("TransportError");
    expect(wrapped.userMessage).toBe("raw string thrown");
  });
});

describe("SignMessage factory runs validateMessage before constructing", () => {
  const oversize = "a".repeat(MAX_MESSAGE_BYTES + 1);
  const bip32Path = "m/84'/0'/0'/0/0";
  const pubkey =
    "0387cb4929c287665fbda011b1afbebb0e691a5ee11ee9a561fcd6adba266afe03";

  it.each([
    [LEDGER, false],
    [TREZOR, false],
    [JADE, false],
    [BITBOX, true],
    [COLDCARD, false],
  ])(
    "%s: throws MalformedRequest before constructing the interaction",
    (keystore, needsNetwork) => {
      expect(() =>
        SignMessage({
          keystore: keystore as any,
          network: needsNetwork ? Network.MAINNET : null,
          bip32Path,
          message: oversize,
          pubkey,
        }),
      ).toThrow(
        expect.objectContaining({
          kind: "MalformedRequest",
          keystore,
        }),
      );
    },
  );
});
