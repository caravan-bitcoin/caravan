import { describe, it, expect } from "vitest";
import { scriptToOps, scriptToHex } from "../script";
import { TEST_FIXTURES } from "../fixtures";

describe("scripts", () => {
  describe("scriptToOps", () => {
    TEST_FIXTURES.multisigs.forEach((test) => {
      it(`returns the opcodes for a 2-of-2 ${test.network} ${test.type} address`, () => {
        if ("multisig" in test) {
          expect(scriptToOps(test.multisig as any)).toEqual(test.scriptOps);
          expect(scriptToOps(test.multisigScript as any)).toEqual(test.multisigScriptOps);
        } else {
          throw new Error("Test case does not contain a multisig");
        }
      });
    });
  });

  describe("scriptToHex", () => {
    TEST_FIXTURES.multisigs.forEach((test) => {
      it(`returns the hex for a 2-of-2 ${test.network} ${test.type} address`, () => {
        if ("multisig" in test) {
          expect(scriptToHex(test.multisig as any)).toEqual(test.scriptHex);
          expect(scriptToHex(test.multisigScript as any)).toEqual(test.multisigScriptHex);
        } else {
          throw new Error("Test case does not contain a multisig");
        }
      });
    });
  });
});
