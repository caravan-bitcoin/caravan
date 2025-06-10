import { Network } from "@caravan/bitcoin";

import { SCRIPT_TYPES } from "../types";

/**
 *
 * This fixture tests our fee-bumping functionality to make sure it properly reconstructs
 * PSBTs (Partially Signed Bitcoin Transactions) when users want to speed up their transactions.
 *
 * How the testing works:
 *
 * 1. We start with an original transaction that's already been created (see the commented
 *    PSBT data above each test case)
 *
 * 2. Our fee-bumping function takes this original transaction data plus some available
 *    UTXOs ( if provided ) and tries to create a new, higher-fee version
 *
 * 3. The "expected.exactPsbt" field contains what we should get back from our fee-bumping
 *    function - this is the new PSBT with higher fees
 *
 * What we're actually testing:
 * - That all the original inputs are preserved with their witness data intact
 * - That additional inputs are added if needed to cover the higher fees
 * - That output scripts are maintained correctly (values might change due to fee adjustments)
 * - That the overall PSBT structure follows the BIP 370 standards
 *
 * What we're NOT testing here:
 * - Fee calculation logic (that's covered in separate tests)
 *
 * Pro tip: You can paste any of these PSBTs into BIP370.org to inspect them visually
 * and verify they're valid. All PSBTs in this fixture use version 2 format.
 *
 * The test methodology is straightforward - we just want to ensure that given proper
 * input data, our fee-bumping function outputs a well-formed PSBT that maintains all
 * the necessary transaction components while properly adjusting for the new fee rate.
 */

