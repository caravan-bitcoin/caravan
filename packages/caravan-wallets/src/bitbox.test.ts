import { Network } from "@caravan/bitcoin";
import { MessageSigningError } from "@caravan/messages";
import { describe, it, expect, vi } from "vitest";

import { BitBoxSignMessage } from "./bitbox";

const PUBKEY =
  "0387cb4929c287665fbda011b1afbebb0e691a5ee11ee9a561fcd6adba266afe03";
const PATH = "m/84'/0'/0'/0/0";

function makeInteraction(opts: Partial<{
  network: Network;
  bip32Path: string;
  message: string;
}> = {}) {
  return new BitBoxSignMessage({
    network: opts.network ?? Network.MAINNET,
    bip32Path: opts.bip32Path ?? PATH,
    message: opts.message ?? "hello world",
    pubkey: PUBKEY,
  });
}

function fakeElectrumSig65(fill = 0xaa, fill2 = 0xbb): Uint8Array {
  return Uint8Array.from(
    Buffer.concat([
      Buffer.from([39]),
      Buffer.alloc(32, fill),
      Buffer.alloc(32, fill2),
    ]),
  );
}

function mountBitBoxSDK(
  interaction: BitBoxSignMessage,
  sdkResult: Record<string, unknown> | Error,
) {
  const btcSignMessage =
    sdkResult instanceof Error
      ? vi.fn().mockRejectedValue(sdkResult)
      : vi.fn().mockResolvedValue(sdkResult);
  vi.spyOn(interaction, "withDevice").mockImplementation(async (cb: any) =>
    cb({ btcSignMessage }),
  );
  return btcSignMessage;
}

async function expectRunThrows(
  interaction: BitBoxSignMessage,
): Promise<MessageSigningError> {
  try {
    await interaction.run();
    throw new Error("expected throw");
  } catch (err) {
    expect(err).toBeInstanceOf(MessageSigningError);
    return err as MessageSigningError;
  }
}

describe("BitBoxSignMessage", () => {
  it("run() base64-encodes electrumSig65 and returns Entry", async () => {
    const interaction = makeInteraction();
    const electrumSig65 = fakeElectrumSig65();
    const btcSignMessage = mountBitBoxSDK(interaction, {
      sig: new Uint8Array(64),
      recid: 0n,
      electrumSig65,
    });

    const entry = await interaction.run();

    expect(btcSignMessage).toHaveBeenCalledWith(
      "btc",
      { scriptConfig: { simpleType: "p2wpkh" }, keypath: PATH },
      new TextEncoder().encode("hello world"),
    );
    expect(entry).toEqual({
      bip32Path: PATH,
      pubkey: PUBKEY,
      signature: Buffer.from(electrumSig65).toString("base64"),
    });
  });

  it("throws MalformedResponse if electrumSig65 isn't 65 bytes", async () => {
    const interaction = makeInteraction();
    mountBitBoxSDK(interaction, {
      sig: new Uint8Array(64),
      recid: 0n,
      electrumSig65: new Uint8Array(32),
    });
    const err = await expectRunThrows(interaction);
    expect(err.kind).toBe("MalformedResponse");
  });

  it("wraps SDK 'user abort' as DeviceRejected", async () => {
    const interaction = makeInteraction();
    mountBitBoxSDK(interaction, new Error("user abort during signing"));
    const err = await expectRunThrows(interaction);
    expect(err.kind).toBe("DeviceRejected");
    expect(err.keystore).toBe("bitbox");
  });

  it("wraps unrelated SDK errors as TransportError", async () => {
    const interaction = makeInteraction();
    mountBitBoxSDK(interaction, new Error("device disconnected mid-flight"));
    const err = await expectRunThrows(interaction);
    expect(err.kind).toBe("TransportError");
  });

  it.each([
    [Network.MAINNET, "btc"],
    [Network.TESTNET, "tbtc"],
    [Network.REGTEST, "rbtc"],
  ])("uses correct coin code on %s", async (network, expectedCoin) => {
    const interaction = makeInteraction({ network });
    const btcSignMessage = mountBitBoxSDK(interaction, {
      sig: new Uint8Array(64),
      recid: 0n,
      electrumSig65: fakeElectrumSig65(),
    });
    await interaction.run();
    expect(btcSignMessage).toHaveBeenCalledWith(
      expectedCoin,
      expect.any(Object),
      expect.any(Uint8Array),
    );
  });
});
