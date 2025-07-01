import { Network } from "@caravan/bitcoin";

export const fixtures: TestFixture[] = [
  {
    case: "Single input, multiple outputs transaction",
    input: {
      inputs: [
        {
          txid: "781e5527d1af148125f6f1c29177cd2168246d84210dd223019811286b2f4718",
          vout: 5,
          value: "22181635",
          sequence: 4294967295,
          prevTxHex:
            "0100000000010117ba2213d4849fded58c68eb58da6a0a7d310bba86e4eff2dd3a4da88a7044f20500000000ffffffff06297d080000000000160014fe3f10c6682ca520d7d4bb9ce6aac24a3e8887bdbaa2030000000000160014a91587db15572a94389fd4ae1dcbb21b14c61bd631660400000000001600144c43740c628dd1e8a67fa0e8cef7ce6dfc5aba71787e0400000000001976a9142bb0012ff941501d1207f2fba0223d3f4411162288acd01213000000000017a914d3817a569b661bb420560132777c3c4536d925a08703775201000000001600149a5cf45acfa00df89f70fe345be34cc6abbb408e02483045022100b785095310cbf768071fba7da86f57316547dae1c7cceb3b6d2803108cae88660220041fb4dff95fea2247d2582738233e1fb8e8f06abc844de261b6141214ffd59b012103782c80595775eb1b564ee6b136075f90824c5f102c15884546ea590f3636584f00000000",
          witnessUtxo: {
            script: Buffer.from(
              "00149a5cf45acfa00df89f70fe345be34cc6abbb408e",
              "hex",
            ),
            value: 24810346,
          },
        },
      ],
      outputs: [
        {
          address: "bc1qvnek97cc7g28z966k6z7cxnkqzry0e8qpcldr0",
          amountSats: "147872",
          locked: true,
        },
        {
          address: "1P8Ka29bmHMq3eX8o16SxvN5KSzEuq7Mwr",
          amountSats: "2803883",
          locked: true,
        },
        {
          address: "bc1q5cs5gzfrg75hfmalwvuc7suw3ectqf505famgy",
          amountSats: "151680",
          locked: true,
        },
        {
          address: "bc1qlrwrfe7wt9nla7p4usevxwjfw38qlzs4mn6kn2",
          amountSats: "389515",
          locked: false,
        },
        {
          address: "3DbSS6ybKUdnqrVnMMwJqMc2x2BvuT7YpU",
          amountSats: "699910",
          locked: true,
        },
        {
          address: "bc1q4t348nq4r50l7uqzja868prca62n49ca37z4z5",
          amountSats: "780487",
          locked: true,
        },
        {
          address: "bc1qtyee6c5k4dtqtk6sf8p4hd9hqq6ajkhzzmy8vy",
          amountSats: "38734",
          locked: true,
        },
        {
          address: "bc1qnfw0gkk05qxl38mslc69hc6vc64mksyw6zzxhg",
          amountSats: "17168362",
          locked: true,
        },
      ],
      network: Network.MAINNET,
      targetFeeRate: 1,
      scriptType: "P2SH-P2WSH",
      requiredSigners: 1,
      totalSigners: 1,
    },
    expected: {
      vsize: 284,
      fee: "1192",
      feeRate: "4.19",
    },
  },
  {
    case: "Single input, multisig outputs transaction",
    input: {
      inputs: [
        {
          txid: "15a435a2614ee85776e26908fab442e51a57f4e83f5f4a798ca190ef5fd7defe",
          vout: 1,
          value: "36444",
          sequence: 4294967295,
          prevTxHex:
            "0100000000010117ba2213d4849fded58c68eb58da6a0a7d310bba86e4eff2dd3a4da88a7044f20500000000ffffffff06297d080000000000160014fe3f10c6682ca520d7d4bb9ce6aac24a3e8887bdbaa2030000000000160014a91587db15572a94389fd4ae1dcbb21b14c61bd631660400000000001600144c43740c628dd1e8a67fa0e8cef7ce6dfc5aba71787e0400000000001976a9142bb0012ff941501d1207f2fba0223d3f4411162288acd01213000000000017a914d3817a569b661bb420560132777c3c4536d925a08703775201000000001600149a5cf45acfa00df89f70fe345be34cc6abbb408e02483045022100b785095310cbf768071fba7da86f57316547dae1c7cceb3b6d2803108cae88660220041fb4dff95fea2247d2582738233e1fb8e8f06abc844de261b6141214ffd59b012103782c80595775eb1b564ee6b136075f90824c5f102c15884546ea590f3636584f00000000",
          witnessUtxo: {
            script: Buffer.from(
              "00149a5cf45acfa00df89f70fe345be34cc6abbb408e",
              "hex",
            ),
            value: 24810346,
          },
        },
      ],
      outputs: [
        {
          address: "bc1q6kz5j2ppfjgwq3g9anvsg7vwnjl8s6vree7v0r",
          amountSats: "547",
          locked: true,
        },
        {
          address: "bc1qfyxv2ndmp7uy3vzaqpwf8uf9l9a2rxphr8pftj",
          amountSats: "31020",
          locked: false,
        },
        {
          address:
            "bc1qs64cjuvgwyw0j8d3txxxmyc4ajal49u6a5f9feefy7cr64ndy85ssqswh8",
          amountSats: "796",
          locked: true,
        },
        {
          address:
            "bc1quykxzkguhk02svrrcayu4ppdva2lfcsfz05wy7a8j5t5cgcfelyqp3xhkt",
          amountSats: "796",
          locked: true,
        },
      ],
      network: Network.MAINNET,
      targetFeeRate: 1,
      scriptType: "P2SH-P2WSH",
      requiredSigners: 1,
      totalSigners: 3,
    },
    expected: {
      vsize: 205,
      fee: "3285",
      feeRate: "16.02",
    },
  },
];

//Reduce method is being called on fixture.test.inputs, which TypeScript doesn't recognize as an array. To fix this, we need to ensure that fixture.test.inputs is properly typed as an array.
export interface TestInput {
  txid: string;
  vout: number;
  value: string;
  sequence?: number;
  prevTxHex?: string;
  witnessUtxo?: { script: Buffer; value: number };
}

export interface TestFixture {
  case: string;
  input: {
    inputs: TestInput[];
    outputs: {
      address: string;
      amountSats: string;
      locked: boolean;
    }[];
    network: Network;
    targetFeeRate: number;
    scriptType: string;
    requiredSigners: number;
    totalSigners: number;
  };
  expected: {
    vsize: number;
    fee: string;
    feeRate: string;
  };
}
