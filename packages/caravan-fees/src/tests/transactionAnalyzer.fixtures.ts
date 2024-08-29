import { Network } from "@caravan/bitcoin";
import { FeeBumpStrategy } from "../types";

export const transactionAnalyzerFixtures = [
  {
    // https://mempool.space/tx/6446c234ef6e2c77b82c97792940f961d478e4674f7408815618a9fda277c5fb
    name: "RBF signaled transaction",
    test: {
      txHex:
        "02000000000101f9df8cfa6cb54d8bd0f44d4d2b665a6ab11a0c61f08d5525bb9017eb3a83bf270000000000fdffffff02fa90000000000000160014c3f1f018c993180e667d6fcc51af0036a38a97290000000000000000076a5d04140114000247304402202c001eb4ddeabac07acf3ff62c3eb5c4eff39353eefdd5d410a17ed0105880c602207aec9c17866327ed8a37d3a089b70cfda040b95ee0218ffd240e200415b8d33b0121027e18b1eab7be5d378ab0c9a1ab1f738b75350dbba59f95ae91c8d3094cdf495500000000",
      absoluteFee: "327",
      targetFeeRate: 1,
      network: Network.MAINNET,
      dustThreshold: 546,
      changeOutputIndex: 1,
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
      estimatedRBFFee: 126,
      estimatedCPFPFee: 73,
      inputSequences: [4294967293],
      outputValues: [37114, 0],
    },
  },
  {
    // https://mempool.space/tx/b47dd2f885a4583e9f47b7b65fb2df8feeb0254e101574ee0407e52ccc5b66ea
    name: "Non-RBF signaled transaction",
    test: {
      txHex:
        "020000000001010014cd0d501821b405ac62fea4148ed2233525e26cf297d5348b6f32af6f61bd0100000000ffffffff0265410000000000001600143c840220065e205fcab60328c86539235bfce3149504080000000000160014859d1dd47c63a308eff92006133c403ab3a760ff024830450221008895a7f75aa08dbc6fcf200be9addf688adb65934f4881799cea7b21a2f179b502207b7cd6fd931165057ce69421b25bf71f54db8202bc5a94ac100bcb3418d8d268012102b16f2b081b8ba89d5e30933da5f9a9bc8813d7612a14fba68be7b9cc725a4d5600000000",
      absoluteFee: "482",
      targetFeeRate: 5,
      network: Network.MAINNET,
      dustThreshold: 546,
      changeOutputIndex: 1, // supposing it is the change output
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
      estimatedRBFFee: 223, // assuming full RBF is allowed
      estimatedCPFPFee: 2303,
      inputSequences: [4294967295],
      outputValues: [16741, 525461],
    },
  },
  {
    // https://mempool.space/tx/d66730234997ea82005838c72e56470164fd6fb31c192791f898d9eadfad84a6
    name: "CPFP-eligible transaction with multiple outputs",
    test: {
      txHex:
        "01000000000101781e5527d1af148125f6f1c29177cd2168246d84210dd223019811286b2f47180500000000ffffffff08a04102000000000016001464f362fb18f21471175ab685ec1a76008647e4e0abc82a00000000001976a914f2b52e0ace2fc22b4b6d4a25bc9a1dbdbba1287488ac8050020000000000160014a62144092347a974efbf73398f438e8e70b0268f8bf1050000000000160014f8dc34e7ce5967fef835e432c33a49744e0f8a1506ae0a000000000017a91482937927f14cbb2f9c5d3d9fd8b5d3023aada36a87c7e80b0000000000160014aae353cc151d1fff7002974fa38478ee953a971d4e9700000000000016001459339d6296ab5605db5049c35bb4b70035d95ae2eaf70501000000001600149a5cf45acfa00df89f70fe345be34cc6abbb408e02483045022100dbcc74f39ee38d06c446d772e8dab635df06ecbc0a44635ab3c09e3e9c7629e2022071c5e017cef2c791c0a6279b299bebb14e8e22a05d819b929c7aa38147c46132012103782c80595775eb1b564ee6b136075f90824c5f102c15884546ea590f3636584f00000000",
      absoluteFee: "1192",
      targetFeeRate: 10,
      network: Network.MAINNET,
      dustThreshold: 546,
      changeOutputIndex: 3,
    },
    expected: {
      txid: "d66730234997ea82005838c72e56470164fd6fb31c192791f898d9eadfad84a6",
      canRBF: false,
      canCPFP: true,
      inputCount: 1,
      outputCount: 8,
      vsize: 330.5,
      weight: 1322,
      fee: "1192",
      feeRate: "3.61",
      recommendedStrategy: FeeBumpStrategy.CPFP,
      estimatedRBFFee: 2118, // assuming full RBF is allowed
      estimatedCPFPFee: 10732,
      inputSequences: [4294967295],
      outputValues: [
        147872, 2803883, 151680, 389515, 699910, 780487, 38734, 17168362,
      ],
    },
  },
  {
    // https://mempool.space/tx/78d249155c3d1a70353192a86d4770a2fbaa6ca2c07a0a6c7b0c3951c649d462
    name: "Both RBF and CPFP possible",
    test: {
      txHex:
        "020000000001013d8c8999e448c6593d7567534f36cd29d720931d2babc95fdd8074c7619f994d0200000000fdffffff0849a4000000000000160014e652c05df205783da3c52389297b735cbef809c7a3a8000000000000160014c8566e21fb0856d80619c5da034ac4feddc613d08abe000000000000160014539422c6b02c4f8ebd867ddefddc8fe1b826e80468bf000000000000160014dbe8fcf64788f7c0b3ccba91e164d5460648e7b190e20000000000001600148b90d42b9e07d2374325889126fa1ab0abd6e8a890e2000000000000160014f48f05c1c21cec9f26421bff7cb4e4ad0313fe19c54c020000000000160014ddd7bf2a9b1403fc7f6ab758057b3c6ad522af030d11b00000000000160014690b6f1113ddcad9eb2c931ad53b25cdfa756c24024730440220728d7f4df67f6f1fb0742bcd0a23b1604d561d8f9525ec85310a4f375a03100602204792910102db2001ed3bde8145e63dcae90e5aeef9bc16c21c4597baf3fba3ea012103f38818a20f1b81ee305b7e6dd9e0f76623a95c79ea17673a46dcfa558cddfe23a71a0d00",
      absoluteFee: "2289",
      targetFeeRate: 15,
      network: Network.MAINNET,
      dustThreshold: 546,
      changeOutputIndex: 7,
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
      estimatedRBFFee: 2617,
      estimatedCPFPFee: 14692,
      inputSequences: [4294967293],
      outputValues: [
        42057, 43171, 48778, 49000, 58000, 58000, 150725, 11538701,
      ],
    },
  },
];
