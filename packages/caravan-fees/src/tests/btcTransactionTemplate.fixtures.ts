import { Network } from "@caravan/bitcoin";
import { TxOutputType } from "../types";

export const fixtures = [
  {
    // https://mempool.space/tx/d66730234997ea82005838c72e56470164fd6fb31c192791f898d9eadfad84a6
    name: "Single input, multiple outputs transaction",
    test: {
      inputs: [
        {
          txid: "781e5527d1af148125f6f1c29177cd2168246d84210dd223019811286b2f4718",
          vout: 5,
          amountSats: "22181635",
        },
      ],
      outputs: [
        {
          address: "bc1qvnek97cc7g28z966k6z7cxnkqzry0e8qpcldr0",
          amountSats: "147872",
          type: TxOutputType.EXTERNAL,
        },
        {
          address: "1P8Ka29bmHMq3eX8o16SxvN5KSzEuq7Mwr",
          amountSats: "2803883",
          type: TxOutputType.EXTERNAL,
        },
        {
          address: "bc1q5cs5gzfrg75hfmalwvuc7suw3ectqf505famgy",
          amountSats: "151680",
          type: TxOutputType.EXTERNAL,
        },
        {
          address: "bc1qlrwrfe7wt9nla7p4usevxwjfw38qlzs4mn6kn2",
          amountSats: "389515",
          type: TxOutputType.CHANGE,
        },
        {
          address: "3DbSS6ybKUdnqrVnMMwJqMc2x2BvuT7YpU",
          amountSats: "699910",
          type: TxOutputType.EXTERNAL,
        },
        {
          address: "bc1q4t348nq4r50l7uqzja868prca62n49ca37z4z5",
          amountSats: "780487",
          type: TxOutputType.EXTERNAL,
        },
        {
          address: "bc1qtyee6c5k4dtqtk6sf8p4hd9hqq6ajkhzzmy8vy",
          amountSats: "38734",
          type: TxOutputType.EXTERNAL,
        },
        {
          address: "bc1qnfw0gkk05qxl38mslc69hc6vc64mksyw6zzxhg",
          amountSats: "17168362",
          type: TxOutputType.EXTERNAL,
        },
      ],
      network: Network.MAINNET,
      targetFeeRate: 1,
      scriptType: "P2SH_P2WSH",
      requiredSigners: 1,
      totalSigners: 1,
    },
    expected: {
      vsize: 406,
      fee: "1192",
      feeRate: "2.93",
    },
  },
  {
    name: "Single input, multisig outputs transaction",
    test: {
      inputs: [
        {
          txid: "15a435a2614ee85776e26908fab442e51a57f4e83f5f4a798ca190ef5fd7defe",
          vout: 1,
          amountSats: "36444",
        },
      ],
      outputs: [
        {
          address: "bc1q6kz5j2ppfjgwq3g9anvsg7vwnjl8s6vree7v0r",
          amountSats: "547",
          type: TxOutputType.EXTERNAL,
        },
        {
          address: "bc1qfyxv2ndmp7uy3vzaqpwf8uf9l9a2rxphr8pftj",
          amountSats: "31020",
          type: TxOutputType.CHANGE,
        },
        {
          address:
            "bc1qs64cjuvgwyw0j8d3txxxmyc4ajal49u6a5f9feefy7cr64ndy85ssqswh8",
          amountSats: "796",
          type: TxOutputType.EXTERNAL,
        },
        {
          address:
            "bc1quykxzkguhk02svrrcayu4ppdva2lfcsfz05wy7a8j5t5cgcfelyqp3xhkt",
          amountSats: "796",
          type: TxOutputType.EXTERNAL,
        },
      ],
      network: Network.MAINNET,
      targetFeeRate: 1,
      scriptType: "P2SH_P2WSH",
      requiredSigners: 1,
      totalSigners: 3,
    },
    expected: {
      vsize: 287,
      fee: "3285",
      feeRate: "11.4",
    },
  },
];
