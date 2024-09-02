import { Network } from "@caravan/bitcoin";
import { UTXO } from "../types";

// Helper function to create a dummy script
const dummyScript = Buffer.from(
  "76a914000000000000000000000000000000000000000088ac",
  "hex",
);

// Fixture 1: RBF Transaction
// Mempool link: https://mempool.space/tx/a7d852d6997dcbbb3be82c5282d2951c6f75053dfef7d6444e0dffb6e7e6977c
export const rbfTransactionFixture = [
  {
    test: {
      txHex:
        "02000000000102f3b11433a429ce8ad7f315b245e2ab8cf53e934ddb46b7348db8737eb030044f0000000000fdffffffc5731601cb6750ce4dbf3a50d2c4fcd4a3b8304302d91e601319f9eb5ec005980000000000fdffffff0112ac0a000000000017a9148965f77e0e88df82a5ac8406dc8b98d102295411870247304402201dcd678778570aa3cbce7521ee1b248e84602c9bf7440341e81d975c292ca45f022056e01ff7a166ca46b4252117794dd5b469e4f1e2f75591c4c8ba183ab54325d4012102a55c4f2e8e91aec7592d3bf0e66e24e2b24967e56d1c91e2939564ce0bc476a8024730440220390dac983b71ce489bc388c76058cb67b1478d99168b87aebe62413d9538c1ab022017f8965b17f9b527f4a2b281f74dd6ea7d7d6d4f6d70119dc271f73ab176fdf30121036466a4ffdfb2a5a14a941d490bab7c1c1dcb72566141edc93eb86fd19682316d491b0d00",
      network: Network.MAINNET,
      inputs: [
        {
          txid: "4f0430b07e73b88d34b746db4d933ef58cabe245b215f3d78ace29a43314b1f3",
          vout: 0,
          value: "170435", // in satoshis
          sequence: 4294967293,
        },
        {
          txid: "9805c05eebf91913601ed9024330b8a3d4fcc4d2503abf4dce5067cb011673c5",
          vout: 0,
          value: "529781", // in satoshis
          sequence: 4294967293,
        },
      ],
      availableUtxos: [
        // https://mempool.space/tx/4f0430b07e73b88d34b746db4d933ef58cabe245b215f3d78ace29a43314b1f3#flow=&vout=0
        {
          txid: "4f0430b07e73b88d34b746db4d933ef58cabe245b215f3d78ace29a43314b1f3",
          vout: 0,
          value: "170435",
          witnessUtxo: {
            script: Buffer.from(
              "001643ae9d3e5ffac83b8df0512b61d0fda041be2b41",
              "hex",
            ),
            value: 170435,
          },
          prevTxHex:
            "0200000000010147e243e98a006c0bdc369912c899819d15cd95f3c58156fe1095e42155fb6f770100000000fdffffff02c39902000000000016001443ae9d3e5ffac83b8df0512b61d0fda041be2b41f8ee1b000000000017a9148965f77e0e88df82a5ac8406dc8b98d102295411870247304402200ea276530bc577be36a20da72fb7eb5965cfdb13db6328bcc1f5c3a5f9a99ff3022059fe09156729d620b78a2ea13debec73461ab76260c9b9afe45b163b23f6aad901210335ec3d15bb90b22c11d2ef5010a84dfa8323c85d1c652fceba15d25e5ed63443431b0d00",
        },
        {
          // https://mempool.space/tx/9805c05eebf91913601ed9024330b8a3d4fcc4d2503abf4dce5067cb011673c5
          txid: "9805c05eebf91913601ed9024330b8a3d4fcc4d2503abf4dce5067cb011673c5",
          vout: 0,
          value: "529781",
          witnessUtxo: {
            script: Buffer.from(
              "001497a754f6dade2dba25d58058b1a283597f4236aa",
              "hex",
            ),
            value: 529781,
          },

          prevTxHex:
            "02000000000101427edede923448733dc125a975931bc62ecb5366bdf1289a0cbd445bf85d26620000000000fdffffff02751508000000000016001497a754f6dade2dba25d58058b1a283597f4236aaa1e3290000000000160014dc9abb9f0536f8ce517a248da673476a48a384f30247304402200d79b523aa388327ef663649bb2fe70fb405353de86cee0cbc30e74d131767140220437699b88488c56cab545c31a2fd0d139f6624fb1bed334f5138075dcee2d622012102e6ccf653b0c47a6b7a3d5c8b4bac43d51b2bbc7310d92cefbfbbdaf0588950d3421b0d00",
        },
        {
          // https://mempool.space/tx/9805c05eebf91913601ed9024330b8a3d4fcc4d2503abf4dce5067cb011673c5
          txid: "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
          vout: 1,
          value: "2745249",
          witnessUtxo: {
            script: Buffer.from(
              "0014dc9abb9f0536f8ce517a248da673476a48a384f3",
              "hex",
            ),
            value: 2745249,
          },
          prevTxHex:
            "02000000000101427edede923448733dc125a975931bc62ecb5366bdf1289a0cbd445bf85d26620000000000fdffffff02751508000000000016001497a754f6dade2dba25d58058b1a283597f4236aaa1e3290000000000160014dc9abb9f0536f8ce517a248da673476a48a384f30247304402200d79b523aa388327ef663649bb2fe70fb405353de86cee0cbc30e74d131767140220437699b88488c56cab545c31a2fd0d139f6624fb1bed334f5138075dcee2d622012102e6ccf653b0c47a6b7a3d5c8b4bac43d51b2bbc7310d92cefbfbbdaf0588950d3421b0d00",
        },
      ] as UTXO[],
      dustThreshold: "546",
      targetFeeRate: 15,
      scriptType: "P2SH",
      requiredSigners: 2,
      totalSigners: 3,
    },
    expected: {
      txid: "a7d852d6997dcbbb3be82c5282d2951c6f75053dfef7d6444e0dffb6e7e6977c",
      vsize: 178,
      weight: 712,
      fee: "806",
      feeRate: 4.53,
      canRBF: true,
      inputCount: 1,
      outputCount: 1,
      outputAddress: "3EDWebjgkjK5rZjeeuRHxcRWqtifwDCSUn",
      outputAmount: "699410",
    },
  },
];

