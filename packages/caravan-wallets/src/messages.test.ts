import { TEST_FIXTURES } from "@caravan/bitcoin";
import { HDKey } from "@scure/bip32";
import { mnemonicToSeedSync } from "@scure/bip39";
import { Signer as BIP322Signer, Address as BIP322Address } from "bip322-js";
import * as bitcoinMessage from "bitcoinjs-message";
import * as wif from "wif";

import {
  Entry,
  MAX_MESSAGE_BYTES,
  MessageSigningError,
  validateMessage,
  verifyMessageSignature,
} from "./messages";

type MultisigFixture = {
  description: string;
  bip32Path: string;
  publicKeys: string[];
};

const FIXTURES = TEST_FIXTURES as unknown as {
  keys: { open_source: { bip39Phrase: string[] } };
  multisigs: MultisigFixture[];
};

const BIP39_PHRASE = FIXTURES.keys.open_source.bip39Phrase.join(" ");
const NUL = String.fromCharCode(0);

function deriveKeypair(path: string): { priv: Buffer; pub: Buffer } {
  const seed = mnemonicToSeedSync(BIP39_PHRASE);
  const node = HDKey.fromMasterSeed(seed).derive(path);
  if (!node.privateKey || !node.publicKey) {
    throw new Error(`HDKey at ${path} missing private/public key material`);
  }
  return {
    priv: Buffer.from(node.privateKey),
    pub: Buffer.from(node.publicKey),
  };
}

function p2wpkhAddress(pub: Buffer): string {
  return BIP322Address.convertPubKeyIntoAddress(pub, "p2wpkh").mainnet;
}

function signBIP322(priv: Buffer, pub: Buffer, message: string): string {
  const wifKey = wif.encode({
    version: 0x80,
    privateKey: priv,
    compressed: true,
  });
  return BIP322Signer.sign(wifKey, p2wpkhAddress(pub), message);
}

function signBIP137(priv: Buffer, message: string): string {
  const sigBuf = bitcoinMessage.sign(message, priv, true, {
    segwitType: "p2wpkh",
  });
  return sigBuf.toString("base64");
}

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
    expect(() =>
      validateMessage(`Hello${NUL}World`, "TEST"),
    ).toThrowError(MessageSigningError);
  });

  it("MalformedRequest errors carry the keystore label", () => {
    try {
      validateMessage("a".repeat(MAX_MESSAGE_BYTES + 1), "JADE");
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(MessageSigningError);
      const e = err as MessageSigningError;
      expect(e.kind).toBe("MalformedRequest");
      expect(e.keystore).toBe("JADE");
      expect(typeof e.userMessage).toBe("string");
    }
  });
});

