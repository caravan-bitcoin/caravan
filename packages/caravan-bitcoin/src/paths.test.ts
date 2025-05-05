import { Network } from "./networks";
import { P2SH } from "./p2sh";
import { P2SH_P2WSH } from "./p2sh_p2wsh";
import { P2WSH } from "./p2wsh";
import {
  hardenedBIP32Index,
  bip32PathToSequence,
  bip32SequenceToPath,
  validateBIP32Path,
  validateBIP32Index,
  multisigBIP32Root,
  multisigBIP32Path,
  getParentBIP32Path,
  getRelativeBIP32Path,
} from "./paths";

describe("paths", () => {
  describe("hardenedBIP32Index", () => {
    it("returns the hardened version of the given index", () => {
      expect(hardenedBIP32Index("0")).toEqual(2147483648);
      expect(hardenedBIP32Index("44")).toEqual(2147483692);
    });
  });

  describe("bip32PathToSequence", () => {
    it("converts a path to a sequence, including hardening", () => {
      expect(bip32PathToSequence("m/45'/1/99")).toEqual([2147483693, 1, 99]);
    });

    it("assumes the path includes the prefix 'm/'", () => {
      expect(bip32PathToSequence("45'/1/99")).toEqual([1, 99]);
    });

    it("returns an empty sequence on empty input", () => {
      expect(bip32PathToSequence("")).toEqual([]);
      expect(bip32PathToSequence("m")).toEqual([]);
    });
  });

  describe("bip32SequenceToPath", () => {
    it("converts a sequence to a path, including hardening", () => {
      expect(bip32SequenceToPath([2147483693, 1, 99])).toBe("m/45'/1/99");
    });

    it("returns an empty path on empty input", () => {
      expect(bip32SequenceToPath([])).toBe("m/");
    });
  });

  describe("validateBIP32Path", () => {
    it("returns an error message on invalid paths", () => {
      expect(validateBIP32Path("")).toMatch(/cannot be blank/i);
      expect(validateBIP32Path("foo")).toMatch(/is invalid/i);
      expect(validateBIP32Path("/45")).toMatch(/is invalid/i);
      expect(validateBIP32Path("m//45")).toMatch(/is invalid/i);
      expect(validateBIP32Path("m/45''")).toMatch(/is invalid/i);
      expect(validateBIP32Path("m/-45")).toMatch(/is invalid/i);
      expect(validateBIP32Path("m/4.5")).toMatch(/is invalid/i);
      expect(validateBIP32Path("m/4f")).toMatch(/is invalid/i);
    });

    it("returns an error message when a derivation index is too high", () => {
      expect(validateBIP32Path("m/4294967296")).toMatch(/index is too high/i);
      expect(validateBIP32Path("m/45'/2147483648'/0")).toMatch(
        /index is too high/i
      );
    });

    it("returns an empty string on valid paths", () => {
      expect(validateBIP32Path("m/45")).toEqual("");
      expect(validateBIP32Path("m/45'")).toEqual("");
      expect(validateBIP32Path("m/45/0")).toEqual("");
      expect(validateBIP32Path("m/44'/0'")).toEqual("");
      expect(validateBIP32Path("m/45'/0'/0'/0/0")).toEqual("");
      expect(validateBIP32Path("m/448/1'/1'/23/45638")).toEqual("");
    });

    it("enforces mode=hardened if asked", () => {
      expect(validateBIP32Path("m/45'/0")).toEqual("");
      expect(validateBIP32Path("m/45'/0'", { mode: "hardened" })).toEqual("");
      expect(validateBIP32Path("m/45'/0", { mode: "hardened" })).toMatch(
        /fully-hardened/i
      );
      expect(validateBIP32Path("m/45'/0'", { mode: "hardened" })).toEqual("");
    });

    it("enforces mode=unhardened if asked", () => {
      expect(validateBIP32Path("m/45'/0")).toEqual("");
      expect(validateBIP32Path("m/45/0", { mode: "unhardened" })).toEqual("");
      expect(validateBIP32Path("m/45'/0", { mode: "unhardened" })).toMatch(
        /cannot include hardened/i
      );
    });
  });

  describe("validateBIP32Index", () => {
    it("returns an error message on invalid indices", () => {
      expect(validateBIP32Index("")).toMatch(/cannot be blank/i);
      expect(validateBIP32Index("foo")).toMatch(/is invalid/i);
      expect(validateBIP32Index("/45")).toMatch(/is invalid/i);
      expect(validateBIP32Index("m//45")).toMatch(/is invalid/i);
      expect(validateBIP32Index("m/45''")).toMatch(/is invalid/i);
      expect(validateBIP32Index("m/-45")).toMatch(/is invalid/i);
      expect(validateBIP32Index("m/4.5")).toMatch(/is invalid/i);
      expect(validateBIP32Index("m/4f")).toMatch(/is invalid/i);
      expect(validateBIP32Index("m/45/0")).toMatch(/is invalid/i);
      expect(validateBIP32Index("m/44'/0'")).toMatch(/is invalid/i);
      expect(validateBIP32Index("-45")).toMatch(/is invalid/i);
      expect(validateBIP32Index("-0")).toMatch(/is invalid/i);
    });

    it("returns an error message when the index is too high", () => {
      expect(
        validateBIP32Index("85899345929999999999999999999999999999")
      ).toMatch(/Invalid BIP32 index/i);
      expect(validateBIP32Index("4294967296")).toMatch(/index is too high/i);
      expect(validateBIP32Index("2147483648'")).toMatch(/index is too high/i);
    });

    it("returns an empty string on valid paths", () => {
      expect(validateBIP32Index("45")).toEqual("");
      expect(validateBIP32Index("45'")).toEqual("");
      expect(validateBIP32Index("0")).toEqual("");
      expect(validateBIP32Index("0'")).toEqual("");
      expect(validateBIP32Index("4294967295")).toEqual("");
      expect(validateBIP32Index("2147483647")).toEqual("");
      expect(validateBIP32Index("2147483647'")).toEqual("");
    });

    it("enforces mode=hardened if asked", () => {
      expect(validateBIP32Index("45'")).toEqual("");
      expect(validateBIP32Index("45")).toEqual("");
      expect(validateBIP32Index("45'", { mode: "hardened" })).toEqual("");

      expect(validateBIP32Index("2147483648", { mode: "hardened" })).toEqual(
        ""
      );
      expect(validateBIP32Index("45", { mode: "hardened" })).toMatch(
        /must be hardened/i
      );
    });

    it("enforces mode=unhardened if asked", () => {
      expect(validateBIP32Index("45'")).toEqual("");
      expect(validateBIP32Index("45")).toEqual("");
      expect(validateBIP32Index("45", { mode: "unhardened" })).toEqual("");
      expect(validateBIP32Index("45'", { mode: "unhardened" })).toMatch(
        /cannot be hardened/i
      );
      expect(validateBIP32Index("2147483648", { mode: "unhardened" })).toMatch(
        /cannot be hardened/i
      );
    });
  });

  describe("multisigBIP32Root", () => {
    it("returns the correct root BIP32 path for each combination of address type and network", () => {
      expect(multisigBIP32Root(P2SH, Network.MAINNET)).toEqual("m/45'/0'/0'");
      expect(multisigBIP32Root(P2SH, Network.TESTNET)).toEqual("m/45'/1'/0'");
      expect(multisigBIP32Root(P2SH_P2WSH, Network.MAINNET)).toEqual(
        "m/48'/0'/0'/1'"
      );
      expect(multisigBIP32Root(P2SH_P2WSH, Network.TESTNET)).toEqual(
        "m/48'/1'/0'/1'"
      );
      expect(multisigBIP32Root(P2WSH, Network.MAINNET)).toEqual(
        "m/48'/0'/0'/2'"
      );
      expect(multisigBIP32Root(P2WSH, Network.TESTNET)).toEqual(
        "m/48'/1'/0'/2'"
      );
    });

    it("defaults to testnet for invalid networks", () => {
      expect(multisigBIP32Root(P2SH, "foobar")).toEqual("m/45'/1'/0'");
      expect(multisigBIP32Root(P2SH_P2WSH, "foobar")).toEqual("m/48'/1'/0'/1'");
      expect(multisigBIP32Root(P2WSH, "foobar")).toEqual("m/48'/1'/0'/2'");
    });

    it("returns null for invalid address types", () => {
      expect(multisigBIP32Root("foobar", Network.MAINNET)).toBeNull();
      expect(multisigBIP32Root("foobar", Network.TESTNET)).toBeNull();
    });
  });

  describe("multisigBIP32Path", () => {
    it("fails with invalid path", () => {
      expect(multisigBIP32Path("foo", Network.MAINNET, "1")).toBe(null);
    });

    it("returns a BIP32 path with the correct root for each combination of address type, network, and relative path", () => {
      expect(multisigBIP32Path(P2SH, Network.MAINNET, "1")).toEqual(
        "m/45'/0'/0'/1"
      );
      expect(multisigBIP32Path(P2SH, Network.TESTNET, "1'/2'")).toEqual(
        "m/45'/1'/0'/1'/2'"
      );
      expect(multisigBIP32Path(P2SH_P2WSH, Network.MAINNET, "0")).toEqual(
        "m/48'/0'/0'/1'/0"
      );
      expect(multisigBIP32Path(P2WSH, Network.TESTNET, "3")).toEqual(
        "m/48'/1'/0'/2'/3"
      );
    });

    it("defaults to the relative path 0", () => {
      expect(multisigBIP32Path(P2SH, Network.MAINNET)).toEqual("m/45'/0'/0'/0");
      expect(multisigBIP32Path(P2SH, Network.TESTNET)).toEqual("m/45'/1'/0'/0");
    });
  });

  describe("getParentBIP32Path", () => {
    it("validates and returns the correct BIP32 parent path for each given path", () => {
      expect(getParentBIP32Path("")).toMatch(/cannot be blank/i);
      expect(getParentBIP32Path("foo")).toMatch(/is invalid/i);
      expect(getParentBIP32Path("/45")).toMatch(/is invalid/i);
      const validPaths = [
        "m/45'",
        "m/45'/0'",
        "m/45'/0'/0'",
        "m/45'/0'/0'/0",
        "m/45'/0'/0'/0/0",
      ];
      for (let i = validPaths.length - 1; i > 0; i--) {
        const expected = validPaths[i - 1];
        const actual = getParentBIP32Path(validPaths[i]);
        expect(actual).toMatch(expected);
      }
    });
  });

  describe("getRelativeBIP32Path", () => {
    it("validates and returns the correct BIP32 parent path for each given path/index combo", () => {
      expect(getRelativeBIP32Path("", "m/45'")).toMatch(/cannot be blank/i);
      expect(getRelativeBIP32Path("foo", "m/45'")).toMatch(/is invalid/i);
      expect(getRelativeBIP32Path("/45", "m/45'")).toMatch(/is invalid/i);
      expect(getRelativeBIP32Path("m/45'", "")).toMatch(/cannot be blank/i);
      expect(getRelativeBIP32Path("m/45'", "foo")).toMatch(/is invalid/i);
      expect(getRelativeBIP32Path("m/45'", "/45")).toMatch(/is invalid/i);
      expect(getRelativeBIP32Path("m/44'", "m/45'")).toMatch(
        /bip32Path does not start with the chroot/i
      );
      const validPaths = [
        "m/45'",
        "m/45'/0'",
        "m/45'/0'/0'",
        "m/45'/0'/0'/0",
        "m/45'/0'/0'/0/0",
      ];
      const expectedRelativePaths = ["", "0'", "0'/0'", "0'/0'/0", "0'/0'/0/0"];
      const chroot = "m/45'";
      for (let i = 0; i < validPaths.length; i++) {
        const expected = expectedRelativePaths[i];
        const actual = getRelativeBIP32Path(chroot, validPaths[i]);
        expect(actual).toMatch(expected);
      }
    });
  });
});
