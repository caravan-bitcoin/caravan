import { validateAddress } from "./addresses";
import * as multisig from "./multisig";
import { Network } from "./networks";

const P2PKH = "P2PKH";
const P2TR = "P2TR";

const ADDRESSES = {};
ADDRESSES[Network.MAINNET] = {};
ADDRESSES[Network.MAINNET][P2PKH] = ["1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH"];
ADDRESSES[Network.MAINNET][(multisig as any).P2SH] = [
  "3LRW7jeCvQCRdPF8S3yUCfRAx4eqXFmdcr",
];
ADDRESSES[Network.MAINNET][(multisig as any).P2WSH] = [
  "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
  "bc1qng72v5ceptk07htel0wcv6k27fkg6tmmd8887jr2l2yz5a5lnawqqeceya",
];
ADDRESSES[Network.MAINNET][P2TR] = [
  "bc1pap0ck84srwp6my97h250ws73z3mq765nm2382gzcqcarx9lxjzrq4eqyp8",
];

ADDRESSES[Network.TESTNET] = {};
ADDRESSES[Network.TESTNET][P2PKH] = ["mrCDrCybB6J1vRfbwM5hemdJz73FwDBC8r"];
ADDRESSES[Network.TESTNET][(multisig as any).P2SH] = [
  "2NByiBUaEXrhmqAsg7BbLpcQSAQs1EDwt5w",
];
ADDRESSES[Network.TESTNET][(multisig as any).P2WSH] = [
  "tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sl5k7",
];
ADDRESSES[Network.TESTNET][P2TR] = [
  "tb1p94dllzzcax4hs4zljaygq5trzzy79486uy72uqus24zzpkrkaeuqgfw9fy",
];
ADDRESSES[Network.REGTEST] = {};
ADDRESSES[Network.REGTEST][P2PKH] = ["msX7BWX7xnyqGMxHRCqWoogcvQ93PQtWWR"];
ADDRESSES[Network.REGTEST][(multisig as any).P2SH] = [
  "2NByiBUaEXrhmqAsg7BbLpcQSAQs1EDwt5w",
];
ADDRESSES[Network.REGTEST][(multisig as any).P2WSH] = [
  "bcrt1q5qlrrl9lq2mktevfdlxl6upxqluadr74x3znhc",
];
ADDRESSES[Network.REGTEST][P2TR] = [
  "bcrt1pgdfg7w74kh0uqgwxyafvhnsyx5mtzxr0rgt2wrgluykp4mvj3vls2fussn",
];

const ADDRESS_TYPES = [
  P2PKH,
  (multisig as any).P2SH,
  (multisig as any).P2WSH,
  P2TR,
];

describe("addresses", () => {
  describe("validateAddress", () => {
    const invalidAddress = /must start with.+followed by letters or digits/i;

    it("returns an error message on blank addresses", () => {
      Object.values(Network).forEach((network) => {
        expect(validateAddress("", network)).toMatch(/cannot be blank/i);
        expect(validateAddress(" ", network)).toMatch(/cannot be blank/i);
      });
    });

    it("returns an error message on an invalid address", () => {
      Object.values(Network).forEach((network) => {
        expect(validateAddress("f", network)).toMatch(invalidAddress);
        expect(validateAddress("--", network)).toMatch(invalidAddress);
      });

      expect(validateAddress("1asdf", Network.MAINNET)).toMatch(
        /address is invalid/i,
      );
      expect(validateAddress("masdf", Network.TESTNET)).toMatch(
        /address is invalid/i,
      );
    });

    it("returns an error message when an address doesn't match the network", () => {
      ADDRESS_TYPES.forEach((addressType) => {
        ADDRESSES[Network.MAINNET][addressType].forEach((address) => {
          expect(validateAddress(address, Network.TESTNET)).toMatch(
            invalidAddress,
          );
        });
        ADDRESSES[Network.TESTNET][addressType].forEach((address) => {
          expect(validateAddress(address, Network.MAINNET)).toMatch(
            invalidAddress,
          );
        });
        ADDRESSES[Network.REGTEST][addressType].forEach((address) => {
          expect(validateAddress(address, Network.MAINNET)).toMatch(
            invalidAddress,
          );
        });
      });
    });

    it.only("returns an empty string when the address is valid", () => {
      [Network.MAINNET, Network.TESTNET, Network.REGTEST].forEach((network) => {
        ADDRESS_TYPES.forEach((addressType) => {
          ADDRESSES[network][addressType].forEach((address) => {
            console.log(address, network);
            expect(validateAddress(address, network)).toEqual("");
          });
        });
      });
    });
  });
});