describe("verifyMessageSignature", () => {
  const PATH = "m/45'/0'/0'/0/0";
  const MESSAGE = "caravan stage 4a message-signing primitive smoke";

  it("returns true for a BIP-322 Simple signature round-tripped via bip322-js", () => {
    const { priv, pub } = deriveKeypair(PATH);
    const entry: Entry = {
      bip32Path: PATH,
      signature: signBIP322(priv, pub, MESSAGE),
      expectedPubkey: pub.toString("hex"),
    };
    expect(verifyMessageSignature({ message: MESSAGE, entry })).toBe(true);
  });

  it("returns true for a BIP-137 signature in loose mode", () => {
    const { priv, pub } = deriveKeypair(PATH);
    const entry: Entry = {
      bip32Path: PATH,
      signature: signBIP137(priv, MESSAGE),
      expectedPubkey: pub.toString("hex"),
    };
    expect(verifyMessageSignature({ message: MESSAGE, entry })).toBe(true);
  });

  it("returns false for a tampered signature", () => {
    const { priv, pub } = deriveKeypair(PATH);
    const sig = signBIP322(priv, pub, MESSAGE);
    const sigBuf = Buffer.from(sig, "base64");
    const mid = Math.floor(sigBuf.length / 2);
    sigBuf[mid] = 255 - sigBuf[mid];
    const entry: Entry = {
      bip32Path: PATH,
      signature: sigBuf.toString("base64"),
      expectedPubkey: pub.toString("hex"),
    };
    expect(verifyMessageSignature({ message: MESSAGE, entry })).toBe(false);
  });

  it("returns false when expectedPubkey is wrong (sibling path)", () => {
    const { priv, pub } = deriveKeypair(PATH);
    const wrong = deriveKeypair("m/45'/0'/0'/0/1");
    const entry: Entry = {
      bip32Path: PATH,
      signature: signBIP322(priv, pub, MESSAGE),
      expectedPubkey: wrong.pub.toString("hex"),
    };
    expect(verifyMessageSignature({ message: MESSAGE, entry })).toBe(false);
  });

  it("returns false when message differs from what was signed", () => {
    const { priv, pub } = deriveKeypair(PATH);
    const entry: Entry = {
      bip32Path: PATH,
      signature: signBIP322(priv, pub, MESSAGE),
      expectedPubkey: pub.toString("hex"),
    };
    expect(
      verifyMessageSignature({ message: "different message", entry }),
    ).toBe(false);
  });

  it("returns false for non-hex expectedPubkey", () => {
    const entry: Entry = {
      bip32Path: PATH,
      signature: "ignored",
      expectedPubkey: "not-hex",
    };
    expect(verifyMessageSignature({ message: MESSAGE, entry })).toBe(false);
  });

  it("returns false for short (non-33-byte) pubkey", () => {
    const entry: Entry = {
      bip32Path: PATH,
      signature: "ignored",
      expectedPubkey: "0123abcd",
    };
    expect(verifyMessageSignature({ message: MESSAGE, entry })).toBe(false);
  });

  it("returns false for garbage signature input", () => {
    const { pub } = deriveKeypair(PATH);
    const entry: Entry = {
      bip32Path: PATH,
      signature: "not-base64-at-all-!!!",
      expectedPubkey: pub.toString("hex"),
    };
    expect(verifyMessageSignature({ message: MESSAGE, entry })).toBe(false);
  });
});

// TEST_FIXTURES.multisigs covers six multisig configurations (P2SH / P2SH-P2WSH
// / P2WSH × testnet/mainnet). For each, sign with the open_source cosigner's
// privkey at the fixture's address path and verify against that cosigner's
// pubkey. The "wrong-pubkey" negative uses the other cosigner's pubkey from
// publicKeys[]; that's the unchained cosigner, whose seed is NOT in fixtures.
describe("verifyMessageSignature across TEST_FIXTURES.multisigs (open_source)", () => {
  const MESSAGE = "fixture round-trip";

  FIXTURES.multisigs.forEach((fixture, idx) => {
    const label = `[${idx}] ${fixture.description}`;

    it(`${label} — BIP-322 round-trip verifies`, () => {
      const { priv, pub } = deriveKeypair(fixture.bip32Path);
      const entry: Entry = {
        bip32Path: fixture.bip32Path,
        signature: signBIP322(priv, pub, MESSAGE),
        expectedPubkey: pub.toString("hex"),
      };
      expect(verifyMessageSignature({ message: MESSAGE, entry })).toBe(true);
    });

    it(`${label} — BIP-137 round-trip verifies`, () => {
      const { priv, pub } = deriveKeypair(fixture.bip32Path);
      const entry: Entry = {
        bip32Path: fixture.bip32Path,
        signature: signBIP137(priv, MESSAGE),
        expectedPubkey: pub.toString("hex"),
      };
      expect(verifyMessageSignature({ message: MESSAGE, entry })).toBe(true);
    });

    it(`${label} — sign with open_source but claim unchained pubkey → false`, () => {
      const { priv, pub } = deriveKeypair(fixture.bip32Path);
      const openSourceHex = pub.toString("hex");
      const unchainedHex = fixture.publicKeys.find(
        (pk) => pk !== openSourceHex,
      );
      expect(unchainedHex).toBeDefined();
      const entry: Entry = {
        bip32Path: fixture.bip32Path,
        signature: signBIP322(priv, pub, MESSAGE),
        expectedPubkey: unchainedHex as string,
      };
      expect(verifyMessageSignature({ message: MESSAGE, entry })).toBe(false);
    });
  });
});
