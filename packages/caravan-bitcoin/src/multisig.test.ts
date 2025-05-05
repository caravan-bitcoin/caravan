import { braidConfig } from "./braid";
import { TEST_FIXTURES } from "./fixtures";
import {
  generateMultisigFromHex,
  generateMultisigFromPublicKeys,
  multisigAddressType,
  multisigRequiredSigners,
  multisigTotalSigners,
  multisigScript,
  multisigRedeemScript,
  multisigWitnessScript,
  multisigPublicKeys,
  multisigAddress,
  multisigBraidDetails,
} from "./multisig";
import { P2SH } from "./p2sh";
import { P2WSH } from "./p2wsh";
import { scriptToHex } from "./script";

const MULTISIGS = TEST_FIXTURES.multisigs;

describe("multisig", () => {
  describe("generateMultisigFromPublicKeys", () => {
    const badone = { ...MULTISIGS[0] };
    badone.type = "foo";
    const badMultisig = generateMultisigFromPublicKeys(
      badone.network,
      badone.type,
      2,
      ...badone.publicKeys
    );
    expect(badMultisig).toBe(null);

    MULTISIGS.forEach((test) => {
      it(`can generate an ${test.network} 2-of-2 ${test.type} address from public keys`, () => {
        const multisig = generateMultisigFromPublicKeys(
          test.network,
          test.type,
          2,
          ...test.publicKeys
        );
        expect(multisigAddressType(multisig)).toEqual(test.type);
        expect(multisigRequiredSigners(multisig)).toEqual(2);
        expect(multisigTotalSigners(multisig)).toEqual(2);
        expect(multisigPublicKeys(multisig)).toEqual(test.publicKeys);
        expect(scriptToHex(multisigScript(multisig))).toEqual(
          test.type === P2SH ? test.redeemScriptHex : test.witnessScriptHex
        );
      });
    });
  });

  describe("generateMultisigFromHex", () => {
    MULTISIGS.forEach((test) => {
      it(`can generate an ${test.network} 2-of-2 ${test.type} address from public keys`, () => {
        const multisig = generateMultisigFromHex(
          test.network,
          test.type,
          test.type === P2SH ? test.redeemScriptHex : test.witnessScriptHex
        );
        expect(multisigAddressType(multisig)).toEqual(test.type);
        expect(multisigRequiredSigners(multisig)).toEqual(2);
        expect(multisigTotalSigners(multisig)).toEqual(2);
        expect(multisigPublicKeys(multisig)).toEqual(test.publicKeys);
        expect(scriptToHex(multisigScript(multisig))).toEqual(
          test.multisigScriptHex
        );
      });
    });
  });

  describe("multisigAddressType", () => {
    MULTISIGS.forEach((test) => {
      it(`returns the address type for a ${test.network} 2-of-2 ${test.type} address`, () => {
        expect(multisigAddressType(test.braidAwareMultisig)).toEqual(test.type);
      });
    });
  });

  describe("multisigRequiredSigners", () => {
    MULTISIGS.forEach((test) => {
      it(`returns 2 for a ${test.network} 2-of-2 ${test.type} address`, () => {
        expect(multisigRequiredSigners(test.braidAwareMultisig)).toEqual(2);
      });
    });
  });

  describe("multisigTotalSigners", () => {
    MULTISIGS.forEach((test) => {
      it(`returns 2 for a ${test.network} 2-of-2 ${test.type} address`, () => {
        expect(multisigTotalSigners(test.braidAwareMultisig)).toEqual(2);
      });
    });
  });

  describe("multisigScript", () => {
    MULTISIGS.forEach((test) => {
      it(`returns the multisig script for a ${test.network} 2-of-2 ${test.type} address`, () => {
        expect(scriptToHex(multisigScript(test.braidAwareMultisig))).toEqual(
          test.multisigScriptHex
        );
      });
    });
  });

  describe("multisigRedeemScript", () => {
    MULTISIGS.forEach((test) => {
      if (test.type === P2WSH) {
        it(`returns null for a ${test.network} 2-of-2 ${test.type} address`, () => {
          expect(multisigRedeemScript(test.braidAwareMultisig)).toBeNull();
        });
      } else {
        it(`returns the redeem script for a ${test.network} 2-of-2 ${test.type} address`, () => {
          expect(
            scriptToHex(multisigRedeemScript(test.braidAwareMultisig))
          ).toEqual(test.redeemScriptHex);
        });
      }
    });
  });

  describe("multisigWitnessScript", () => {
    MULTISIGS.forEach((test) => {
      if (test.type === P2SH) {
        it(`returns null for a ${test.network} 2-of-2 ${test.type} address`, () => {
          expect(multisigWitnessScript(test.braidAwareMultisig)).toBeNull();
        });
      } else {
        it(`returns the witness script for a ${test.network} 2-of-2 ${test.type} address`, () => {
          expect(
            scriptToHex(multisigWitnessScript(test.braidAwareMultisig))
          ).toEqual(test.witnessScriptHex);
        });
      }
    });
  });

  describe("multisigPublicKeys", () => {
    MULTISIGS.forEach((test) => {
      it(`returns the public keys for a ${test.network} 2-of-2 ${test.type} address`, () => {
        expect(multisigPublicKeys(test.braidAwareMultisig)).toEqual(
          test.publicKeys
        );
      });
    });
  });

  describe("multisigAddress", () => {
    MULTISIGS.forEach((test) => {
      it(`returns the address for a ${test.network} 2-of-2 ${test.type} address`, () => {
        expect(multisigAddress(test.braidAwareMultisig)).toEqual(test.address);
      });
    });
  });

  describe("multisigBraidDetails", () => {
    it(`fails to return the braidDetails for a braid-unaware multisig`, () => {
      const badone = JSON.parse(JSON.stringify(MULTISIGS[0])).multisig;
      badone.braidDetails = null;
      expect(multisigBraidDetails(badone)).toBe(null);
    });
    MULTISIGS.forEach((test) => {
      it(`returns the braidDetails for a ${test.network} 2-of-2 ${test.type} address`, () => {
        expect(multisigBraidDetails(test.braidAwareMultisig)).toBe(
          braidConfig(test.braidDetails)
        );
      });
    });
  });
});
