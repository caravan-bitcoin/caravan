import { TEST_FIXTURES, Network } from "unchained-bitcoin";
import { KeyOrigin, MultisigWalletPolicy } from "./policy";

const paths = ["m/48'/1'/100'/1'", "m/48'/1'/100'/2'"];
const origins = paths.map((path) => {
  const node = TEST_FIXTURES.keys.open_source.nodes[path];
  return new KeyOrigin({
    xfp: node.rootFingerprint,
    xpub: node.xpub,
    network: Network.TESTNET,
    bip32Path: path,
  });
});

export const POLICY_FIXTURE = {
  paths,
  origins,
  policy: new MultisigWalletPolicy({
    name: "My Test",
    template: "wsh(sortedmulti(2,@0/**,@1/**))",
    keyOrigins: origins,
  }),
};
