import React from "react";
import { Network, TEST_FIXTURES } from "@caravan/bitcoin";
import {
  LEDGER,
  TREZOR,
  COLDCARD,
  ExportExtendedPublicKey,
  HERMIT,
  BCUR2,
} from "@caravan/wallets";
import Test from "./Test";

class ExportExtendedPublicKeyTest extends Test {
  // eslint-disable-next-line class-methods-use-this
  postprocess(result) {
    let tempResult = result;
    if (this.params.keystore === HERMIT) {
      tempResult = this.interaction().parse(result);
    }

    // The "tempResult" from BCUR2 contains an extra field "type" that we don't want to return.
    if (
      tempResult.type === "crypto-account" ||
      tempResult.type === "crypto-hdkey"
    ) {
      return {
        bip32Path: tempResult.bip32Path,
        rootFingerprint: tempResult.rootFingerprint?.toLowerCase(),
        xpub: tempResult.xpub,
      };
    }
    return tempResult.pubkey ? tempResult.pubkey : tempResult;
  }

  name() {
    return `Export ${this.params.network} xpub at ${this.params.bip32Path}`;
  }

  description() {
    return (
      <p>
        Export an extended public key at BIP32 path{" "}
        <code>{this.params.bip32Path}</code>
      </p>
    );
  }

  interaction() {
    return ExportExtendedPublicKey({
      keystore: this.params.keystore,
      network: this.params.network,
      bip32Path: this.params.bip32Path,
      includeXFP: true,
    });
  }

  expected() {
    const { xpub, tpub, rootFingerprint } =
      TEST_FIXTURES.keys.open_source.nodes[this.params.bip32Path];

    if (this.params.keystore === HERMIT || this.params.keystore === BCUR2) {
      return {
        xpub: tpub || xpub,
        rootFingerprint,
        bip32Path: this.params.bip32Path,
      };
    }
    if (
      this.params.network === Network.MAINNET ||
      this.params.keystore === TREZOR
    )
      return { xpub: xpub || tpub, rootFingerprint };
    if (this.params.keystore === LEDGER || this.params.keystore === COLDCARD)
      return { xpub: tpub || xpub, rootFingerprint };
    return { xpub: xpub || tpub, rootFingerprint };
  }
}

