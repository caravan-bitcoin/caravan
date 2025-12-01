import { Network } from "@caravan/bitcoin";

import { FeeBumpStrategy } from "../types";

export const transactionAnalyzerFixtures = {
  validTransactions: [
    {
      // https://mempool.space/tx/6446c234ef6e2c77b82c97792940f961d478e4674f7408815618a9fda277c5fb
      case: "RBF signaled transaction",
      txHex:
        "02000000000101f9df8cfa6cb54d8bd0f44d4d2b665a6ab11a0c61f08d5525bb9017eb3a83bf270000000000fdffffff02fa90000000000000160014c3f1f018c993180e667d6fcc51af0036a38a97290000000000000000076a5d04140114000247304402202c001eb4ddeabac07acf3ff62c3eb5c4eff39353eefdd5d410a17ed0105880c602207aec9c17866327ed8a37d3a089b70cfda040b95ee0218ffd240e200415b8d33b0121027e18b1eab7be5d378ab0c9a1ab1f738b75350dbba59f95ae91c8d3094cdf495500000000",
      options: {
        absoluteFee: "327",
        targetFeeRate: 1,
        network: Network.MAINNET,
        dustThreshold: 546,
        changeOutputIndex: 1,
        availableUtxos: [
          {
            txid: "27bf833aeb1790bb25558df0610c1ab16a5a662b4d4df4d08b4db56cfa8cdff9",
            prevTxHex:
              "02000000000101ffb300f1869eb6a374d02e489cb5d850bd06739955d3d08695489b8c7a3f905c0000000000fdffffff024192000000000000160014c3f1f018c993180e667d6fcc51af0036a38a97290000000000000000076a5d041401140002483045022100cc953354d643842c43571443a8ea766677296d96770e720e10c3a29ce0109379022019e4c746c0145cc575f40b78ee7fe1f1f725d960ccdc43940eea75101e84424f0121027e18b1eab7be5d378ab0c9a1ab1f738b75350dbba59f95ae91c8d3094cdf495500000000",
            vout: 0,
            value: "37441", // 0.00037441 BTC in satoshis
            witnessUtxo: {
              script: Buffer.from(
                "0014c3f1f018c993180e667d6fcc51af0036a38a9729",
                "hex",
              ),
              value: 37441,
            },
          },
        ],
      },
      expected: {
        txid: "6446c234ef6e2c77b82c97792940f961d478e4674f7408815618a9fda277c5fb",
        canRBF: true,
        canCPFP: true,
        inputCount: 1,
        outputCount: 2,
        vsize: 125.25,
        weight: 501,
        fee: "327",
        feeRate: "2.61",
        recommendedStrategy: FeeBumpStrategy.NONE,
        estimatedRBFFee: 453, // 327  + 1*125.25
        estimatedCPFPFee: 43,
        inputSequences: [4294967293],
        outputValues: [37114, 0],
      },
    },
    {
      // https://mempool.space/tx/b47dd2f885a4583e9f47b7b65fb2df8feeb0254e101574ee0407e52ccc5b66ea
      case: "Non-RBF signaled transaction",
      txHex:
        "020000000001010014cd0d501821b405ac62fea4148ed2233525e26cf297d5348b6f32af6f61bd0100000000ffffffff0265410000000000001600143c840220065e205fcab60328c86539235bfce3149504080000000000160014859d1dd47c63a308eff92006133c403ab3a760ff024830450221008895a7f75aa08dbc6fcf200be9addf688adb65934f4881799cea7b21a2f179b502207b7cd6fd931165057ce69421b25bf71f54db8202bc5a94ac100bcb3418d8d268012102b16f2b081b8ba89d5e30933da5f9a9bc8813d7612a14fba68be7b9cc725a4d5600000000",
      options: {
        absoluteFee: "482",
        targetFeeRate: 5,
        network: Network.MAINNET,
        dustThreshold: 546,
        changeOutputIndex: 1,
        availableUtxos: [
          {
            txid: "bd616faf326f8b34d597f26ce2253523d28e14a4fe62ac05b42118500dcd1400",
            vout: 1,
            value: "542684", // 0.00542684 BTC in satoshis
            witnessUtxo: {
              script: Buffer.from(
                "0014859d1dd47c63a308eff92006133c403ab3a760ff",
                "hex",
              ),
              value: 542684,
            },
          },
        ],
      },
      expected: {
        txid: "b47dd2f885a4583e9f47b7b65fb2df8feeb0254e101574ee0407e52ccc5b66ea",
        canRBF: false,
        canCPFP: true,
        inputCount: 1,
        outputCount: 2,
        vsize: 140.5,
        weight: 562,
        fee: "482",
        feeRate: "3.43",
        recommendedStrategy: FeeBumpStrategy.CPFP,
        estimatedRBFFee: 623, // 482 + 1*140.5 = 622.5(minimum RBF for bumping , 1 sats/vbyte incremental fee)
        estimatedCPFPFee: 2210,
        inputSequences: [4294967295],
        outputValues: [16741, 525461],
      },
    },
    {
      // https://mempool.space/tx/78d249155c3d1a70353192a86d4770a2fbaa6ca2c07a0a6c7b0c3951c649d462
      case: "Both RBF and CPFP possible",
      txHex:
        "020000000001013d8c8999e448c6593d7567534f36cd29d720931d2babc95fdd8074c7619f994d0200000000fdffffff0849a4000000000000160014e652c05df205783da3c52389297b735cbef809c7a3a8000000000000160014c8566e21fb0856d80619c5da034ac4feddc613d08abe000000000000160014539422c6b02c4f8ebd867ddefddc8fe1b826e80468bf000000000000160014dbe8fcf64788f7c0b3ccba91e164d5460648e7b190e20000000000001600148b90d42b9e07d2374325889126fa1ab0abd6e8a890e2000000000000160014f48f05c1c21cec9f26421bff7cb4e4ad0313fe19c54c020000000000160014ddd7bf2a9b1403fc7f6ab758057b3c6ad522af030d11b00000000000160014690b6f1113ddcad9eb2c931ad53b25cdfa756c24024730440220728d7f4df67f6f1fb0742bcd0a23b1604d561d8f9525ec85310a4f375a03100602204792910102db2001ed3bde8145e63dcae90e5aeef9bc16c21c4597baf3fba3ea012103f38818a20f1b81ee305b7e6dd9e0f76623a95c79ea17673a46dcfa558cddfe23a71a0d00",
      options: {
        absoluteFee: "2289",
        targetFeeRate: 15,
        network: Network.MAINNET,
        dustThreshold: 546,
        changeOutputIndex: 7,
        availableUtxos: [
          {
            txid: "4d999f61c77480dd5fc9ab2b1d9320d729cd364f5367753d59c648e499898c3d",
            vout: 2,
            value: "11990721", // 0.11990721 BTC in satoshis
            prevTxHex:
              "02000000000101a443287510d866aacc0638693f75e677020d35a9593d8713d8b8da56c8dbd1860400000000fdffffff03f1c00000000000001600141bf5e314ac13e0d8bb96182e8f5104e9ccff0ba87c98010000000000160014957e78098f25333734498c7bb15a93a982c909f3c1f6b60000000000160014e3bc70ab68cbb50ca0a351f98d80ce7723b7f1250247304402206d5055463225dc6b0c8d57dbf551ac77a364b836e24cdbef283d4a33a286a9810220379f14e13ef9660f3ce6f50bf53025f5244bbb1d8e9973cc689f66efd174f0ab012102a9fd420c6f4afa4b4385ba35606f47233f9f37a13d97084e1b59aff64884223b941a0d00",
            witnessUtxo: {
              script: Buffer.from(
                "0014e3bc70ab68cbb50ca0a351f98d80ce7723b7f125",
                "hex",
              ),
              value: 11990721,
            },
          },
        ],
      },
      expected: {
        txid: "78d249155c3d1a70353192a86d4770a2fbaa6ca2c07a0a6c7b0c3951c649d462",
        canRBF: true,
        canCPFP: true,
        inputCount: 1,
        outputCount: 8,
        vsize: 326.25,
        weight: 1305,
        fee: "2289",
        feeRate: "7.02",
        recommendedStrategy: FeeBumpStrategy.RBF,
        estimatedRBFFee: 2616, // 2289 + 1 * 326.25
        estimatedCPFPFee: 14690,
        inputSequences: [4294967293],
        outputValues: [
          42057, 43171, 48778, 49000, 58000, 58000, 150725, 11538701,
        ],
      },
    },
    // ...TO DO (MRIGESH): add other valid transaction cases , based on suggestions received ...
  ],
  invalidTransactions: [
    {
      case: "Transaction with no inputs",
      txHex: "0200000000010000000000000000096a07546573744f505400000000",
      options: {
        absoluteFee: "0",
        targetFeeRate: 1,
        network: Network.MAINNET,
        dustThreshold: 546,
        changeOutputIndex: 0, // random as it would fail anyways
        availableUtxos: [],
      },
      expectedError: "Transaction has no inputs",
    },
    {
      case: "Transaction with no outputs",
      txHex:
        "0200000001f9df8cfa6cb54d8bd0f44d4d2b665a6ab11a0c61f08d5525bb9017eb3a83bf270000000000fdffffff0000000000",
      options: {
        absoluteFee: "51",
        targetFeeRate: 1,
        network: Network.MAINNET,
        dustThreshold: 546,
        changeOutputIndex: 0, // random as it would fail anyways
        availableUtxos: [],
      },
      expectedError: "Transaction has no outputs",
    },
    {
      case: "Invalid transaction hex",
      txHex:
        "0100000002a4814fd0c260334875985613f95b012d9514a6f1d2979b29e0ada7f4f1c5987c010000006b483045022100af590e92332d1a28fd1635cfd86683843daafe875ece517061251844ba92788f022038510d3326532f9c525e298c550daddb2bfc52e34c735e541c96c0cf9e2e14200121021f097756ba020e8ba72f6bcde18dd757b9235b6f613fd4cc56fecd1caefc7a44ffffffff4a69a65d45163278be854789839e57bf2800e52a5a17f859a8236baace57695f000000006b48304502210094dfa2f4ebe267bc76e889ffac833f6e059781020a65e034dd174e74ef7d7ddb022009b245e4e20f44125859627ebc51f8d08e9f600b93a03d30ca8501e9e78f9d3801210290962152a37b473065ff2e8447733da18bfc13938d0cd5bd816154b5b52908d7ffffffff01010000000000000000000000",
      options: {
        absoluteFee: "100",
        targetFeeRate: 1,
        network: Network.MAINNET,
        dustThreshold: 546,
        changeOutputIndex: 0, // random as it would fail anyways
        availableUtxos: [],
      },
      expectedError: "Invalid transaction hex",
    },
  ],
};