export const exactRbfFixtures = {
  acceleratedRbf: [
    {
      case: "Fee bump with same inputs/outputs, adjusted change (P2WSH 2-of-3) - P2WSH 2-of-3 multisig",
      // Original Tx PSBT :
      /*
      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
      */
      originalTx:
        "01000000000102132ddf1d15736ba46e9778168f0ba65bb0e173b27b34c174ce5dc2b9201d57500000000000fdffffffd001177efb2251e15b17dfe1669d906d691c32d9c86e994474c89323154f84950100000000fdffffff0200e1f50500000000160014f8bd9b6d2741f079113f751c5c756ff805c0211d6b53eb0b000000002200206d720663dc9016e931d5234e7de17faceec3c0eb7f77ab84a4a8dc666d3dbff704004730440220294d53645f7aabfc6e940442cf536ed67f274ce29697d5f7b00d0bd3c51876c3022017a0251076661f4a6c8ef5921193dcafac39fc2e42d34baf857dc505a5d9190e01473044022032a9a676e9c83b2b50671b80d03bbb0b1054d9f64dfe04902f4182f76d2bcb4602205c64cde06a49b47c30f30bc7082741ef38fa8d447db146e45111047df3c23a870169522102791957c47fcce036565659f76a5f377a3b7d5806f042fe4a6811ba0a85ec3fc1210353c760fc48667f7ba5979393c6bda08459ff4827537e6320d3d1828c5aed7498210377fec04c1e9a998676c888c4b5631afd492fd223a0f2ec41292cc0bb2f525fff53ae04004730440220497d14e996077988bf6d58a56c167fa19dd0ca38865d3944d2ef83eb00668e8102202159a2ef75b592c41c3b41c50097e9ad6124ed6202736e7d77ec8b483daeff4501473044022057943714c6e90b58349f9fbf9063a16bf333ebee79ff04462912b35d380af103022047e7ac4dcdfcefe68332eaa27f8469e7bcca6e91f758e4e05adbe30351c282f201695221026e412ed0ccbd60b6acae71a782ad3d2013fb4a4f283e1a942060fa46b874696f210288b0853d5d085d1bf4c59c7f23a4ee6970f51dad593011d1c304e7c424672ab02102d2879588cc0da1a2441707fa6eb4842ffdcb482b91e5596465737a10b61e50b653ae00000000",
      availableUtxos: [
        {
          txid: "50571d20b9c25dce74c1347bb273e1b05ba60b8f1678976ea46b73151ddf2d13",
          vout: 0,
          value: "199971998",
          sequence: 0xfffffffd,
          prevTxHex:
            "02000000000101a47852fc9388d8ac67f00147c3f99c1f92cd0926c199e8ceff1efe5b162356290100000000fdffffff019e54eb0b0000000022002056fd37fd8671c575cade4d7291c571c2e8c7d346d33852b901fce54acaf25d01040047304402200beca4154913645e3f128a1b5020093de4a032e2623f3c6f32599c8f1e367d0b022039d57a70fd10beefe7850c488dfd40ec71456d7c5e86e5de3d9a91afe1f534160147304402207708e71aec3b6464e1201268b426c47466ec517dcf93274e2a4a812436c791ec022036ea50864dcb463a4bb20cc65ccac5e95914a60e915ad247f6e6ab8de67d89ea01695221027d988ff1536a0eb7c78d11982966df3fa98877f34937614d784a55042cf2250b2103909dad87cabab23f05641975d8b312eb95c44a9ab952b9162499121f4c28f1cf2103f067679d2c414576cb568f06d801ed99d101e0842fbb588d3a4de49a683bdd7a53ae00000000",
          witnessUtxo: {
            script: Buffer.from(
              "9e54eb0b0000000022002056fd37fd8671c575cade4d7291c571c2e8c7d346d33852b901fce54acaf25d01",
              "hex",
            ),
            value: 199971998,
          },
          witnessScript: Buffer.from(
            "522102791957c47fcce036565659f76a5f377a3b7d5806f042fe4a6811ba0a85ec3fc1210353c760fc48667f7ba5979393c6bda08459ff4827537e6320d3d1828c5aed7498210377fec04c1e9a998676c888c4b5631afd492fd223a0f2ec41292cc0bb2f525fff53ae",
            "hex",
          ),
          bip32Derivations: [
            {
              pubkey: Buffer.from(
                "02791957c47fcce036565659f76a5f377a3b7d5806f042fe4a6811ba0a85ec3fc1",
                "hex",
              ),
              masterFingerprint: Buffer.from("739b19a7", "hex"),
              path: "m/84'/1'/0'/0/9",
            },
            {
              pubkey: Buffer.from(
                "0353c760fc48667f7ba5979393c6bda08459ff4827537e6320d3d1828c5aed7498",
                "hex",
              ),
              masterFingerprint: Buffer.from("ce216582", "hex"),
              path: "m/84'/1'/0'/0/9",
            },
            {
              pubkey: Buffer.from(
                "0377fec04c1e9a998676c888c4b5631afd492fd223a0f2ec41292cc0bb2f525fff",
                "hex",
              ),
              masterFingerprint: Buffer.from("c73a4236", "hex"),
              path: "m/84'/1'/0'/0/9",
            },
          ],
        },
        {
          txid: "95844f152393c87444996ec8d9321c696d909d66e1df175be15122fb7e1701d0",
          vout: 1,
          value: "100000000",
          sequence: 0xfffffffd,
          prevTxHex:
            "02000000000102f44fc7a47e15eebfcd0b06d1aced4caae7023e280369df9e4fb144999a6b57610000000000fdffffffa47852fc9388d8ac67f00147c3f99c1f92cd0926c199e8ceff1efe5b162356290000000000fdffffff0256f6dc03030000002251200b8d9791dbbe30b2c93b3a3d0c1702632ddf8e8b847fc86b3d204d7663603dc700e1f50500000000220020620ce1d8d2f815c9d81ff4959a6d85c43683e00491da8ad4d5fa2620c3ddee88014008ed462ac65fb52f84e6640f4e2fe6775425063f178d48adf0fc01df2b57ac1694a8a76d9f5a9a2cedc2b79cb3c62429690b796bf9b2d57a5f29f1c65f1c1241014071ce2fff1a4676c29756f211aa9ed6b24eb832e16d11afb54f5f4dcd41a67f01159028f4e4374c4c65ccb590df5f0d398fa4f6df6b443532800ca1c32bba935d49040000",
          witnessUtxo: {
            script: Buffer.from(
              "00e1f50500000000220020620ce1d8d2f815c9d81ff4959a6d85c43683e00491da8ad4d5fa2620c3ddee88",
              "hex",
            ),
            value: 199971998,
          },
          witnessScript: Buffer.from(
            "522102791957c47fcce036565659f76a5f377a3b7d5806f042fe4a6811ba0a85ec3fc1210353c760fc48667f7ba5979393c6bda08459ff4827537e6320d3d1828c5aed7498210377fec04c1e9a998676c888c4b5631afd492fd223a0f2ec41292cc0bb2f525fff53ae",
            "hex",
          ),
          bip32Derivations: [
            {
              pubkey: Buffer.from(
                "026e412ed0ccbd60b6acae71a782ad3d2013fb4a4f283e1a942060fa46b874696f",
                "hex",
              ),
              masterFingerprint: Buffer.from("c73a4236", "hex"),
              path: "m/84'/1'/0'/0/8",
            },
            {
              pubkey: Buffer.from(
                "0288b0853d5d085d1bf4c59c7f23a4ee6970f51dad593011d1c304e7c424672ab0",
                "hex",
              ),
              masterFingerprint: Buffer.from("ce216582", "hex"),
              path: "m/84'/1'/0'/0/8",
            },
            {
              pubkey: Buffer.from(
                "02d2879588cc0da1a2441707fa6eb4842ffdcb482b91e5596465737a10b61e50b6",
                "hex",
              ),
              masterFingerprint: Buffer.from("c73a4236", "hex"),
              path: "m/84'/1'/0'/0/8",
            },
          ],
        },
      ],
      network: Network.REGTEST,
      dustThreshold: "546",
      scriptType: SCRIPT_TYPES.P2WSH,
      changeIndex: 1, // as here we know that we have changeAddress in that index and we'd like to just deduct extra fees from it ...
      requiredSigners: 2,
      totalSigners: 3,
      absoluteFee: "307",
      targetFeeRate: 32.75,
      expected: {
        inputCount: 2,
        outputCount: 2,
        // PSBT we get after fee-bumping the tx
        exactPsbt:
          "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",
      },
    },
    {
      case: "Using additional UTXO to fee-bump #2 - P2WSH 2-of-3 multisig",
      // Original Tx PSBT :
      /*
      cHNidP8BAFIBAAAAARTtzEmIFjA7fDVgKV/F4PWYjcawpsgiFq5tS+l3cd7zAAAAAAD9////Acra9QUAAAAAFgAUcyWQwbPabYuqsFLe91C46YVmKfsAAAAAAAEA/TgBAgAAAAABAqdjQ9EWv5Ja93rfBiREDc/UW4b1klRmKdsrU+RKS508AAAAAAD9////yCenibwvP/EceIphKV1pN1BeJsysrUO+yE55FE9J6OQBAAAAAP3///8CAOH1BQAAAAAiACC5z1FtnDj0lAu/qziPteNV82zYRjccTfcUrwzIt36bFjZvkwMAAAAAIlEgfi0QliD//RNQ2IVPPdvH7BI8WJ3VYpXFzzEg8MdAQIoBQC+qKC+s0VCHv4ROX2LAUYDxqqca1P1Erl6IHKEPzDXwmWX5TwqiGoiHkv/s2OOdAx8IYDhhkWOAoKefcrhR0lwBQPtMqy8ryIE/IgxEiZTqbP/hjZC1qOtDNxJaPqSKlGxiP2ciRQVeP3sGI1rkw54NR88d9yodpEe0FexJm5HKmTAAAAAAAQErAOH1BQAAAAAiACC5z1FtnDj0lAu/qziPteNV82zYRjccTfcUrwzIt36bFgEFaVIhAoNvRDkjA6G4+RLoFfoaB+rf2/I6r0meYXSiRuCvRSAhIQMWRkHRnb52HPoyeQ0sO8/p6EmpkZ8Cef/h2VgGtN0tgiEDkddaNIS97wNN7v93emPVauEIxx0Tjfmd6h6lkk/SrZ1TriIGAoNvRDkjA6G4+RLoFfoaB+rf2/I6r0meYXSiRuCvRSAhGMc6QjZUAACAAQAAgAAAAIAAAAAACgAAACIGAxZGQdGdvnYc+jJ5DSw7z+noSamRnwJ5/+HZWAa03S2CGHObGadUAACAAQAAgAAAAIAAAAAACgAAACIGA5HXWjSEve8DTe7/d3pj1WrhCMcdE435neoepZJP0q2dGM4hZYJUAACAAQAAgAAAAIAAAAAACgAAAAAA
      */
      originalTx:
        "0100000000010114edcc498816303b7c3560295fc5e0f5988dc6b0a6c82216ae6d4be97771def30000000000fdffffff01cadaf50500000000160014732590c1b3da6d8baab052def750b8e9856629fb0400473044022050da36ef21a73212e021dfe04d961b932ea49418dc27fb9a4829ce6868247c820220662f205769cd45942bec7f14ef297f5229b3b4c88d6350d2023ade438e8364100147304402204ef578a3c1626501392bdc69a1f08d2509764aabe0d84da7c1572ac421be6bc00220085b43f98762e19efef107223ea67adb38d92fa73b78667dfc1a7643839b02cb0169522102836f44392303a1b8f912e815fa1a07eadfdbf23aaf499e6174a246e0af4520212103164641d19dbe761cfa32790d2c3bcfe9e849a9919f0279ffe1d95806b4dd2d82210391d75a3484bdef034deeff777a63d56ae108c71d138df99dea1ea5924fd2ad9d53ae00000000",
      availableUtxos: [
        {
          txid: "f3de7177e94b6dae1622c8a6b0c68d98f5e0c55f2960357c3b30168849cced14",
          vout: 0,
          value: "100000000",
          sequence: 0xfffffffd,
          prevTxHex:
            "02000000000102a76343d116bf925af77adf0624440dcfd45b86f592546629db2b53e44a4b9d3c0000000000fdffffffc827a789bc2f3ff11c788a61295d6937505e26ccacad43bec84e79144f49e8e40100000000fdffffff0200e1f50500000000220020b9cf516d9c38f4940bbfab388fb5e355f36cd846371c4df714af0cc8b77e9b16366f9303000000002251207e2d109620fffd1350d8854f3ddbc7ec123c589dd56295c5cf3120f0c740408a01402faa282facd15087bf844e5f62c05180f1aaa71ad4fd44ae5e881ca10fcc35f09965f94f0aa21a888792ffecd8e39d031f08603861916380a0a79f72b851d25c0140fb4cab2f2bc8813f220c448994ea6cffe18d90b5a8eb4337125a3ea48a946c623f672245055e3f7b06235ae4c39e0d47cf1df72a1da447b415ec499b91ca993000000000",
          witnessUtxo: {
            script: Buffer.from(
              "00e1f50500000000220020b9cf516d9c38f4940bbfab388fb5e355f36cd846371c4df714af0cc8b77e9b16",
              "hex",
            ),
            value: 199971998,
          },
          witnessScript: Buffer.from(
            "522102836f44392303a1b8f912e815fa1a07eadfdbf23aaf499e6174a246e0af4520212103164641d19dbe761cfa32790d2c3bcfe9e849a9919f0279ffe1d95806b4dd2d82210391d75a3484bdef034deeff777a63d56ae108c71d138df99dea1ea5924fd2ad9d53ae",
            "hex",
          ),
          bip32Derivations: [
            {
              pubkey: Buffer.from(
                "02836f44392303a1b8f912e815fa1a07eadfdbf23aaf499e6174a246e0af452021",
                "hex",
              ),
              masterFingerprint: Buffer.from("c73a4236", "hex"),
              path: "m/84'/1'/0'/0/10",
            },
            {
              pubkey: Buffer.from(
                "03164641d19dbe761cfa32790d2c3bcfe9e849a9919f0279ffe1d95806b4dd2d82",
                "hex",
              ),
              masterFingerprint: Buffer.from("739b19a7", "hex"),
              path: "m/84'/1'/0'/0/10",
            },
            {
              pubkey: Buffer.from(
                "0391d75a3484bdef034deeff777a63d56ae108c71d138df99dea1ea5924fd2ad9d",
                "hex",
              ),
              masterFingerprint: Buffer.from("ce216582", "hex"),
              path: "m/84'/1'/0'/0/10",
            },
          ],
        },
        // ADDITIONAL UTXO
        {
          txid: "95844f152393c87444996ec8d9321c696d909d66e1df175be15122fb7e1701d0",
          vout: 1,
          value: "100000000",
          sequence: 0xfffffffd,
          prevTxHex:
            "02000000000102f44fc7a47e15eebfcd0b06d1aced4caae7023e280369df9e4fb144999a6b57610000000000fdffffffa47852fc9388d8ac67f00147c3f99c1f92cd0926c199e8ceff1efe5b162356290000000000fdffffff0256f6dc03030000002251200b8d9791dbbe30b2c93b3a3d0c1702632ddf8e8b847fc86b3d204d7663603dc700e1f50500000000220020620ce1d8d2f815c9d81ff4959a6d85c43683e00491da8ad4d5fa2620c3ddee88014008ed462ac65fb52f84e6640f4e2fe6775425063f178d48adf0fc01df2b57ac1694a8a76d9f5a9a2cedc2b79cb3c62429690b796bf9b2d57a5f29f1c65f1c1241014071ce2fff1a4676c29756f211aa9ed6b24eb832e16d11afb54f5f4dcd41a67f01159028f4e4374c4c65ccb590df5f0d398fa4f6df6b443532800ca1c32bba935d49040000",
          witnessUtxo: {
            script: Buffer.from(
              "00e1f50500000000220020620ce1d8d2f815c9d81ff4959a6d85c43683e00491da8ad4d5fa2620c3ddee88",
              "hex",
            ),
            value: 199971998,
          },
          witnessScript: Buffer.from(
            "522102791957c47fcce036565659f76a5f377a3b7d5806f042fe4a6811ba0a85ec3fc1210353c760fc48667f7ba5979393c6bda08459ff4827537e6320d3d1828c5aed7498210377fec04c1e9a998676c888c4b5631afd492fd223a0f2ec41292cc0bb2f525fff53ae",
            "hex",
          ),
          bip32Derivations: [
            {
              pubkey: Buffer.from(
                "026e412ed0ccbd60b6acae71a782ad3d2013fb4a4f283e1a942060fa46b874696f",
                "hex",
              ),
              masterFingerprint: Buffer.from("c73a4236", "hex"),
              path: "m/84'/1'/0'/0/8",
            },
            {
              pubkey: Buffer.from(
                "0288b0853d5d085d1bf4c59c7f23a4ee6970f51dad593011d1c304e7c424672ab0",
                "hex",
              ),
              masterFingerprint: Buffer.from("ce216582", "hex"),
              path: "m/84'/1'/0'/0/8",
            },
            {
              pubkey: Buffer.from(
                "02d2879588cc0da1a2441707fa6eb4842ffdcb482b91e5596465737a10b61e50b6",
                "hex",
              ),
              masterFingerprint: Buffer.from("c73a4236", "hex"),
              path: "m/84'/1'/0'/0/8",
            },
          ],
        },
      ],
      network: Network.REGTEST,
      dustThreshold: "546",
      scriptType: SCRIPT_TYPES.P2WSH,
      changeAddress:
        "bcrt1qd4eqvc7ujqtwjvw4yd88mctl4nhv8s8t0am6hp9y4rwxvmfahlms7c58ju",
      requiredSigners: 2,
      totalSigners: 3,
      absoluteFee: "1590",
      targetFeeRate: 90, // making it really high so we'll have to use the additional UTXO
      expected: {
        inputCount: 2,
        outputCount: 2,
        // PSBT we get after fee-bumping the tx
        exactPsbt:
          "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",
      },
    },
  ],
  cancelRbf: [
    {
      case: "Cancel transaction #1 - P2WSH 2-of-3 multisig", // Note: We're using the first case of the accelerate fixture solely to demonstrate that it can also be cancelled.

      // Original Tx PSBT :
      /*
      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
      */
      originalTx:
        "01000000000102132ddf1d15736ba46e9778168f0ba65bb0e173b27b34c174ce5dc2b9201d57500000000000fdffffffd001177efb2251e15b17dfe1669d906d691c32d9c86e994474c89323154f84950100000000fdffffff0200e1f50500000000160014f8bd9b6d2741f079113f751c5c756ff805c0211d6b53eb0b000000002200206d720663dc9016e931d5234e7de17faceec3c0eb7f77ab84a4a8dc666d3dbff704004730440220294d53645f7aabfc6e940442cf536ed67f274ce29697d5f7b00d0bd3c51876c3022017a0251076661f4a6c8ef5921193dcafac39fc2e42d34baf857dc505a5d9190e01473044022032a9a676e9c83b2b50671b80d03bbb0b1054d9f64dfe04902f4182f76d2bcb4602205c64cde06a49b47c30f30bc7082741ef38fa8d447db146e45111047df3c23a870169522102791957c47fcce036565659f76a5f377a3b7d5806f042fe4a6811ba0a85ec3fc1210353c760fc48667f7ba5979393c6bda08459ff4827537e6320d3d1828c5aed7498210377fec04c1e9a998676c888c4b5631afd492fd223a0f2ec41292cc0bb2f525fff53ae04004730440220497d14e996077988bf6d58a56c167fa19dd0ca38865d3944d2ef83eb00668e8102202159a2ef75b592c41c3b41c50097e9ad6124ed6202736e7d77ec8b483daeff4501473044022057943714c6e90b58349f9fbf9063a16bf333ebee79ff04462912b35d380af103022047e7ac4dcdfcefe68332eaa27f8469e7bcca6e91f758e4e05adbe30351c282f201695221026e412ed0ccbd60b6acae71a782ad3d2013fb4a4f283e1a942060fa46b874696f210288b0853d5d085d1bf4c59c7f23a4ee6970f51dad593011d1c304e7c424672ab02102d2879588cc0da1a2441707fa6eb4842ffdcb482b91e5596465737a10b61e50b653ae00000000",
      availableUtxos: [
        {
          txid: "50571d20b9c25dce74c1347bb273e1b05ba60b8f1678976ea46b73151ddf2d13",
          vout: 0,
          value: "199971998",
          sequence: 0xfffffffd,
          prevTxHex:
            "02000000000101a47852fc9388d8ac67f00147c3f99c1f92cd0926c199e8ceff1efe5b162356290100000000fdffffff019e54eb0b0000000022002056fd37fd8671c575cade4d7291c571c2e8c7d346d33852b901fce54acaf25d01040047304402200beca4154913645e3f128a1b5020093de4a032e2623f3c6f32599c8f1e367d0b022039d57a70fd10beefe7850c488dfd40ec71456d7c5e86e5de3d9a91afe1f534160147304402207708e71aec3b6464e1201268b426c47466ec517dcf93274e2a4a812436c791ec022036ea50864dcb463a4bb20cc65ccac5e95914a60e915ad247f6e6ab8de67d89ea01695221027d988ff1536a0eb7c78d11982966df3fa98877f34937614d784a55042cf2250b2103909dad87cabab23f05641975d8b312eb95c44a9ab952b9162499121f4c28f1cf2103f067679d2c414576cb568f06d801ed99d101e0842fbb588d3a4de49a683bdd7a53ae00000000",
          witnessUtxo: {
            script: Buffer.from(
              "9e54eb0b0000000022002056fd37fd8671c575cade4d7291c571c2e8c7d346d33852b901fce54acaf25d01",
              "hex",
            ),
            value: 199971998,
          },
          witnessScript: Buffer.from(
            "522102791957c47fcce036565659f76a5f377a3b7d5806f042fe4a6811ba0a85ec3fc1210353c760fc48667f7ba5979393c6bda08459ff4827537e6320d3d1828c5aed7498210377fec04c1e9a998676c888c4b5631afd492fd223a0f2ec41292cc0bb2f525fff53ae",
            "hex",
          ),
          bip32Derivations: [
            {
              pubkey: Buffer.from(
                "02791957c47fcce036565659f76a5f377a3b7d5806f042fe4a6811ba0a85ec3fc1",
                "hex",
              ),
              masterFingerprint: Buffer.from("739b19a7", "hex"),
              path: "m/84'/1'/0'/0/9",
            },
            {
              pubkey: Buffer.from(
                "0353c760fc48667f7ba5979393c6bda08459ff4827537e6320d3d1828c5aed7498",
                "hex",
              ),
              masterFingerprint: Buffer.from("ce216582", "hex"),
              path: "m/84'/1'/0'/0/9",
            },
            {
              pubkey: Buffer.from(
                "0377fec04c1e9a998676c888c4b5631afd492fd223a0f2ec41292cc0bb2f525fff",
                "hex",
              ),
              masterFingerprint: Buffer.from("c73a4236", "hex"),
              path: "m/84'/1'/0'/0/9",
            },
          ],
        },
        {
          txid: "95844f152393c87444996ec8d9321c696d909d66e1df175be15122fb7e1701d0",
          vout: 1,
          value: "100000000",
          sequence: 0xfffffffd,
          prevTxHex:
            "02000000000102f44fc7a47e15eebfcd0b06d1aced4caae7023e280369df9e4fb144999a6b57610000000000fdffffffa47852fc9388d8ac67f00147c3f99c1f92cd0926c199e8ceff1efe5b162356290000000000fdffffff0256f6dc03030000002251200b8d9791dbbe30b2c93b3a3d0c1702632ddf8e8b847fc86b3d204d7663603dc700e1f50500000000220020620ce1d8d2f815c9d81ff4959a6d85c43683e00491da8ad4d5fa2620c3ddee88014008ed462ac65fb52f84e6640f4e2fe6775425063f178d48adf0fc01df2b57ac1694a8a76d9f5a9a2cedc2b79cb3c62429690b796bf9b2d57a5f29f1c65f1c1241014071ce2fff1a4676c29756f211aa9ed6b24eb832e16d11afb54f5f4dcd41a67f01159028f4e4374c4c65ccb590df5f0d398fa4f6df6b443532800ca1c32bba935d49040000",
          witnessUtxo: {
            script: Buffer.from(
              "00e1f50500000000220020620ce1d8d2f815c9d81ff4959a6d85c43683e00491da8ad4d5fa2620c3ddee88",
              "hex",
            ),
            value: 199971998,
          },
          witnessScript: Buffer.from(
            "522102791957c47fcce036565659f76a5f377a3b7d5806f042fe4a6811ba0a85ec3fc1210353c760fc48667f7ba5979393c6bda08459ff4827537e6320d3d1828c5aed7498210377fec04c1e9a998676c888c4b5631afd492fd223a0f2ec41292cc0bb2f525fff53ae",
            "hex",
          ),
          bip32Derivations: [
            {
              pubkey: Buffer.from(
                "026e412ed0ccbd60b6acae71a782ad3d2013fb4a4f283e1a942060fa46b874696f",
                "hex",
              ),
              masterFingerprint: Buffer.from("c73a4236", "hex"),
              path: "m/84'/1'/0'/0/8",
            },
            {
              pubkey: Buffer.from(
                "0288b0853d5d085d1bf4c59c7f23a4ee6970f51dad593011d1c304e7c424672ab0",
                "hex",
              ),
              masterFingerprint: Buffer.from("ce216582", "hex"),
              path: "m/84'/1'/0'/0/8",
            },
            {
              pubkey: Buffer.from(
                "02d2879588cc0da1a2441707fa6eb4842ffdcb482b91e5596465737a10b61e50b6",
                "hex",
              ),
              masterFingerprint: Buffer.from("c73a4236", "hex"),
              path: "m/84'/1'/0'/0/8",
            },
          ],
        },
      ],
      network: Network.REGTEST,
      dustThreshold: "546",
      scriptType: SCRIPT_TYPES.P2WSH,
      cancelAddress:
        "bcrt1qyzx24m8dt0e78yrdl2kuz0czr2xwtfl8frfxj5s672a0783a9eeq5f8l7m",
      requiredSigners: 2,
      totalSigners: 3,
      absoluteFee: "307",
      targetFeeRate: 32.75,
      expected: {
        inputCount: 2,
        outputCount: 1,
        // PSBT we get after fee-bumping the tx
        exactPsbt:
          "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",
      },
    },
  ],
};
