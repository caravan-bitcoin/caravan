import { TEST_FIXTURES } from "./fixtures";
import { validateMultisigSignature } from "./signatures";

// FIXME: transactionbuilder is deprecating, but we know this. remove this after addressing.
console.warn = vi.fn();

describe("signatures", () => {
  describe("validateMultisigSignature", () => {
    it("throws an error on an invalid signature", () => {
      const fixture = TEST_FIXTURES.transactions[0];
      expect(() => {
        validateMultisigSignature(
          fixture.network,
          fixture.inputs,
          fixture.outputs,
          0,
          "",
        );
      }).toThrow(/is too short/i);
      expect(() => {
        validateMultisigSignature(
          fixture.network,
          fixture.inputs,
          fixture.outputs,
          0,
          "foobar",
        );
      }).toThrow(/is too short/i);
    });

    TEST_FIXTURES.transactions.forEach((fixture) => {
      describe(`validating signature for a transaction which ${fixture.description}`, () => {
        it("returns the public key corresponding to a valid input signature", () => {
          fixture.inputs.forEach((input, inputIndex) => {
            const publicKey = validateMultisigSignature(
              fixture.network,
              fixture.inputs,
              fixture.outputs,
              inputIndex,
              fixture.signature[inputIndex],
            );
            expect(publicKey).toEqual(fixture.publicKeys[inputIndex]);
          });
        });

        it("returns false for a valid signature for a different input", () => {
          const publicKey = validateMultisigSignature(
            fixture.network,
            fixture.inputs,
            fixture.outputs,
            0,
            fixture.signature[1],
          );
          expect(publicKey).toEqual(false);
        });
      });
    });
  });
});
