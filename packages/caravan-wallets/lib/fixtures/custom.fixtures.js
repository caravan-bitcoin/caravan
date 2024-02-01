"use strict";

require("core-js/modules/es6.object.define-property");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.customFixtures = void 0;
require("core-js/modules/web.dom.iterable");
require("core-js/modules/es6.array.iterator");
require("core-js/modules/es6.object.to-string");
var _unchainedBitcoin = require("unchained-bitcoin");
var nodes = _unchainedBitcoin.TEST_FIXTURES.keys.open_source.nodes;
var P2SH_BASE_MAIN = "m/45'/0'/0'";
var P2SH_BASE_TEST = "m/45'/1'/0'";
var customFixtures = {
  // These use the Open Source Wallet words from the `unchained-bitcoin` fixtures
  validCustomTpubJSON: {
    bip32Path: P2SH_BASE_TEST,
    xpub: nodes[P2SH_BASE_TEST].xpub,
    rootFingerprint: _unchainedBitcoin.ROOT_FINGERPRINT
  },
  validCustomXpubJSON: {
    bip32Path: P2SH_BASE_MAIN,
    xpub: nodes[P2SH_BASE_MAIN].xpub,
    rootFingerprint: _unchainedBitcoin.ROOT_FINGERPRINT
  },
  validTpubFakeRootFingerprintOutput: {
    xpub: "tpubDDQubdBx9cbs16zUhpiM135EpvjSbVz7SGJyGg4rvRVEYdncZy3Kzjg6NjuFWcShiCyNqviWTBiZPb25p4WcaLppVmAuiPMrkR1kahNoioL",
    bip32Path: P2SH_BASE_TEST,
    rootFingerprint: "0b287198"
  },
  validXpubFakeRootFingerprintOutput: {
    xpub: "xpub6CCHViYn5VzKFqrKjAzSSqP8XXSU5fEC6ZYSncX5pvSKoRLrPDcF8cEaZkrQvvnuwRUXeKVjoGmAqvbwVkNBFLaRiqcdVhWPyuShUrbcZsv",
    bip32Path: P2SH_BASE_MAIN,
    rootFingerprint: "266afe03"
  }
};
exports.customFixtures = customFixtures;