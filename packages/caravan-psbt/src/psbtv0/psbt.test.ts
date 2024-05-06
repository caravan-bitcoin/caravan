/**
 * @jest-environment  jsdom
 */

import { TEST_FIXTURES } from "@caravan/bitcoin";
import { getUnsignedMultisigPsbtV0 } from "./psbt";

import { psbtArgsFromFixture } from "./utils";

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
    const fixture = TEST_FIXTURES.transactions[0];
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
