import { Network } from "@caravan/bitcoin";
import { describe, it, expect, vi } from "vitest";

import { BitBoxSignMessage } from "./bitbox";
import { MAX_MESSAGE_BYTES, MessageSigningError } from "./messages";

const EXPECTED_PUBKEY =
  "0387cb4929c287665fbda011b1afbebb0e691a5ee11ee9a561fcd6adba266afe03";

function makeInteraction(message = "hello world") {
  return new BitBoxSignMessage({
    network: Network.MAINNET,
    bip32Path: "m/84'/0'/0'/0/0",
    message,
    expectedPubkey: EXPECTED_PUBKEY,
  });
}

describe("BitBoxSignMessage", () => {
  it("constructor throws MessageSigningError on oversize message", () => {
    expect(() =>
      makeInteraction("a".repeat(MAX_MESSAGE_BYTES + 1)),
    ).toThrowError(MessageSigningError);
  });

  it("run() base64-encodes electrumSig65 and returns Entry", async () => {
    const interaction = makeInteraction();
    // Synthesize a 65-byte electrumSig65: header byte 39 (P2WPKH range,
    // recid 0, compressed) + r||s.
    const r32 = Buffer.alloc(32, 0xaa);
    const s32 = Buffer.alloc(32, 0xbb);
    const electrumSig65 = Uint8Array.from(
      Buffer.concat([Buffer.from([39]), r32, s32]),
    );
    const mockBitBox = {
      btcSignMessage: vi.fn().mockResolvedValue({
        sig: new Uint8Array(64),
        recid: 0n,
        electrumSig65,
      }),
    };
    vi.spyOn(interaction, "withDevice").mockImplementation(
      async (cb: any) => cb(mockBitBox),
    );

    const entry = await interaction.run();

    expect(mockBitBox.btcSignMessage).toHaveBeenCalledWith(
      "btc",
      {
        scriptConfig: { simpleType: "p2wpkh" },
        keypath: "m/84'/0'/0'/0/0",
      },
      new TextEncoder().encode("hello world"),
    );
    expect(entry.bip32Path).toBe("m/84'/0'/0'/0/0");
    expect(entry.expectedPubkey).toBe(EXPECTED_PUBKEY);
    expect(entry.signature).toBe(
      Buffer.from(electrumSig65).toString("base64"),
    );
  });

  it("run() throws MalformedResponse if electrumSig65 isn't 65 bytes", async () => {
    const interaction = makeInteraction();
    const mockBitBox = {
      btcSignMessage: vi.fn().mockResolvedValue({
        sig: new Uint8Array(64),
        recid: 0n,
        electrumSig65: new Uint8Array(32),
      }),
    };
    vi.spyOn(interaction, "withDevice").mockImplementation(
      async (cb: any) => cb(mockBitBox),
    );

    await expect(interaction.run()).rejects.toThrowError(MessageSigningError);
  });

  it("uses 'tbtc' coin code on testnet", async () => {
    const interaction = new BitBoxSignMessage({
      network: Network.TESTNET,
      bip32Path: "m/84'/1'/0'/0/0",
      message: "tn msg",
      expectedPubkey: EXPECTED_PUBKEY,
    });
    const r32 = Buffer.alloc(32, 0x11);
    const s32 = Buffer.alloc(32, 0x22);
    const mockBitBox = {
      btcSignMessage: vi.fn().mockResolvedValue({
        sig: new Uint8Array(64),
        recid: 0n,
        electrumSig65: Uint8Array.from(
          Buffer.concat([Buffer.from([39]), r32, s32]),
        ),
      }),
    };
    vi.spyOn(interaction, "withDevice").mockImplementation(
      async (cb: any) => cb(mockBitBox),
    );

    await interaction.run();

    expect(mockBitBox.btcSignMessage).toHaveBeenCalledWith(
      "tbtc",
      expect.any(Object),
      expect.any(Uint8Array),
    );
  });
});
