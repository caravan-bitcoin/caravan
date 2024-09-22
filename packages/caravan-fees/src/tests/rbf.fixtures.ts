import { Network } from "@caravan/bitcoin";
import { UTXO, SCRIPT_TYPES } from "../types";

export const rbfFixtures = {
  cancelRbf: [
    // Mempool link: https://mempool.space/tx/a7d852d6997dcbbb3be82c5282d2951c6f75053dfef7d6444e0dffb6e7e6977c
    {
      case: "Create a valid cancel RBF transaction",
      originalTx:
        "02000000000102f3b11433a429ce8ad7f315b245e2ab8cf53e934ddb46b7348db8737eb030044f0000000000fdffffffc5731601cb6750ce4dbf3a50d2c4fcd4a3b8304302d91e601319f9eb5ec005980000000000fdffffff0112ac0a000000000017a9148965f77e0e88df82a5ac8406dc8b98d102295411870247304402201dcd678778570aa3cbce7521ee1b248e84602c9bf7440341e81d975c292ca45f022056e01ff7a166ca46b4252117794dd5b469e4f1e2f75591c4c8ba183ab54325d4012102a55c4f2e8e91aec7592d3bf0e66e24e2b24967e56d1c91e2939564ce0bc476a8024730440220390dac983b71ce489bc388c76058cb67b1478d99168b87aebe62413d9538c1ab022017f8965b17f9b527f4a2b281f74dd6ea7d7d6d4f6d70119dc271f73ab176fdf30121036466a4ffdfb2a5a14a941d490bab7c1c1dcb72566141edc93eb86fd19682316d491b0d00",
      network: Network.MAINNET,
      inputs: [
        {
          // https://mempool.space/tx/4f0430b07e73b88d34b746db4d933ef58cabe245b215f3d78ace29a43314b1f3#flow=&vout=0
          txid: "4f0430b07e73b88d34b746db4d933ef58cabe245b215f3d78ace29a43314b1f3",
          vout: 0,
          value: "170435",
          sequence: 4294967293,
        },
        {
          // https://mempool.space/tx/9805c05eebf91913 601ed9024330b8a3d4fcc4d2503abf4dce5067cb011673c5#flow=&vout=0
          txid: "9805c05eebf91913601ed9024330b8a3d4fcc4d2503abf4dce5067cb011673c5",
          vout: 0,
          value: "529781",
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
          // extra UTXO (dummy)
          // https://mempool.space/tx/89caa4dff1251f3a0e62b662ee1b22e8cffeb32bf2cf839ff959d62fe56a3562
          txid: "89caa4dff1251f3a0e62b662ee1b22e8cffeb32bf2cf839ff959d62fe56a3562",
          vout: 1,
          value: "17971",
          witnessUtxo: {
            script: Buffer.from(
              "001447d4cfbbb5a10792b59a67cb107c330b0fd4f3ad",
              "hex",
            ),
            value: 17971,
          },
          prevTxHex:
            "02000000000101dd41bedea50568952ac59e3bd4e796597079c1698a26ca34a4708f9ef3a052180100000000fdffffff020000000000000000076a5d0414011400334600000000000016001447d4cfbbb5a10792b59a67cb107c330b0fd4f3ad0247304402203257ba3b6022384b1d20c141368c72aebcaa4d9ebcfe9d209e3ac06da08d3b6602200505ae985e92fb3233ba59bc50bc502f3d2ea6577fce07ed4ccb703b100169cb0121031ecc3560860b4173e079f127aabe0e988fc08c17cc7b77fa17497bf0f98d84a900000000",
        },
      ],
      dustThreshold: "546",
      targetFeeRate: 15,
      scriptType: SCRIPT_TYPES.P2SH_P2WSH,
      requiredSigners: 2,
      totalSigners: 3,
      cancelAddress: "bc1q7y50e8culkenu3tnn66ly6gq9m43y8ymk70k8z",
      expected: {
        /*
       ====================================== IMPORTANT ====================================
        note this is for the new cancelled tx ... which would only have the one input of index 0 i.e, 4f0430b07e73b88d34b746db4d933ef58cabe245b215f3d78ace29a43314b1f3 , that's why input count is 1
        so amount is 170435 ... now originally the inputs are of type P2WPKH .... but now due to inability to have a P2WPKH type for multisig inputs we consider new inputs as
        P2SH_P2WSH .
        Now we have a fees of 806 sats, 178 vsize originally ... to cancel-this tx with a target of 15 sats/vbyte ... the minimumRBF fee would be (note we are considering original tx for it)
        so we'll need :
        (15 sats/vbyte * 178 vbyte) = 2670 sats  > ( (4.53 sats/byte -> original feeRate + 1  sats/byte -> incremental relay fees ) * 178 sats ) = 984 sats

        But as we have current size as 203 sats due to different script type so we end up paying fees of (15 sats/vbyte * 203 vbyte ) = 3045 sats
        */
        inputCount: 1,
        outputCount: 1,
        fee: "806", // absolute fees of tx
        expectedfee: "3045", // rationalized above
        feeRate: 15,
      },
    },
  ],

  acceleratedRbf: [
    {
      // Original tx: https://mempool.space/tx/d5daea59944f73cfe1b60a054c11edc56117b3b9c9e683424d966fb8aa04bc38
      // Replacement tx: https://mempool.space/tx/f615e26624800cff93952ddf6504121503b2594805daae74b34d9412a42f1611
      case: "Create a valid accelerated RBF transaction",
      originalTx:
        "02000000000101d6e4be83f8eacd781ae5f757bb0e74a771875cf4f6c03a8c9c378c3e62bd7e7f0000000000fdffffff029c120000000000001600142dc1c9f7da43cc0205a2f2c94bd337799ac0a0c99c120000000000001600142dc1c9f7da43cc0205a2f2c94bd337799ac0a0c902483045022100aa46010e8dcaad8056964dad2b0d2fbfd9a19782d76a3f46b8bf8a5285efa79302204f340cd906a8119455b7432edfa9545cbe9b5b2178eef89f58c3da37f2b5e92e0121030b0a5094d100125de30f1526776b7e6cfc428a07711cc0985a145ae0718e2a0c00000000",
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
        {
          // extra UTXO (dummy)
          // https://mempool.space/tx/89caa4dff1251f3a0e62b662ee1b22e8cffeb32bf2cf839ff959d62fe56a3562
          txid: "89caa4dff1251f3a0e62b662ee1b22e8cffeb32bf2cf839ff959d62fe56a3562",
          vout: 1,
          value: "17971",
          witnessUtxo: {
            script: Buffer.from(
              "001447d4cfbbb5a10792b59a67cb107c330b0fd4f3ad",
              "hex",
            ),
            value: 17971,
          },
          prevTxHex:
            "02000000000101dd41bedea50568952ac59e3bd4e796597079c1698a26ca34a4708f9ef3a052180100000000fdffffff020000000000000000076a5d0414011400334600000000000016001447d4cfbbb5a10792b59a67cb107c330b0fd4f3ad0247304402203257ba3b6022384b1d20c141368c72aebcaa4d9ebcfe9d209e3ac06da08d3b6602200505ae985e92fb3233ba59bc50bc502f3d2ea6577fce07ed4ccb703b100169cb0121031ecc3560860b4173e079f127aabe0e988fc08c17cc7b77fa17497bf0f98d84a900000000",
        },
      ],
      dustThreshold: "546",
      targetFeeRate: 10,
      scriptType: SCRIPT_TYPES.P2SH,
      requiredSigners: 1,
      totalSigners: 1,
      changeAddress: "bc1q7y50e8culkenu3tnn66ly6gq9m43y8ymk70k8z",
      expected: {
        inputCount: 2,
        outputCount: 3,
        fee: "1229",
        expectedFee: "4360",
        feeRate: 10,
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
        expectedFee: "1847",
        feeRate: 6.035,
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
      changeIndex: 0,
      changeAddress: "bc1q7y50e8culkenu3tnn66ly6gq9m43y8ymk70k8z",
      expectedError:
        "Failed to create a valid accelerated RBF transaction. Ensure all inputs and outputs are valid and fee requirements are met.",
    },
  ],
};
