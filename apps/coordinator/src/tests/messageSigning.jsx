import React from "react";
import { TEST_FIXTURES, deriveChildPublicKey } from "@caravan/bitcoin";
import { verifyMessageSignature } from "@caravan/messages";
import { SignMessage } from "@caravan/wallets";
import { Box, Table, TableBody, TableRow, TableCell } from "@mui/material";

import Test from "./Test";

const DEFAULT_MESSAGE = "caravan message-signing smoke test";

class MessageSigningTest extends Test {
  name() {
    return `Sign ${this.params.network} ${this.params.type} message`;
  }

  description() {
    return (
      <Box>
        <p>
          Sign the message below with the <strong>open_source</strong>{" "}
          cosigner&apos;s key, then verify the signature against the expected
          pubkey.
        </p>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Address type:</TableCell>
              <TableCell>
                <code>
                  {this.params.type} ({this.params.network})
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
                <code>{this.params.pubkey}</code>
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
      pubkey: this.params.pubkey,
    });
  }

  // Verification is cryptographic, not byte-equality: pass the returned
  // SignMessageResult's (signature, pubkey, message) to the verifier and trust its
  // boolean. The expected-value passed into matches() is ignored.
  // eslint-disable-next-line class-methods-use-this
  matches(_expected, entry) {
    return verifyMessageSignature({
      message: this.params.message,
      signature: entry.signature,
      pubkey: entry.pubkey,
    });
  }

  // The base Test.runParse() unpacks Coldcard parse() output assuming
  // either an xpub-import shape ({rootFingerprint, ...}) or a signed-PSBT
  // shape ({pubkey: [sig, ...]}) — for the latter it sends Object.values()[0]
  // to the resolver. The SignMessageResult shape ({bip32Path, signature,
  // pubkey}) needs to reach matches() intact for cryptographic verification.
  async runParse(data) {
    try {
      const entry = await this.actual(data);
      return this.resolve(entry);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      return { status: Test.ERROR, message: e.message };
    }
  }

  expected() {
    // matches() ignores the expected value (it verifies the actual SignMessageResult
    // cryptographically). Returned here so the UI has something to render
    // alongside the actual response.
    return this.params.pubkey;
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
    const pubkey = deriveChildPublicKey(
      openSourceNode.base58String,
      relativePath,
      fixture.network,
    );

    return new MessageSigningTest({
      keystore,
      network: fixture.network,
      type: fixture.type,
      bip32Path: fixture.bip32Path,
      message: DEFAULT_MESSAGE,
      pubkey,
    });
  });
}

export default messageSigningTests;
