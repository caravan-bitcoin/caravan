"use strict";

require("core-js/modules/es6.object.define-property");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.POLICY_FIXTURE = void 0;
require("core-js/modules/web.dom.iterable");
require("core-js/modules/es6.array.iterator");
require("core-js/modules/es6.object.to-string");
require("core-js/modules/es6.array.map");
var _unchainedBitcoin = require("unchained-bitcoin");
var _policy = require("./policy");
var paths = ["m/48'/1'/100'/1'", "m/48'/1'/100'/2'"];
var origins = paths.map(function (path) {
  var node = _unchainedBitcoin.TEST_FIXTURES.keys.open_source.nodes[path];
  return new _policy.KeyOrigin({
    xfp: node.rootFingerprint,
    xpub: node.xpub,
    network: _unchainedBitcoin.Network.TESTNET,
    bip32Path: path
  });
});
var POLICY_FIXTURE = {
  paths: paths,
  origins: origins,
  policy: new _policy.MultisigWalletPolicy({
    name: "My Test",
    template: "wsh(sortedmulti(2,@0/**,@1/**))",
    keyOrigins: origins
  })
};
exports.POLICY_FIXTURE = POLICY_FIXTURE;