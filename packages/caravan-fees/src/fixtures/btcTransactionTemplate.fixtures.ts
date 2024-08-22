// btcTransactionTemplateFixtures.ts

import { Network } from "@caravan/bitcoin";
import {
  BtcTxInputTemplate,
  BtcTxOutputTemplate,
} from "../btcTransactionComponents";
import { TxOutputType } from "../types";

export const fixtures = {
  network: Network.TESTNET,
  dustThreshold: 546,
  targetFeeRate: 10,
  scriptType: "P2WSH",
  requiredSigners: 2,
  totalSigners: 3,

  inputs: [
    new BtcTxInputTemplate({
      txid: "1137e5df14d5d533c7cdda42c614d71f59fecec0ab0bec3c9b89a5178273b4a9",
      vout: 1,
      amountSats: 100000,
    }),
    new BtcTxInputTemplate({
      txid: "d72942040804eed2755412c29a03dee8a8124644a34f53d2f6ef4d945b6f8049",
      vout: 36,
      amountSats: 200000,
    }),
  ],

  outputs: [
    new BtcTxOutputTemplate({
      address: "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx",
      amountSats: 50000,
      type: TxOutputType.DESTINATION,
    }),
    new BtcTxOutputTemplate({
      address: "tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sl5k7",
      amountSats: 150000,
      type: TxOutputType.CHANGE,
    }),
  ],

  invalidInput: new BtcTxInputTemplate({
    txid: "invalid",
    vout: 0,
    amountSats: 0,
  }),

  invalidOutput: new BtcTxOutputTemplate({
    address: "",
    amountSats: 0,
    type: TxOutputType.DESTINATION,
  }),

  dustOutput: new BtcTxOutputTemplate({
    address: "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx",
    amountSats: 100,
    type: TxOutputType.DESTINATION,
  }),
};