// Fixture 2: RBF Replacement Transaction
// Original tx: https://mempool.space/tx/d5daea59944f73cfe1b60a054c11edc56117b3b9c9e683424d966fb8aa04bc38
// Replacement tx: https://mempool.space/tx/f615e26624800cff93952ddf6504121503b2594805daae74b34d9412a42f1611
export const rbfReplacementFixture = [
  {
    test: {
      originalTxHex:
        "02000000000101d6e4be83f8eacd781ae5f757bb0e74a771875cf4f6c03a8c9c378c3e62bd7e7f0000000000fdffffff029c120000000000001600142dc1c9f7da43cc0205a2f2c94bd337799ac0a0c99c120000000000001600142dc1c9f7da43cc0205a2f2c94bd337799ac0a0c902483045022100aa46010e8dcaad8056964dad2b0d2fbfd9a19782d76a3f46b8bf8a5285efa79302204f340cd906a8119455b7432edfa9545cbe9b5b2178eef89f58c3da37f2b5e92e0121030b0a5094d100125de30f1526776b7e6cfc428a07711cc0985a145ae0718e2a0c00000000",
      replacementTxHex:
        "020000000001017f7ebd623e8c379c8c3ac0f6f45c8771a7740ebb57f7e51a78cdeaf83bee4dd60000000000fdffffff029c120000000000001600142dc1c9f7da43cc0205a2f2c94bd337799ac0a0c90000000000000000076a5d041401140002483045022100c5209ff690e18fe616af211a8e9d3593e3462f256e621d28bb44c9e4aeaedf8702201f151fe216cccd4be27686d41c67467546ec81f6f5ddd298cf3aea1053fa52e80121030b0a5094d100125de30f1526776b7e6cfc428a07711cc0985a145ae0718e2a0c00000000",
      network: Network.MAINNET,
      inputs: [
        {
          txid: "7f7ebd623e8c379c8c3ac0f6f45c8771a7740ebb57f7e51a78cdeaf883bee4d6",
          vout: 0,
          value: "11986",
          sequence: 4294967293,
        },
      ],
      availableUtxos: [
        {
          txid: "7f7ebd623e8c379c8c3ac0f6f45c8771a7740ebb57f7e51a78cdeaf883bee4d6",
          vout: 0,
          value: "11986",
          witnessUtxo: {
            script: Buffer.from(
              "0014dc9abb9f0536f8ce517a248da673476a48a384f3",
              "hex",
            ),
            value: 11986,
          },
          prevTxHex:
            "02000000000101427edede923448733dc125a975931bc62ecb5366bdf1289a0cbd445bf85d26620000000000fdffffff02751508000000000016001497a754f6dade2dba25d58058b1a283597f4236aaa1e3290000000000160014dc9abb9f0536f8ce517a248da673476a48a384f30247304402200d79b523aa388327ef663649bb2fe70fb405353de86cee0cbc30e74d131767140220437699b88488c56cab545c31a2fd0d139f6624fb1bed334f5138075dcee2d622012102e6ccf653b0c47a6b7a3d5c8b4bac43d51b2bbc7310d92cefbfbbdaf0588950d3421b0d00",
        },
        {
          // https://mempool.space/tx/9805c05eebf91913601ed9024330b8a3d4fcc4d2503abf4dce5067cb011673c5
          txid: "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
          vout: 1,
          value: "2745249",
          witnessUtxo: {
            script: Buffer.from(
              "0014dc9abb9f0536f8ce517a248da673476a48a384f3",
              "hex",
            ),
            value: 2745249,
          },
          prevTxHex:
            "02000000000101427edede923448733dc125a975931bc62ecb5366bdf1289a0cbd445bf85d26620000000000fdffffff02751508000000000016001497a754f6dade2dba25d58058b1a283597f4236aaa1e3290000000000160014dc9abb9f0536f8ce517a248da673476a48a384f30247304402200d79b523aa388327ef663649bb2fe70fb405353de86cee0cbc30e74d131767140220437699b88488c56cab545c31a2fd0d139f6624fb1bed334f5138075dcee2d622012102e6ccf653b0c47a6b7a3d5c8b4bac43d51b2bbc7310d92cefbfbbdaf0588950d3421b0d00",
        },
      ] as UTXO[],
      dustThreshold: "546",
      targetFeeRate: 10,
      scriptType: "p2wpkh",
      requiredSigners: 1,
      totalSigners: 1,
    },
    expected: {
      txid: "f615e26624800cff93952ddf6504121503b2594805daae74b34d9412a42f1611",
      vsize: 141,
      weight: 562,
      fee: "1229",
      feeRate: 9.79,
      canRBF: true,
      inputCount: 1,
      outputCount: 3,
      outputAddress: "bc1q9hquna76g0xqypdz7ty5h5eh0xdvpgxfjp6d5g",
      outputAmount: "4764",
    },
  },
];

