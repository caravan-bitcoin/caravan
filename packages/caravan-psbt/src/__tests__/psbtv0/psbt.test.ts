import {
  generateMultisigFromHex,
  P2WSH,
  ROOT_FINGERPRINT,
  TEST_FIXTURES,
} from "@caravan/bitcoin";
import {
  getUnsignedMultisigPsbtV0,
  validateMultisigPsbtSignature,
  translatePSBT,
} from "../../psbtv0/psbt";
import _ from "lodash";
import { psbtArgsFromFixture } from "../../psbtv0/utils";

import { describe, expect, it, test } from "vitest";

describe("getUnsignedMultisigPsbtV0", () => {
  TEST_FIXTURES.transactions
    .map((fixture) => [psbtArgsFromFixture(fixture), fixture])
    .forEach(([args, fixture]) => {
      it(`can construct an unsigned multisig PSBT which ${fixture.description}`, () => {
        if (fixture.psbt) {
          const psbt = getUnsignedMultisigPsbtV0(args);
          expect(psbt.data.toBase64()).toEqual(fixture.psbt);
        }
      });
    });

  TEST_FIXTURES.transactions
    .map((fixture) => [psbtArgsFromFixture(fixture), fixture])
    .forEach(([args, fixture]) => {
      it(`can construct an unsigned multisig PSBT with global xpubs which ${fixture.description}`, () => {
        if (fixture.psbt) {
          const psbt = getUnsignedMultisigPsbtV0({
            ...args,
            includeGlobalXpubs: true,
          });
          expect(psbt.data.toBase64()).not.toEqual(fixture.psbt);
          // Check that the global xpubs are the same
          expect(psbt.data.toBase64()).toEqual(fixture.psbtWithGlobalXpub);
        }
      });
    });

  test("it can handle a taproot output", () => {
    const taprootAddress =
      "tb1pqqqqp399et2xygdj5xreqhjjvcmzhxw4aywxecjdzew6hylgvsesf3hn0c";
    const fixture = _.cloneDeep(TEST_FIXTURES.transactions[0]);
    let outputIndex;
    for (const [index, output] of fixture.outputs.entries()) {
      if (!output.redeemScript) {
        outputIndex = index;
        break;
      }
    }
    fixture.outputs[outputIndex].address = taprootAddress;

    const psbt = getUnsignedMultisigPsbtV0(psbtArgsFromFixture(fixture));
    expect(psbt.txOutputs[outputIndex].address).toEqual(taprootAddress);
  });
});

describe("validateMultisigSignaturePsbt", () => {
  TEST_FIXTURES.transactions
    .map((fixture) => [psbtArgsFromFixture(fixture), fixture])
    .map(([args, fixture]) => [
      getUnsignedMultisigPsbtV0(args).toHex(),
      fixture,
    ])
    .forEach(([psbt, fixture]) => {
      describe(`validating signature for a transaction which ${fixture.description}`, () => {
        it("returns the public key corresponding to a valid input signature", () => {
          fixture.inputs.forEach((input, inputIndex) => {
            const pubkey = validateMultisigPsbtSignature(
              psbt,
              inputIndex,
              fixture.signature[inputIndex],
              input.amountSats,
            );

            expect(pubkey).toEqual(fixture.publicKeys[inputIndex]);
          });
        });

        it("returns false for a valid signature for a different input", () => {
          fixture.inputs.forEach((input) => {
            const pubkey = validateMultisigPsbtSignature(
              psbt,
              0,
              fixture.signature[1],
              input.amountSats,
            );
            expect(pubkey).toEqual(false);
          });
        });
      });
    });
});

describe("translatePsbt", () => {
  const MULTISIGS = TEST_FIXTURES.multisigs;
  const TRANSACTIONS = TEST_FIXTURES.transactions;

  const tx = _.cloneDeep(TEST_FIXTURES.transactions[0]);
  const ms = MULTISIGS[0];

  it("throws error with non-p2sh address type", () => {
    expect(() =>
      translatePSBT(
        tx.network,
        P2WSH,
        // @ts-expect-error - we are testing an error case
        {},
        {
          xfp: ROOT_FINGERPRINT,
          path: "m/45'/1'/100'",
        },
      ),
    ).toThrow(/Unsupported addressType/i);
  });

  it(`returns the inputs/outputs translated from the psbt`, () => {
    const result = translatePSBT(tx.network, tx.format, tx.psbt, {
      xfp: ROOT_FINGERPRINT,
      path: "m/45'/1'/100'",
    });
    if (result) {
      const { unchainedInputs, unchainedOutputs, bip32Derivations } = result;

      // We can't compare directly because our fixtures contain
      // additional information, so we will build our expected
      // returned values from other parts of the fixtures while
      // only sending in the psbt to the function we are testing.

      // FIXME - this is specific to P2SH
      const expectedInputs = tx.inputs.map((input) => ({
        amountSats: input.value,
        index: input.index,
        transactionHex: input.transactionHex,
        txid: input.txid,
        multisig: generateMultisigFromHex(
          tx.network,
          tx.format,
          ms.redeemScriptHex,
        ),
      }));
      expect(unchainedInputs).toEqual(expectedInputs);

      // Same as above, building expected object from a
      // different set of data in the fixtures while the
      // returned data is translated from the PSBT itself.
      const expectedOutputs = tx.outputs.map((output) => ({
        address: output.address,
        amountSats: output.value,
      }));

      expect(unchainedOutputs).toEqual(expectedOutputs);

      expect(bip32Derivations.map((b32d) => b32d.path)).toEqual(tx.bip32Paths);
    }
  });

  it("should return null with non-string PSBT input", () => {
    expect(
      translatePSBT(
        tx.network,
        tx.format,
        // @ts-expect-error - we are testing an error case
        {},
        {
          xfp: ROOT_FINGERPRINT,
          path: "m/45'/1'/100'",
        },
      ),
    ).toBeNull();
  });

  it("should throw on psbt missing details (include psbt for another tx)", () => {
    expect(() => {
      translatePSBT(tx.network, tx.format, TRANSACTIONS[1].psbt, {
        xfp: ROOT_FINGERPRINT,
        path: "m/45'/1'/100'",
      });
    }).toThrow(/signing key details not included/i);
  });

  it("should handle a taproot output", () => {
    const taprootAddress =
      "tb1pqqqqp399et2xygdj5xreqhjjvcmzhxw4aywxecjdzew6hylgvsesf3hn0c";
    const taprootTx = { ...tx };
    taprootTx.outputs[0].address = taprootAddress;

    const psbt = getUnsignedMultisigPsbtV0(psbtArgsFromFixture(taprootTx));

    const result = translatePSBT(
      taprootTx.network,
      taprootTx.format,
      psbt.toBase64(),
      {
        xfp: ROOT_FINGERPRINT,
        path: "m/45'/1'/100'",
      },
    );
    if (result) {
      const { unchainedOutputs } = result;
      let found = false;

      for (const output of unchainedOutputs) {
        if (output.address === taprootAddress) {
          found = true;
          break;
        }
      }
      expect(found).toBe(true);
    }
  });
});
