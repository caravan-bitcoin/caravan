/**
 * Pre-compute BIP-137 (and BIP-322 Simple, for round-trip coverage)
 * signatures from the open_source cosigner seed in
 * `TEST_FIXTURES.multisigs`, write to `test-fixtures/signatures.json`.
 *
 * Re-run with `npm run generate-fixtures` if TEST_FIXTURES changes.
 * The output JSON is committed so test runs don't re-sign each time.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { TEST_FIXTURES } from "@caravan/bitcoin";
import { HDKey } from "@scure/bip32";
import { mnemonicToSeedSync } from "@scure/bip39";
import { Signer as BIP322Signer, Address as BIP322Address } from "bip322-js";
import * as bitcoinMessage from "bitcoinjs-message";
import * as wif from "wif";

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
const MESSAGE = "caravan stage 4a fixture round-trip";

function deriveKeypair(path: string): { priv: Buffer; pub: Buffer } {
  const seed = mnemonicToSeedSync(BIP39_PHRASE);
  const node = HDKey.fromMasterSeed(seed).derive(path);
  if (!node.privateKey || !node.publicKey) {
    throw new Error(`missing key material at ${path}`);
  }
  return {
    priv: Buffer.from(node.privateKey),
    pub: Buffer.from(node.publicKey),
  };
}

const entries = FIXTURES.multisigs.map((fixture, idx) => {
  const { priv, pub } = deriveKeypair(fixture.bip32Path);
  const expectedPubkey = pub.toString("hex");
  const address = BIP322Address.convertPubKeyIntoAddress(pub, "p2wpkh").mainnet;
  const wifKey = wif.encode({
    version: 0x80,
    privateKey: priv,
    compressed: true,
  });

  const bip137 = bitcoinMessage
    .sign(MESSAGE, priv, true, { segwitType: "p2wpkh" })
    .toString("base64");
  const bip322 = BIP322Signer.sign(wifKey, address, MESSAGE);

  const unchainedPubkey = fixture.publicKeys.find((pk) => pk !== expectedPubkey);
  if (!unchainedPubkey) {
    throw new Error(`fixture ${idx} has no non-open_source pubkey`);
  }

  return {
    description: fixture.description,
    bip32Path: fixture.bip32Path,
    message: MESSAGE,
    expectedPubkey,
    unchainedPubkey,
    bip137,
    bip322,
  };
});

const outPath = join(__dirname, "..", "test-fixtures", "signatures.json");
writeFileSync(outPath, `${JSON.stringify(entries, null, 2)}\n`);
console.log(`Wrote ${entries.length} fixtures to ${outPath}`);