// Fixture 3: Full RBF Transaction
// Mempool link: https://mempool.space/tx/eafd0b87e19b30b6ff189c01df0593cbb86824db523cf7d59273a7095f0ce783
export const fullRbfTransactionFixture = [
  {
    test: {
      txHex:
        "02000000000102eafd0b87e19b30b6ff189c01df0593cbb86824db523cf7d59273a7095f0ce7830000000000ffffffffc99adaea9a81d557af38d10d716355b4a28cbe1a703aaefdb54e58bca8f21cb70000000000ffffffff01029c0000000000001976a914c9b40cb7a7b0efa94667365218e0f230c13f316288ac02473044022029bf4acabc50e54387f5f195bc1c33096acb3c268c6db43e0126e062e4ea5b3702200f40e116decb763f28f44904f1f29677a87e0daaaec5a6b05961d9e2fb23560e012102dc4e1a0c6ef83097f938b94af31d451ac08543e12e8da6debef598a390186dff024730440220500ec8cd1e79c977c8c2ec77b573ccd570e77adefd03402538ebad57a37663e802204db691201a4fb8fe2cbd553837875d31afad0102e34e349975034ed0fe23594b012102dc4e1a0c6ef83097f938b94af31d451ac08543e12e8da6debef598a390186dff00000000",
      network: Network.MAINNET,
      inputs: [
        {
          txid: "83e70c5f09a77392d5f73c52db2468b8cb9305df019c18ffb6309be1870bfdea",
          vout: 0,
          value: "20688", // in satoshis
        },
        {
          txid: "b71cf2a8bc584eb5fdae3a701abe8ca2b45563710dd138af57d5819aeada9ac9",
          vout: 0,
          value: "20155", // in satoshis
        },
      ],
      availableUtxos: [
        {
          txid: "83e70c5f09a77392d5f73c52db2468b8cb9305df019c18ffb6309be1870bfdea",
          vout: 0,
          value: "20688",
          witnessUtxo: {
            script: dummyScript,
            value: 20688,
          },
          prevTxHex:
            "0200000000010147e243e98a006c0bdc369912c899819d15cd95f3c58156fe1095e42155fb6f770100000000fdffffff02c39902000000000016001443ae9d3e5ffac83b8df0512b61d0fda041be2b41f8ee1b000000000017a9148965f77e0e88df82a5ac8406dc8b98d102295411870247304402200ea276530bc577be36a20da72fb7eb5965cfdb13db6328bcc1f5c3a5f9a99ff3022059fe09156729d620b78a2ea13debec73461ab76260c9b9afe45b163b23f6aad901210335ec3d15bb90b22c11d2ef5010a84dfa8323c85d1c652fceba15d25e5ed63443431b0d00",
        },
        {
          txid: "b71cf2a8bc584eb5fdae3a701abe8ca2b45563710dd138af57d5819aeada9ac9",
          vout: 0,
          value: "20155",
          witnessUtxo: {
            script: dummyScript,
            value: 20155,
          },
          prevTxHex:
            "020000000001018c7d5d83e8458d13e6e19041d1c5a2706be3d78dfc7f6562f8a49deaa763d8f70000000000fdffffff0255160800000000001600147a054b443452197938faa18324c0d1fb6d5f9b12e5440100000000001600143ae9d3e5ffac83b8df0512b61d0fda041be2b410247304402201b9938883ce6e7d1374e74c809bf9f2778825d4fbc1f835f9bee7ce0c68a2577022005c17ea63c36e6671e545072c651ea6362a5df1735b715965dde644d090aac8c012102e9c9e1a48ca5eed9f4a3b2d0134601b4d742e6287b9945818c6da2f44ab1acc800000000",
        },
        // Additional UTXO for potential fee increase
        {
          // https://mempool.space/tx/9805c05eebf91913601ed9024330b8a3d4fcc4d2503abf4dce5067cb011673c5
          txid: "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
          vout: 1,
          value: "2745249",
          witnessUtxo: {
            script: Buffer.from(
              "0014dc9abb9f0536f8ce517a248da673476a48a384f3",
              "hex",
            ),
            value: 2745249,
          },
          prevTxHex:
            "02000000000101427edede923448733dc125a975931bc62ecb5366bdf1289a0cbd445bf85d26620000000000fdffffff02751508000000000016001497a754f6dade2dba25d58058b1a283597f4236aaa1e3290000000000160014dc9abb9f0536f8ce517a248da673476a48a384f30247304402200d79b523aa388327ef663649bb2fe70fb405353de86cee0cbc30e74d131767140220437699b88488c56cab545c31a2fd0d139f6624fb1bed334f5138075dcee2d622012102e6ccf653b0c47a6b7a3d5c8b4bac43d51b2bbc7310d92cefbfbbdaf0588950d3421b0d00",
        },
      ] as UTXO[],
      dustThreshold: "546",
      targetFeeRate: 6,
      scriptType: "p2wpkh",
      requiredSigners: 1,
      totalSigners: 1,
    },
    expected: {
      txid: "83e70c5f09a77392d5f73c52db2468b8cb9305df019c18ffb6309be1870bfdea",
      vsize: 180,
      weight: 720,
      fee: "905",
      feeRate: 5.03,
      canRBF: true, // Note: This is depending on fullRBF, sequence numbers are 0xffffffff
      inputCount: 2,
      outputCount: 2,
      outputAddress: "1KPWWdUKzUWTcoNz8fDhvZWMpL51MDn5As",
      outputAmount: 39938,
    },
  },
];
