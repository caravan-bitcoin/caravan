/**
 * @jest-environment jsdom
 */

import {
  generateBip32DerivationByIndex,
  generateBraid,
  multisigAddressType,
  multisigBraidDetails,
  multisigRedeemScript,
  multisigWitnessScript,
  Network,
  P2SH,
  P2SH_P2WSH,
  P2WSH,
  TEST_FIXTURES,
} from "@caravan/bitcoin";
import {
  getUnsignedMultisigPsbtV0,
  idToHash,
  PsbtInput,
  PsbtOutput,
} from "./utils";
import BigNumber from "bignumber.js";
import {
  braidDetailsToWalletConfig,
  MultisigWalletConfig,
} from "@caravan/wallets";

// pulling functions from the old transactions/psbt file
// so we can work with the fixtures and their deeply
// nested objects
function psbtMultisigLock(multisig) {
  if (!multisig) {
    return {};
  }
  const multisigLock: any = {};

  // eslint-disable-next-line default-case
  switch (multisigAddressType(multisig)) {
    case P2SH:
      multisigLock.redeemScript = multisigRedeemScript(multisig).output;
      break;
    case P2WSH:
      multisigLock.witnessScript = multisigWitnessScript(multisig).output;
      break;
    case P2SH_P2WSH: // need both
      multisigLock.witnessScript = multisigWitnessScript(multisig).output;
      multisigLock.redeemScript = multisigRedeemScript(multisig).output;
      break;
  }
  return multisigLock;
}

function getBip32Derivation(multisig, index = 0) {
  if (!multisig) {
    return;
  }
  // Already have one, return it
  if (multisig.bip32Derivation) {
    return multisig.bip32Derivation;
  }
  // Otherwise generate it
  const config = JSON.parse(multisigBraidDetails(multisig));
  const braid = generateBraid(
    config.network,
    config.addressType,
    config.extendedPublicKeys,
    config.requiredSigners,
    config.index,
  );
  return generateBip32DerivationByIndex(braid, index);
}

describe("getUnsignedMultisigPsbtV0", () => {
  const argsFromFixture = (
    fixture: any,
  ): {
    network: Network;
    inputs: PsbtInput[];
    outputs: PsbtOutput[];
    multisigConfig: MultisigWalletConfig;
  } => {
    return {
      network: fixture.network as Network,
      inputs: fixture.inputs.map((input) => ({
        hash: idToHash(input.txid),
        index: input.index,
        transactionHex: input.transactionHex,
        bip32Derivation:
          input.multisig.bip32Derivation || getBip32Derivation(input.multisig),
        ...psbtMultisigLock(input.multisig),
      })),
      outputs: fixture.outputs.map((output) => ({
        address: output.address,
        value: new BigNumber(output.amountSats).toNumber(),
        bip32Derivation:
          output.bip32Derivation || getBip32Derivation(output.multisig),
        witnessScript: output.witnessScript,
        redeemScript: output.redeemScript,
      })),
      multisigConfig: braidDetailsToWalletConfig(
        JSON.parse(fixture.inputs[0].multisig.braidDetails),
      ),
    };
  };

  TEST_FIXTURES.transactions
    .map((fixture) => [argsFromFixture(fixture), fixture])
    .forEach(([args, fixture]) => {
      it(`can construct an unsigned multisig PSBT which ${fixture.description}`, () => {
        if (fixture.psbt) {
          const psbt = getUnsignedMultisigPsbtV0(args);
          expect(psbt.data.toBase64()).toEqual(fixture.psbt);
        }
      });
    });

  TEST_FIXTURES.transactions
    .map((fixture) => [argsFromFixture(fixture), fixture])
    .forEach(([args, fixture]) => {
      it(`can construct an unsigned multisig PSBT with global xpubs which ${fixture.description}`, () => {
        if (fixture.psbt) {
          const psbt = getUnsignedMultisigPsbtV0({
            ...args,
            includeGlobalXpubs: true,
          });
          expect(psbt.data.toBase64()).not.toEqual(fixture.psbt);
          expect(psbt.data.toBase64()).toEqual(fixture.psbtWithGlobalXpub);
        }
      });
    });
});
