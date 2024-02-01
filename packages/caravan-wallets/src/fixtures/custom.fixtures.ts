import { TEST_FIXTURES, ROOT_FINGERPRINT } from "unchained-bitcoin";

const { nodes } = TEST_FIXTURES.keys.open_source;

const P2SH_BASE_MAIN = "m/45'/0'/0'";
const P2SH_BASE_TEST = "m/45'/1'/0'";

export const customFixtures = {
  // These use the Open Source Wallet words from the `unchained-bitcoin` fixtures
  validCustomTpubJSON: {
    bip32Path: P2SH_BASE_TEST,
    xpub: nodes[P2SH_BASE_TEST].xpub,
    rootFingerprint: ROOT_FINGERPRINT,
  },

  validCustomXpubJSON: {
    bip32Path: P2SH_BASE_MAIN,
    xpub: nodes[P2SH_BASE_MAIN].xpub,
    rootFingerprint: ROOT_FINGERPRINT,
  },

  validTpubFakeRootFingerprintOutput: {
    xpub: "tpubDDQubdBx9cbs16zUhpiM135EpvjSbVz7SGJyGg4rvRVEYdncZy3Kzjg6NjuFWcShiCyNqviWTBiZPb25p4WcaLppVmAuiPMrkR1kahNoioL",
    bip32Path: P2SH_BASE_TEST,
    rootFingerprint: "0b287198",
  },

  validXpubFakeRootFingerprintOutput: {
    xpub: "xpub6CCHViYn5VzKFqrKjAzSSqP8XXSU5fEC6ZYSncX5pvSKoRLrPDcF8cEaZkrQvvnuwRUXeKVjoGmAqvbwVkNBFLaRiqcdVhWPyuShUrbcZsv",
    bip32Path: P2SH_BASE_MAIN,
    rootFingerprint: "266afe03",
  },
};