const extendedPublicKeyTests = (keystore) => {
  switch (keystore) {
    case BCUR2:
      return [
        new ExportExtendedPublicKeyTest({
          keystore,
          network: Network.TESTNET,
          bip32Path: "m/45'/1'/0'",
        }),
        new ExportExtendedPublicKeyTest({
          keystore,
          network: Network.TESTNET,
          bip32Path: "m/45'/1/0",
        }),
        new ExportExtendedPublicKeyTest({
          keystore,
          network: Network.TESTNET,
          bip32Path: "m/45'/1'/0'/0/0",
        }),
        new ExportExtendedPublicKeyTest({
          keystore,
          network: Network.TESTNET,
          bip32Path: "m/48'/1'/0'/2'/0/0",
        }),
        new ExportExtendedPublicKeyTest({
          keystore,
          network: Network.MAINNET,
          bip32Path: "m/45'/0/0",
        }),
        new ExportExtendedPublicKeyTest({
          keystore,
          network: Network.MAINNET,
          bip32Path: "m/45'/0'/0'/0",
        }),
        new ExportExtendedPublicKeyTest({
          keystore,
          network: Network.MAINNET,
          bip32Path: "m/45'/0'/0'/0/0",
        }),
        new ExportExtendedPublicKeyTest({
          keystore,
          network: Network.MAINNET,
          bip32Path: "m/45'/0'/4'/99'/2147483647/3/1",
        }),
      ];
    case COLDCARD:
      return [
        new ExportExtendedPublicKeyTest({
          keystore,
          network: Network.TESTNET,
          bip32Path: "m/45'/1/0",
        }),
        new ExportExtendedPublicKeyTest({
          keystore,
          network: Network.MAINNET,
          bip32Path: "m/45'/0/0",
        }),
      ];
    case LEDGER:
      return [
        new ExportExtendedPublicKeyTest({
          keystore,
          network: Network.TESTNET,
          bip32Path: "m/45'/1'/0'",
        }),
        new ExportExtendedPublicKeyTest({
          keystore,
          network: Network.TESTNET,
          bip32Path: "m/45'/1/0",
        }),
        new ExportExtendedPublicKeyTest({
          keystore,
          network: Network.TESTNET,
          bip32Path: "m/45'/1'/0'/0/0",
        }),
        new ExportExtendedPublicKeyTest({
          keystore,
          network: Network.TESTNET,
          bip32Path: "m/48'/1'/0'/2'/0/0",
        }),
        new ExportExtendedPublicKeyTest({
          keystore,
          network: Network.MAINNET,
          bip32Path: "m/45'/0'/0'",
        }),
        new ExportExtendedPublicKeyTest({
          keystore,
          network: Network.MAINNET,
          bip32Path: "m/45'/0'/0'/0",
        }),
        new ExportExtendedPublicKeyTest({
          keystore,
          network: Network.MAINNET,
          bip32Path: "m/45'/0'/0'/0/0",
        }),
        new ExportExtendedPublicKeyTest({
          keystore,
          network: Network.MAINNET,
          bip32Path: "m/45'/0'/4'/99'/2147483647/3/1",
        }),
      ];
    case TREZOR:
      return [
        new ExportExtendedPublicKeyTest({
          keystore,
          network: Network.TESTNET,
          bip32Path: "m/45'/1'/0'",
        }),
        new ExportExtendedPublicKeyTest({
          keystore,
          network: Network.TESTNET,
          bip32Path: "m/45'/1'/0'/0/0",
        }),
        new ExportExtendedPublicKeyTest({
          keystore,
          network: Network.TESTNET,
          bip32Path: "m/45'/1'/4'/99'/2147483647/3/1",
        }),
        new ExportExtendedPublicKeyTest({
          keystore,
          network: Network.MAINNET,
          bip32Path: "m/45'/0'/0'",
        }),
        new ExportExtendedPublicKeyTest({
          keystore,
          network: Network.MAINNET,
          bip32Path: "m/45'/0'/0'/0",
        }),
        new ExportExtendedPublicKeyTest({
          keystore,
          network: Network.MAINNET,
          bip32Path: "m/45'/0'/0'/0/0",
        }),
        new ExportExtendedPublicKeyTest({
          keystore,
          network: Network.MAINNET,
          bip32Path: "m/45'/0'/4'/99'/2147483647/3/1",
        }),
      ];
    default:
      return [
        new ExportExtendedPublicKeyTest({
          keystore,
          network: Network.TESTNET,
          bip32Path: "m/45'/1'/0'",
        }),
        new ExportExtendedPublicKeyTest({
          keystore,
          network: Network.TESTNET,
          bip32Path: "m/45'/1'/0'/0",
        }),
        new ExportExtendedPublicKeyTest({
          keystore,
          network: Network.TESTNET,
          bip32Path: "m/45'/1'/0'/0/0",
        }),
        new ExportExtendedPublicKeyTest({
          keystore,
          network: Network.TESTNET,
          bip32Path: "m/45'/1'/4'/99'/2147483647/3/1",
        }),
        new ExportExtendedPublicKeyTest({
          keystore,
          network: Network.MAINNET,
          bip32Path: "m/45'/0'/0'",
        }),
        new ExportExtendedPublicKeyTest({
          keystore,
          network: Network.MAINNET,
          bip32Path: "m/45'/0'/0'/0",
        }),
        new ExportExtendedPublicKeyTest({
          keystore,
          network: Network.MAINNET,
          bip32Path: "m/45'/0'/0'/0/0",
        }),
        new ExportExtendedPublicKeyTest({
          keystore,
          network: Network.MAINNET,
          bip32Path: "m/45'/0'/4'/99'/2147483647/3/1",
        }),
      ];
  }
};

export default extendedPublicKeyTests;
