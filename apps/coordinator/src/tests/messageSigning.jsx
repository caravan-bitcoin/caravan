import React from "react";
import { TEST_FIXTURES, deriveChildPublicKey } from "@caravan/bitcoin";
import { verifyMessageSignature } from "@caravan/messages";
import { SignMessage } from "@caravan/wallets";
import { Box, Table, TableBody, TableRow, TableCell } from "@mui/material";

import Test from "./Test";

const DEFAULT_MESSAGE = "caravan message-signing smoke test";

class MessageSigningTest extends Test {
  name() {
    return `Sign message — ${this.params.network} ${this.params.addressType} (open_source cosigner)`;
  }

  description() {
    return (
      <Box>
        <p>
          Sign a fixed UTF-8 message with the <strong>open_source</strong>{" "}
          cosigner&apos;s key (BIP-39 phrase from{" "}
          <code>TEST_FIXTURES.keys.open_source.bip39Phrase</code>). The
          coordinator passes the cosigner&apos;s expected pubkey; the keystore
          signs at the given BIP-32 path. The test verifies the returned
          signature cryptographically via the pubkey-aware verifier in{" "}
          <code>@caravan/wallets</code> (loose-mode BIP-137 / BIP-322 over the
          canonical P2WPKH address derived from the cosigner pubkey).
        </p>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Address type:</TableCell>
              <TableCell>
                <code>
                  {this.params.addressType} ({this.params.network})
                </code>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Message:</TableCell>
              <TableCell>
                <code>{this.params.message}</code>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>BIP-32 path:</TableCell>
              <TableCell>
                <code>{this.params.bip32Path}</code>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Expected pubkey:</TableCell>
              <TableCell>
                <code>{this.params.expectedPubkey}</code>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Protocol:</TableCell>
              <TableCell>BIP-137 (loose-mode verification)</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Box>
    );
  }

  interaction() {
    return SignMessage({
      keystore: this.params.keystore,
      network: this.params.network,
      bip32Path: this.params.bip32Path,
      message: this.params.message,
      expectedPubkey: this.params.expectedPubkey,
    });
  }

  // Cryptographic verification, not byte-equality. ECDSA signing is
  // non-deterministic at the wire level (BIP-322 Simple in particular
  // varies across invocations); two valid signatures of the same message
  // by the same key compare unequal byte-wise but both verify true.
  // eslint-disable-next-line class-methods-use-this
  matches(_expected, entry) {
    return verifyMessageSignature({
      message: this.params.message,
      signature: entry.signature,
      expectedPubkey: entry.expectedPubkey,
    });
  }

  expected() {
    // matches() ignores the expected value (it verifies the actual Entry
    // cryptographically). Returned here so the UI has something to render
    // alongside the actual response.
    return this.params.expectedPubkey;
  }
}

export function messageSigningTests(keystore) {
  return TEST_FIXTURES.multisigs.map((fixture) => {
    // braidDetails.extendedPublicKeys[0] is the open_source cosigner xpub
    // at the branch level (e.g. m/45'/1'/100'). Derive the open_source
    // pubkey at the address-level path (e.g. m/45'/1'/100'/0/0) by
    // stripping the branch prefix off fixture.bip32Path.
    const openSourceNode = fixture.braidDetails.extendedPublicKeys[0];
    const branchPath = openSourceNode.path;
    // Defensive: catch fixture drift at suite-construction time rather
    // than at on-device verification time. If the address-level path
    // doesn't sit under the branch path, the slice below would produce
    // a bogus relativePath and silently derive the wrong pubkey.
    if (!fixture.bip32Path.startsWith(`${branchPath}/`)) {
      throw new Error(
        `messageSigning fixture mismatch: bip32Path "${fixture.bip32Path}" is not under branchPath "${branchPath}"`,
      );
    }
    const relativePath = fixture.bip32Path.slice(branchPath.length + 1);
    const expectedPubkey = deriveChildPublicKey(
      openSourceNode.base58String,
      relativePath,
      fixture.network,
    );

    return new MessageSigningTest({
      keystore,
      network: fixture.network,
      addressType: fixture.type,
      bip32Path: fixture.bip32Path,
      message: DEFAULT_MESSAGE,
      expectedPubkey,
    });
  });
}

export default messageSigningTests;
