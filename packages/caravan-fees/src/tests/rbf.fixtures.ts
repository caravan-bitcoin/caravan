import { Network } from "@caravan/bitcoin";

import { UTXO, SCRIPT_TYPES } from "../types";

export const rbfFixtures = {
  cancelRbf: [
    // https://mempool.space/tx/be81b81620702718957d445611066bd596fe1840e219b84f6ea60e0114a7a305
    {
      /*
      ====================================== IMPORTANT ====================================
      This multisig transaction example demonstrates a key aspect of RBF (Replace-By-Fee) cancellation:

      Original Transaction:
      - Type: P2WSH (Pay-to-Witness-Script-Hash)
      - Inputs: 2
      - Outputs: 3
      - Fee: 20,880 satoshis
      - Size: 348 vBytes
      - Fee Rate: 60 sat/vB (20,880 / 348)

      RBF Cancellation Scenario:
      1. Target Fee Rate: 80 sat/vB (increased from original 60 sat/vB)
      2. Cancellation tx typically has fewer outputs (usually just one to the cancellation address)
      3. In this case, the new tx size decreases to 159 vBytes due to having only one output

      RBF Fee Calculation:
      - Minimum required fee: 20,880 satoshis (must be >= original fee to satisfy RBF rule #3)
      - Actual fee rate achieved: 131.32 sat/vB (20,880 / 159)

      Key Observation:
      Even though a fee of 12,720 satoshis (159 * 80) would achieve the desired 80 sat/vB rate,
      we must pay the original fee of 20,880 satoshis to satisfy RBF rules. This results in a
      higher effective fee rate than initially targeted.
      Note here our RBF function pays 21,228 = original(20,880) + incremental_fees * original_tx_size(1 * 348)
      as we use txAnalyzer to calculate minimum RBF fee which cannot account for changed tx size as in this case so assumes the above minimum fees to be paid

      This example illustrates how RBF cancellations can sometimes lead to paying more in fees
      than strictly necessary for the desired fee rate, due to the requirement to pay at least
      the original transaction's fee.
     */
      case: "Create a valid cancel RBF transaction",
      originalTx:
        "010000000001022b2be3ac975c385defbda23a1eec30946b708c209981a5c07830fd726b3e25530200000000fdffffffe635a5d14ea5eb63d455948c0894d61ac35f7ba00f260f128b725f25855bd6550400000000fdffffff03400caa3b00000000220020701a8d401c84fb13e6baf169d59684e17abd9fa216c8cc5b9fc63d622ff8c58d886c5e1b000000002200200a618b712d918bb1ba59b737c2a37b40d557374754ef2575ce41d08d5f782df980960d04000000002200202122f4719add322f4d727f48379f8a8ba36a40ec4473fd99a2fdcfd89a16e048040047304402202c0be2d56da6f551b92e657a1f29bc410f244d68063bbc14297bae318d06a32d0220276ddf6da48d0dfdc717974aee32b94a45867393a663df8bc1e8382e1f7d9989014730440220649a73751ad934c9e517022bc8b510d53474772286e5678227ae71837ec0307d022031ec829069c7ab474759741c6acd1efb7e0918d5d63e4fbd1071ce3ea1bfc6ec01695221022dfa322241a4946b9ead36ab9c8c55bd4c4340a1290b5bf71d23a695aeb1240a21034d82610a17c332852205e063c64fee21a77fabc7ac0e6d7ada2a820922c9a5dc2103c96d495bfdd5ba4145e3e046fee45e84a8a48ad05bd8dbb395c011a32cf9f88053ae040047304402207361009ec2357c8d9f178a79772715d29308f1c265bf3c31f083d9253dcedd3c02203fbe90a73f2ca763233cacd9f6be1ebc24abdeff928d5ad454c6fd50b9bc869d014730440220416d0e1acfd95024dc31bc534fee0662ffd906dba98040ac4ed039bf4451176d02203b9416a93b4a116f4edcbfd256e5f232bc9b9f12f6270e84e23597ce68f24ca201695221022dfa322241a4946b9ead36ab9c8c55bd4c4340a1290b5bf71d23a695aeb1240a21034d82610a17c332852205e063c64fee21a77fabc7ac0e6d7ada2a820922c9a5dc2103c96d495bfdd5ba4145e3e046fee45e84a8a48ad05bd8dbb395c011a32cf9f88053ae00000000",
      network: Network.MAINNET,
      inputs: [
        {
          // https://mempool.space/tx/53253e6b72fd3078c0a58199208c706b9430ec1e3aa2bdef5d385c97ace32b2b#flow=&vout=2
          txid: "53253e6b72fd3078c0a58199208c706b9430ec1e3aa2bdef5d385c97ace32b2b",
          vout: 2,
          value: "932049200",
          sequence: 4294967293,
        },
        {
          // https://mempool.space/tx/55d65b85255f728b120f260fa07b5fc31ad694088c9455d463eba54ed1a535e6#flow=&vout=4
          txid: "55d65b85255f728b120f260fa07b5fc31ad694088c9455d463eba54ed1a535e6",
          vout: 4,
          value: "596144040",
          sequence: 4294967293,
        },
      ],
      availableUtxos: [
        // (Original Input) https://mempool.space/tx/53253e6b72fd3078c0a58199208c706b9430ec1e3aa2bdef5d385c97ace32b2b#flow=&vout=2
        {
          txid: "53253e6b72fd3078c0a58199208c706b9430ec1e3aa2bdef5d385c97ace32b2b",
          vout: 2,
          value: "932049200",
          witnessUtxo: {
            script: Buffer.from(
              "00202122f4719add322f4d727f48379f8a8ba36a40ec4473fd99a2fdcfd89a16e048",
              "hex",
            ),
            value: 932049200,
          },
          prevTxHex:
            "010000000145a8a366f1e073e4e1a03172b95e7db2f006d710d3585e5d14a137c218bf90ed03000000fc00473044022056da571c657d063d18217cb3d2cdb827d11fdd0fdef9ffc0ef69345628c0da260220092f7fe2b2d2cba7d1f4d53f0fb7db54dd15c6b8aac2f8e66102778aac0a62250147304402200bf2e4c82a2337168b7370deae483c88521367da8415c65ffa24b21ba4b13a7f02207a946b5c0f9f9213be130022d83f2ee91363c08de8cd2460765e020f59a3399a014c695221026fcec918a19aad4c92527f4bad924c7cc8dfdba935418f3ce217c1c839a58b952103c96d495bfdd5ba4145e3e046fee45e84a8a48ad05bd8dbb395c011a32cf9f8802103d1fc482d299248b97e38d9042a068eb102818a3556d5247d080849a0880a9e2653aefdffffff03400caa3b000000002200203eb5062a0b0850b23a599425289a091c374ca934101d03144f060c5b46a979be181d1a1a000000002200200a618b712d918bb1ba59b737c2a37b40d557374754ef2575ce41d08d5f782df930f18d37000000002200202122f4719add322f4d727f48379f8a8ba36a40ec4473fd99a2fdcfd89a16e04800000000",
        },
        {
          // (Original Input 2)  https://mempool.space/tx/55d65b85255f728b120f260fa07b5fc31ad694088c9455d463eba54ed1a535e6#flow=&vout=4
          txid: "55d65b85255f728b120f260fa07b5fc31ad694088c9455d463eba54ed1a535e6",
          vout: 4,
          value: "596144040",
          witnessUtxo: {
            script: Buffer.from(
              "00202122f4719add322f4d727f48379f8a8ba36a40ec4473fd99a2fdcfd89a16e048",
              "hex",
            ),
            value: 596144040,
          },
          prevTxHex:
            "010000000145a8a366f1e073e4e1a03172b95e7db2f006d710d3585e5d14a137c218bf90ed05000000fc004730440220414f5352d874fad4171326bdc563f2724eadbbe8e3199fbc83f9d6d04dc02176022072ec117a06d340209b44cef533d1a2f21c0ace64f653f454e745add290938e53014730440220367ff913573c50706003423b47648553730d0377c7707e505d1a4f9a08313ab6022073fad7c23abeb4ca1d48075bd276c7a5aa7b0d942ad741c9a8a4233a264f2df1014c695221026fcec918a19aad4c92527f4bad924c7cc8dfdba935418f3ce217c1c839a58b952103c96d495bfdd5ba4145e3e046fee45e84a8a48ad05bd8dbb395c011a32cf9f8802103d1fc482d299248b97e38d9042a068eb102818a3556d5247d080849a0880a9e2653aefdffffff05400caa3b000000002200200a618b712d918bb1ba59b737c2a37b40d557374754ef2575ce41d08d5f782df90084d71700000000220020701a8d401c84fb13e6baf169d59684e17abd9fa216c8cc5b9fc63d622ff8c58d0084d71700000000220020701a8d401c84fb13e6baf169d59684e17abd9fa216c8cc5b9fc63d622ff8c58d3819b1110000000022002014b288dca5d59caa8868d1668c97c971e58ab3ccf10534ac567ea51aa8aba299a86f8823000000002200202122f4719add322f4d727f48379f8a8ba36a40ec4473fd99a2fdcfd89a16e04800000000",
        },
        {
          // extra UTXO , NOT IN ORIGINAL TX
          // https://mempool.space/tx/55d65b85255f728b120f260fa07b5fc31ad694088c9455d463eba54ed1a535e6#flow=&vout=3
          txid: "55d65b85255f728b120f260fa07b5fc31ad694088c9455d463eba54ed1a535e6",
          vout: 3,
          value: "‎296819000",
          witnessUtxo: {
            script: Buffer.from(
              "002014b288dca5d59caa8868d1668c97c971e58ab3ccf10534ac567ea51aa8aba299",
              "hex",
            ),
            value: 296819000,
          },
          prevTxHex:
            "010000000145a8a366f1e073e4e1a03172b95e7db2f006d710d3585e5d14a137c218bf90ed05000000fc004730440220414f5352d874fad4171326bdc563f2724eadbbe8e3199fbc83f9d6d04dc02176022072ec117a06d340209b44cef533d1a2f21c0ace64f653f454e745add290938e53014730440220367ff913573c50706003423b47648553730d0377c7707e505d1a4f9a08313ab6022073fad7c23abeb4ca1d48075bd276c7a5aa7b0d942ad741c9a8a4233a264f2df1014c695221026fcec918a19aad4c92527f4bad924c7cc8dfdba935418f3ce217c1c839a58b952103c96d495bfdd5ba4145e3e046fee45e84a8a48ad05bd8dbb395c011a32cf9f8802103d1fc482d299248b97e38d9042a068eb102818a3556d5247d080849a0880a9e2653aefdffffff05400caa3b000000002200200a618b712d918bb1ba59b737c2a37b40d557374754ef2575ce41d08d5f782df90084d71700000000220020701a8d401c84fb13e6baf169d59684e17abd9fa216c8cc5b9fc63d622ff8c58d0084d71700000000220020701a8d401c84fb13e6baf169d59684e17abd9fa216c8cc5b9fc63d622ff8c58d3819b1110000000022002014b288dca5d59caa8868d1668c97c971e58ab3ccf10534ac567ea51aa8aba299a86f8823000000002200202122f4719add322f4d727f48379f8a8ba36a40ec4473fd99a2fdcfd89a16e04800000000",
        },
      ],
      dustThreshold: "546",
      targetFeeRate: 80, // original was 60 sat/vB
      scriptType: SCRIPT_TYPES.P2WSH,
      requiredSigners: 2,
      totalSigners: 3,
      cancelAddress:
        "bc1qyy30guv6m5ez7ntj0ayr08u23w3k5s8vg3elmxdzlh8a3xskupyqn2lp5w", // https://mempool.space/address/bc1qyy30guv6m5ez7ntj0ayr08u23w3k5s8vg3elmxdzlh8a3xskupyqn2lp5w
      expected: {
        inputCount: 1,
        outputCount: 1,
        fee: "20880", // absolute fees of tx
        expectedfee: "21228", // rationalized above
        feeRate: 133.509, // rationalized above
      },
    },
  ],

  acceleratedRbf: [
    {
      /*
     ====================================== IMPORTANT ====================================
     We consider the same tx we considered above but here we instead of cancellation we consider the case where we accelerate the tx using the existing input and any additional
     input that we may add....
     Original Transaction:
       - Type: P2WSH (Pay-to-Witness-Script-Hash)
       - Inputs: 2
       - Outputs: 3
       - Fee: 20,880 satoshis
       - Size: 348 vBytes
       - Fee Rate: 60 sat/vB (20,880 / 348)

       Accelerated RBF Scenario:
       1. Target Fee Rate: 80 sat/vB (increased from original 60 sat/vB)
       2. The accelerated tx maintains the original output structure but increases the fee
       3. Estimated new tx size: 498 vBytes (may vary slightly based on input/output changes)

       RBF Fee Calculation:
       - Minimum required fee: 20,880 satoshis (must be >= original fee to satisfy RBF rule #3)
       - Target fee for new size: 39,840 satoshis (498 vBytes * 80 sat/vB)
       - Actual fee to pay: 39,840 satoshis (higher of the two above values)
     */

      // https://mempool.space/tx/be81b81620702718957d445611066bd596fe1840e219b84f6ea60e0114a7a305
      case: "Create a valid accelerated RBF transaction",
      originalTx:
        "010000000001022b2be3ac975c385defbda23a1eec30946b708c209981a5c07830fd726b3e25530200000000fdffffffe635a5d14ea5eb63d455948c0894d61ac35f7ba00f260f128b725f25855bd6550400000000fdffffff03400caa3b00000000220020701a8d401c84fb13e6baf169d59684e17abd9fa216c8cc5b9fc63d622ff8c58d886c5e1b000000002200200a618b712d918bb1ba59b737c2a37b40d557374754ef2575ce41d08d5f782df980960d04000000002200202122f4719add322f4d727f48379f8a8ba36a40ec4473fd99a2fdcfd89a16e048040047304402202c0be2d56da6f551b92e657a1f29bc410f244d68063bbc14297bae318d06a32d0220276ddf6da48d0dfdc717974aee32b94a45867393a663df8bc1e8382e1f7d9989014730440220649a73751ad934c9e517022bc8b510d53474772286e5678227ae71837ec0307d022031ec829069c7ab474759741c6acd1efb7e0918d5d63e4fbd1071ce3ea1bfc6ec01695221022dfa322241a4946b9ead36ab9c8c55bd4c4340a1290b5bf71d23a695aeb1240a21034d82610a17c332852205e063c64fee21a77fabc7ac0e6d7ada2a820922c9a5dc2103c96d495bfdd5ba4145e3e046fee45e84a8a48ad05bd8dbb395c011a32cf9f88053ae040047304402207361009ec2357c8d9f178a79772715d29308f1c265bf3c31f083d9253dcedd3c02203fbe90a73f2ca763233cacd9f6be1ebc24abdeff928d5ad454c6fd50b9bc869d014730440220416d0e1acfd95024dc31bc534fee0662ffd906dba98040ac4ed039bf4451176d02203b9416a93b4a116f4edcbfd256e5f232bc9b9f12f6270e84e23597ce68f24ca201695221022dfa322241a4946b9ead36ab9c8c55bd4c4340a1290b5bf71d23a695aeb1240a21034d82610a17c332852205e063c64fee21a77fabc7ac0e6d7ada2a820922c9a5dc2103c96d495bfdd5ba4145e3e046fee45e84a8a48ad05bd8dbb395c011a32cf9f88053ae00000000",
      network: Network.MAINNET,
      inputs: [
        {
          // https://mempool.space/tx/53253e6b72fd3078c0a58199208c706b9430ec1e3aa2bdef5d385c97ace32b2b#flow=&vout=2
          txid: "53253e6b72fd3078c0a58199208c706b9430ec1e3aa2bdef5d385c97ace32b2b",
          vout: 2,
          value: "932049200",
          sequence: 4294967293,
        },
        {
          // https://mempool.space/tx/55d65b85255f728b120f260fa07b5fc31ad694088c9455d463eba54ed1a535e6#flow=&vout=4
          txid: "55d65b85255f728b120f260fa07b5fc31ad694088c9455d463eba54ed1a535e6",
          vout: 4,
          value: "596144040",
          sequence: 4294967293,
        },
      ],
      availableUtxos: [
        // (Original Input 1) https://mempool.space/tx/53253e6b72fd3078c0a58199208c706b9430ec1e3aa2bdef5d385c97ace32b2b#flow=&vout=2
        {
          txid: "53253e6b72fd3078c0a58199208c706b9430ec1e3aa2bdef5d385c97ace32b2b",
          vout: 2,
          value: "932049200",
          witnessUtxo: {
            script: Buffer.from(
              "00202122f4719add322f4d727f48379f8a8ba36a40ec4473fd99a2fdcfd89a16e048",
              "hex",
            ),
            value: 932049200,
          },
          prevTxHex:
            "010000000145a8a366f1e073e4e1a03172b95e7db2f006d710d3585e5d14a137c218bf90ed03000000fc00473044022056da571c657d063d18217cb3d2cdb827d11fdd0fdef9ffc0ef69345628c0da260220092f7fe2b2d2cba7d1f4d53f0fb7db54dd15c6b8aac2f8e66102778aac0a62250147304402200bf2e4c82a2337168b7370deae483c88521367da8415c65ffa24b21ba4b13a7f02207a946b5c0f9f9213be130022d83f2ee91363c08de8cd2460765e020f59a3399a014c695221026fcec918a19aad4c92527f4bad924c7cc8dfdba935418f3ce217c1c839a58b952103c96d495bfdd5ba4145e3e046fee45e84a8a48ad05bd8dbb395c011a32cf9f8802103d1fc482d299248b97e38d9042a068eb102818a3556d5247d080849a0880a9e2653aefdffffff03400caa3b000000002200203eb5062a0b0850b23a599425289a091c374ca934101d03144f060c5b46a979be181d1a1a000000002200200a618b712d918bb1ba59b737c2a37b40d557374754ef2575ce41d08d5f782df930f18d37000000002200202122f4719add322f4d727f48379f8a8ba36a40ec4473fd99a2fdcfd89a16e04800000000",
        },
        {
          // (Original Input 2)  https://mempool.space/tx/55d65b85255f728b120f260fa07b5fc31ad694088c9455d463eba54ed1a535e6#flow=&vout=4
          txid: "55d65b85255f728b120f260fa07b5fc31ad694088c9455d463eba54ed1a535e6",
          vout: 4,
          value: "596144040",
          witnessUtxo: {
            script: Buffer.from(
              "00202122f4719add322f4d727f48379f8a8ba36a40ec4473fd99a2fdcfd89a16e048",
              "hex",
            ),
            value: 596144040,
          },
          prevTxHex:
            "010000000145a8a366f1e073e4e1a03172b95e7db2f006d710d3585e5d14a137c218bf90ed05000000fc004730440220414f5352d874fad4171326bdc563f2724eadbbe8e3199fbc83f9d6d04dc02176022072ec117a06d340209b44cef533d1a2f21c0ace64f653f454e745add290938e53014730440220367ff913573c50706003423b47648553730d0377c7707e505d1a4f9a08313ab6022073fad7c23abeb4ca1d48075bd276c7a5aa7b0d942ad741c9a8a4233a264f2df1014c695221026fcec918a19aad4c92527f4bad924c7cc8dfdba935418f3ce217c1c839a58b952103c96d495bfdd5ba4145e3e046fee45e84a8a48ad05bd8dbb395c011a32cf9f8802103d1fc482d299248b97e38d9042a068eb102818a3556d5247d080849a0880a9e2653aefdffffff05400caa3b000000002200200a618b712d918bb1ba59b737c2a37b40d557374754ef2575ce41d08d5f782df90084d71700000000220020701a8d401c84fb13e6baf169d59684e17abd9fa216c8cc5b9fc63d622ff8c58d0084d71700000000220020701a8d401c84fb13e6baf169d59684e17abd9fa216c8cc5b9fc63d622ff8c58d3819b1110000000022002014b288dca5d59caa8868d1668c97c971e58ab3ccf10534ac567ea51aa8aba299a86f8823000000002200202122f4719add322f4d727f48379f8a8ba36a40ec4473fd99a2fdcfd89a16e04800000000",
        },
        {
          // extra UTXO , NOT IN ORIGINAL TX
          // https://mempool.space/tx/55d65b85255f728b120f260fa07b5fc31ad694088c9455d463eba54ed1a535e6#flow=&vout=3
          txid: "55d65b85255f728b120f260fa07b5fc31ad694088c9455d463eba54ed1a535e6",
          vout: 3,
          value: "29681900",
          witnessUtxo: {
            script: Buffer.from(
              "002014b288dca5d59caa8868d1668c97c971e58ab3ccf10534ac567ea51aa8aba299",
              "hex",
            ),
            value: 29681900,
          },
          prevTxHex:
            "010000000145a8a366f1e073e4e1a03172b95e7db2f006d710d3585e5d14a137c218bf90ed05000000fc004730440220414f5352d874fad4171326bdc563f2724eadbbe8e3199fbc83f9d6d04dc02176022072ec117a06d340209b44cef533d1a2f21c0ace64f653f454e745add290938e53014730440220367ff913573c50706003423b47648553730d0377c7707e505d1a4f9a08313ab6022073fad7c23abeb4ca1d48075bd276c7a5aa7b0d942ad741c9a8a4233a264f2df1014c695221026fcec918a19aad4c92527f4bad924c7cc8dfdba935418f3ce217c1c839a58b952103c96d495bfdd5ba4145e3e046fee45e84a8a48ad05bd8dbb395c011a32cf9f8802103d1fc482d299248b97e38d9042a068eb102818a3556d5247d080849a0880a9e2653aefdffffff05400caa3b000000002200200a618b712d918bb1ba59b737c2a37b40d557374754ef2575ce41d08d5f782df90084d71700000000220020701a8d401c84fb13e6baf169d59684e17abd9fa216c8cc5b9fc63d622ff8c58d0084d71700000000220020701a8d401c84fb13e6baf169d59684e17abd9fa216c8cc5b9fc63d622ff8c58d3819b1110000000022002014b288dca5d59caa8868d1668c97c971e58ab3ccf10534ac567ea51aa8aba299a86f8823000000002200202122f4719add322f4d727f48379f8a8ba36a40ec4473fd99a2fdcfd89a16e04800000000",
        },
      ],
      dustThreshold: "546",
      targetFeeRate: 80, // original was 60 sat/vB
      scriptType: SCRIPT_TYPES.P2WSH,
      requiredSigners: 2,
      totalSigners: 3,
      changeAddress:
        "bc1qyy30guv6m5ez7ntj0ayr08u23w3k5s8vg3elmxdzlh8a3xskupyqn2lp5w", // https://mempool.space/address/bc1qyy30guv6m5ez7ntj0ayr08u23w3k5s8vg3elmxdzlh8a3xskupyqn2lp5w
      expected: {
        inputCount: 3, // 2 inputs + 1 extra UTXO added for fees
        outputCount: 4, //  3 original + 1 change output
        fee: "20880", // absolute fees of tx
        expectedfee: "39760", // rationalized above
        feeRate: 80, // rationalized above
      },
    },
  ],
  fullRbf: [
    // Mempool link: https://mempool.space/tx/544ddde5c6f3cbdbeb17bffe0d3da28025d220c5de959448c81abc2166296395
    {
      case: "Create a valid full RBF transaction",
      originalTx:
        "02000000000102eafd0b87e19b30b6ff189c01df0593cbb86824db523cf7d59273a7095f0ce7830000000000ffffffffc99adaea9a81d557af38d10d716355b4a28cbe1a703aaefdb54e58bca8f21cb70000000000ffffffff01029c0000000000001976a914c9b40cb7a7b0efa94667365218e0f230c13f316288ac02473044022029bf4acabc50e54387f5f195bc1c33096acb3c268c6db43e0126e062e4ea5b3702200f40e116decb763f28f44904f1f29677a87e0daaaec5a6b05961d9e2fb23560e012102dc4e1a0c6ef83097f938b94af31d451ac08543e12e8da6debef598a390186dff024730440220500ec8cd1e79c977c8c2ec77b573ccd570e77adefd03402538ebad57a37663e802204db691201a4fb8fe2cbd553837875d31afad0102e34e349975034ed0fe23594b012102dc4e1a0c6ef83097f938b94af31d451ac08543e12e8da6debef598a390186dff00000000",
      network: Network.MAINNET,
      inputs: [
        {
          txid: "83e70c5f09a77392d5f73c52db2468b8cb9305df019c18ffb6309be1870bfdea",
          vout: 0,
          value: "20688",
        },
        {
          txid: "b71cf2a8bc584eb5fdae3a701abe8ca2b45563710dd138af57d5819aeada9ac9",
          vout: 0,
          value: "20155",
        },
      ],
      availableUtxos: [
        {
          // https://mempool.space/tx/83e70c5f09a77392d5f73c52db2468b8cb9305df019c18ffb6309be1870bfdea#flow=&vout=0
          txid: "83e70c5f09a77392d5f73c52db2468b8cb9305df019c18ffb6309be1870bfdea",
          vout: 0,
          value: "20688",
          witnessUtxo: {
            script: Buffer.from(
              "001481f45ed53f6b1f8b7b3f95fb1a84c69a13292c8f",
              "hex",
            ),
            value: 20688,
          },
          prevTxHex:
            "0200000000010147e243e98a006c0bdc369912c899819d15cd95f3c58156fe1095e42155fb6f770100000000fdffffff02c39902000000000016001443ae9d3e5ffac83b8df0512b61d0fda041be2b41f8ee1b000000000017a9148965f77e0e88df82a5ac8406dc8b98d102295411870247304402200ea276530bc577be36a20da72fb7eb5965cfdb13db6328bcc1f5c3a5f9a99ff3022059fe09156729d620b78a2ea13debec73461ab76260c9b9afe45b163b23f6aad901210335ec3d15bb90b22c11d2ef5010a84dfa8323c85d1c652fceba15d25e5ed63443431b0d00",
        },

        // Additional UTXO for potential fee increase
        {
          // extra UTXO (dummy)
          // https://mempool.space/tx/6bec655fc52d4e0b6930321e016055e6cc87f170916d4c4ef5a030fad41a8845
          txid: "6bec655fc52d4e0b6930321e016055e6cc87f170916d4c4ef5a030fad41a8845",
          vout: 0,
          value: "316200",
          witnessUtxo: {
            script: Buffer.from(
              "0014f98f41f4f2f231524a72a9994e9b996b381473f2",
              "hex",
            ),
            value: 316200,
          },
          prevTxHex:
            "020000000001014b653447f713b3eed5db67f18288e4f6f7791f0a75e9ec303432a9f77a3fc5c30000000023220020ba9745bcea3477666c9b0f45612922fdc722bd17fcd1f4bbbf75bad2fda96d3afdffffff0228d3040000000000160014f98f41f4f2f231524a72a9994e9b996b381473f2e23599000000000017a9148e4bd93ba6fa094bdd98305c51fa9bd4d8878b1f87040047304402204d4cf3e606ab2533af37065c2827d878d05a92aa51c3bb9f6a8da0afa91a0a6d02200d02d6db146adf7bf253ab0325293cfb14469c7e49ba49678955550d0df16e2f01473044022015b29bb7e3cf3fc5feeef71494703b2446e144b8817101afc897cfe6d2c73ca6022042eb0bf6f384ddc1eeae394872f4d9659a3299bb8a37e52ea0b7b585868b3a80014752210303b89234c6487d64450b96e2df0e56c92e6ac0519f1efe1c965a175f5c112920210389ad75f5eb174ebd8b58ae87ea774bdd613131bdad23ccd4ee1e73cdf7cfb4b052aed6280d00",
        },
      ] as UTXO[],
      dustThreshold: "546",
      targetFeeRate: 6,
      scriptType: SCRIPT_TYPES.P2SH_P2WSH,
      requiredSigners: 1,
      totalSigners: 1,
      changeAddress: "bc1q7y50e8culkenu3tnn66ly6gq9m43y8ymk70k8z",
      fullRBF: true,
      expected: {
        inputCount: 2,
        outputCount: 2,
        fee: "905",
        expectedFee: "1357",
        feeRate: 6.029,
      },
    },
  ],
  invalidCases: [
    {
      case: "Throw error when inputs are insufficient for fees",
      originalTx:
        "02000000000101d6e4be83f8eacd781ae5f757bb0e74a771875cf4f6c03a8c9c378c3e62bd7e7f0000000000fdffffff029c120000000000001600142dc1c9f7da43cc0205a2f2c94bd337799ac0a0c99c120000000000001600142dc1c9f7da43cc0205a2f2c94bd337799ac0a0c902483045022100aa46010e8dcaad8056964dad2b0d2fbfd9a19782d76a3f46b8bf8a5285efa79302204f340cd906a8119455b7432edfa9545cbe9b5b2178eef89f58c3da37f2b5e92e0121030b0a5094d100125de30f1526776b7e6cfc428a07711cc0985a145ae0718e2a0c00000000",
      availableUtxos: [
        {
          txid: "7f7ebd623e8c379c8c3ac0f6f45c8771a7740ebb57f7e51a78cdeaf883bee4d6",
          vout: 0,
          value: "100",
          witnessUtxo: {
            script: Buffer.from(
              "0014dc9abb9f0536f8ce517a248da673476a48a384f3",
              "hex",
            ),
            value: 100,
          },
        },
      ],
      network: Network.MAINNET,
      dustThreshold: "546",
      scriptType: SCRIPT_TYPES.P2SH,
      requiredSigners: 1,
      totalSigners: 1,
      targetFeeRate: 10,
      absoluteFee: "1229",
      changeAddress: "bc1q7y50e8culkenu3tnn66ly6gq9m43y8ymk70k8z",
      expectedError:
        "Failed to create a valid accelerated RBF transaction. Ensure all inputs and outputs are valid and fee requirements are met.",
    },
  ],
};
