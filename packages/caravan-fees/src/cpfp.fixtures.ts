import { PsbtV2 } from "@caravan/psbt";
import { Network } from "@caravan/bitcoin";

const parentPsbtFixture = new PsbtV2();
parentPsbtFixture.addInput({
  previousTxId:
    "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  outputIndex: 0,
  witnessUtxo: {
    script: Buffer.from("0014000000000000000000000000000000000000", "hex"),
    amount: 100000, // 0.001 BTC
  },
});
parentPsbtFixture.addOutput({
  script: Buffer.from("0014111111111111111111111111111111111111", "hex"),
  amount: 90000, // 0.0009 BTC
});

const additionalUtxoFixture = {
  txid: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
  vout: 0,
  value: 50000, // 0.0005 BTC
  script: Buffer.from("0014222222222222222222222222222222222222", "hex"),
};

const defaultOptions = {
  parentPsbt: parentPsbtFixture,
  spendableOutputs: [0],
  destinationAddress: "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
  feeRate: { satoshisPerByte: 2 },
  network: Network.MAINNET,
  requiredSigners: 2,
  totalSigners: 3,
  addressType: "P2WSH",
};

export { parentPsbtFixture, additionalUtxoFixture, defaultOptions };
