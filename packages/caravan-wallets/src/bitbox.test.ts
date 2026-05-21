import { Network, TEST_FIXTURES } from "@caravan/bitcoin";
import { MessageSigningError } from "@caravan/messages";
import { describe, it, expect, vi } from "vitest";

import { BitBoxSignMessage } from "./bitbox";

const FIXTURE = TEST_FIXTURES.multisigs[0];
const PUBKEY = FIXTURE.publicKey;
const PATH = FIXTURE.bip32Path;
const MESSAGE = FIXTURE.signedMessages.message;
// Real BIP-137 sig (88-char base64) decoded to its 65-byte wire form,
// which is exactly what BitBox returns as `electrumSig65`.
const REAL_ELECTRUM_SIG65 = new Uint8Array(
  Buffer.from(FIXTURE.signedMessages.bip137, "base64"),
);
const REAL_SIG_BASE64 = FIXTURE.signedMessages.bip137;

function makeInteraction(opts: Partial<{
  network: Network;
  bip32Path: string;
  message: string;
}> = {}) {
  return new BitBoxSignMessage({
    network: opts.network ?? Network.MAINNET,
    bip32Path: opts.bip32Path ?? PATH,
    message: opts.message ?? MESSAGE,
    pubkey: PUBKEY,
  });
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
    const btcSignMessage = mountBitBoxSDK(interaction, {
      sig: new Uint8Array(64),
      recid: 0n,
      electrumSig65: REAL_ELECTRUM_SIG65,
    });

    const entry = await interaction.run();

    expect(btcSignMessage).toHaveBeenCalledWith(
      "btc",
      { scriptConfig: { simpleType: "p2wpkh" }, keypath: PATH },
      new TextEncoder().encode(MESSAGE),
    );
    expect(entry).toEqual({
      bip32Path: PATH,
      pubkey: PUBKEY,
      signature: REAL_SIG_BASE64,
    });
  });

  it("throws MalformedResponse if the device returns a signature that doesn't verify against pubkey", async () => {
    const interaction = makeInteraction();
    // valid 65-byte shape but non-verifying bytes
    const bogus = Uint8Array.from(
      Buffer.concat([Buffer.from([31]), Buffer.alloc(64, 0x11)]),
    );
    mountBitBoxSDK(interaction, {
      sig: new Uint8Array(64),
      recid: 0n,
      electrumSig65: bogus,
    });
    const err = await expectRunThrows(interaction);
    expect(err.kind).toBe("MalformedResponse");
    expect(err.keystore).toBe("bitbox");
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
      electrumSig65: REAL_ELECTRUM_SIG65,
    });
    await interaction.run();
    expect(btcSignMessage).toHaveBeenCalledWith(
      expectedCoin,
      expect.any(Object),
      expect.any(Uint8Array),
    );
  });
});
