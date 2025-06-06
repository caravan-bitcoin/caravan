import { TEST_FIXTURES } from "./fixtures";
import { scriptToOps, scriptToHex } from "./script";

describe("scripts", () => {
  describe("scriptToOps", () => {
    TEST_FIXTURES.multisigs.forEach((test) => {
      it(`returns the opcodes for a 2-of-2 ${test.network} ${test.type} address`, () => {
        if ("multisig" in test) {
          expect(scriptToOps(test.multisig)).toEqual(test.scriptOps);
          expect(scriptToOps(test.multisigScript)).toEqual(
            test.multisigScriptOps,
          );
        } else {
          throw Error("does not contain a multisig");
        }
      });
    });
  });

  describe("scriptToHex", () => {
    TEST_FIXTURES.multisigs.forEach((test) => {
      it(`returns the hex for a 2-of-2 ${test.network} ${test.type} address`, () => {
        if ("multisig" in test) {
          expect(scriptToHex(test.multisig)).toEqual(test.scriptHex);
          expect(scriptToHex(test.multisigScript)).toEqual(
            test.multisigScriptHex,
          );
        } else {
          throw Error("does not contain a multisig");
        }
      });
    });
  });
});
