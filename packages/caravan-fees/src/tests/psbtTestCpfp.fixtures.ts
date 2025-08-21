import { Network, P2WSH } from "@caravan/bitcoin";

/**
 * CPFP (Child-Pays-for-Parent) Test Fixtures
 *
 * These fixtures test our CPFP functionality by simulating real-world scenarios where users
 * need to speed up stuck transactions by spending outputs from unconfirmed parent transactions.
 *
 * ## How CPFP Works:
 * 1. You have an unconfirmed transaction (the "parent") stuck in the mempool
 * 2. You create a new transaction (the "child") that spends an output from the parent
 * 3. The child pays a high enough fee to incentivize miners to confirm both transactions
 *
 * ## Test Scenarios:
 *
 * ### Scenario 1: Receiving Transaction CPFP
 * - Someone sent you Bitcoin, but used a low fee
 * - The transaction is stuck, and you want to speed it up
 * - You spend the output they sent to you in a CPFP transaction
 *
 * ### Scenario 2: Sent Transaction CPFP
 * - You sent Bitcoin but used too low a fee
 * - The transaction has a change output back to your wallet
 * - You spend your own change output to create a CPFP transaction
 *
 * ## What We're Testing:
 * - That the parent output is correctly identified and enriched with PSBT metadata
 * - That the child transaction properly references the parent transaction
 * - That all necessary signing information (scripts, derivations) is present
 * - That the combined fee rate achieves the target acceleration
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

export const cpfpPsbtFixtures = {
  receivingTransaction: [
    {
      case: "CPFP on incoming payment - Spending received output to accelerate confirmation",
      // This simulates someone sending our wallet Bitcoin with a low fee, and then we use CPFP to speed it up
      // Parent tx: 706566f191b2d2c2f412b3f77013caa8815db467dec7aa3ff24bd7c5bccc9bdb (receiving 1 BTC)
      // We're spending output 1 (the one sent to us) to create a child transaction

      parentTransaction: {
        txid: "706566f191b2d2c2f412b3f77013caa8815db467dec7aa3ff24bd7c5bccc9bdb",
        hex: "02000000000101cb99851076ef47b2179b99f4d6647acd899980bb43305c48cfc6831613ba29140000000000fdffffff02026774ce02000000225120c20471bbf7a0d13360d127c177cc723b74a03aad0806af9c62c7e7e9a4941a6900e1f5050000000022002029fef2f441114fb955f7994d7b7c14e3664990dc11751cf3c7bfe83f9244e2ff0140425761ab4d7d06d2182c9d88b1fb2b8a3d25eb81672a4094432ec6f3be24629e82f8dea3e89337c1a5fc9ceba27ed066f241653e06df3c86dcf083702a41317700000000",
        fee: 1550, // Parent transaction fee (low fee causing the delay)
        vsize: 140.25,
      },

      // The parent UTXO - this is output 1 from the parent transaction
      // This output was sent TO US, so we have the signing keys and can spend it
      parentUtxo: {
        txid: "db9bccbcc5d74bf23faac7de67b45d81a8ca1370f7b312f4c2d2b291f1666570",
        vout: 1, // Spending output index 1 (the one sent to our wallet)
        value: "100000000", // 1 BTC in satoshis
        prevTxHex:
          "02000000000101cb99851076ef47b2179b99f4d6647acd899980bb43305c48cfc6831613ba29140000000000fdffffff02026774ce02000000225120c20471bbf7a0d13360d127c177cc723b74a03aad0806af9c62c7e7e9a4941a6900e1f5050000000022002029fef2f441114fb955f7994d7b7c14e3664990dc11751cf3c7bfe83f9244e2ff0140425761ab4d7d06d2182c9d88b1fb2b8a3d25eb81672a4094432ec6f3be24629e82f8dea3e89337c1a5fc9ceba27ed066f241653e06df3c86dcf083702a41317700000000",
        witnessUtxo: {
          script: Buffer.from(
            "00e1f5050000000069522102363da64866d46f726c507481e52ab9030a3b34fea678a5e290b7b490b45f6380210296d6ae38b612d1e7bce76fb99bf612593ee6d2b8042cacd939ffb69e5e69e26921030bed9b71835a5dd7d45bc72fb48a57f2a3396e0cae549fb83fe7f03b827cd09453ae",
            "hex",
          ),
          value: 100000000,
        },
        witnessScript: Buffer.from(
          "522102363da64866d46f726c507481e52ab9030a3b34fea678a5e290b7b490b45f6380210296d6ae38b612d1e7bce76fb99bf612593ee6d2b8042cacd939ffb69e5e69e26921030bed9b71835a5dd7d45bc72fb48a57f2a3396e0cae549fb83fe7f03b827cd09453ae",
          "hex",
        ),
        bip32Derivations: [
          {
            pubkey: Buffer.from(
              "02363da64866d46f726c507481e52ab9030a3b34fea678a5e290b7b490b45f6380",
              "hex",
            ),
            masterFingerprint: Buffer.from("739b19a7", "hex"),
            path: "m/84'/1'/0'/0/17", // This is a receiving address (path 0)
          },
          {
            pubkey: Buffer.from(
              "0296d6ae38b612d1e7bce76fb99bf612593ee6d2b8042cacd939ffb69e5e69e269",
              "hex",
            ),
            masterFingerprint: Buffer.from("c73a4236", "hex"),
            path: "m/84'/1'/0'/0/17",
          },
          {
            pubkey: Buffer.from(
              "030bed9b71835a5dd7d45bc72fb48a57f2a3396e0cae549fb83fe7f03b827cd094",
              "hex",
            ),
            masterFingerprint: Buffer.from("ce216582", "hex"),
            path: "m/84'/1'/0'/0/17",
          },
        ],
      },

      // Additional UTXOs available for adding more inputs if needed for higher fees
      availableUtxos: [], // In this case, the parent output alone is sufficient

      spendableOutputIndex: 1, // We're spending output 1 from the parent
      changeAddress:
        "bcrt1qjxne0ryn375h2a945vud7f5zsa0gt0lyaapkm0aswpt9dyj8lqcq94eqw4", // address we want to send the funds to in child Tx
      network: Network.REGTEST,
      dustThreshold: "546",
      scriptType: P2WSH,
      requiredSigners: 2,
      totalSigners: 3,
      targetFeeRate: 32.5, // Target combined fee rate (parent + child)
      globalXpubs: [
        {
          xpub: "tpubDCyyVFP5xvLjEtEnUd3ycp8U7m5TZwt8B9q32bBytWEVRaTSWwiWjcR27yJLtgRvJdqbrEupi3vCaDfwZPbL8ViytwYnyeTYeZeDfvyJAMc",
          masterFingerprint: "739b19a7",
          path: "m/84'/1'/0'",
        },
        {
          xpub: "tpubDCiNatUPEtNj633QZvvfweoL4VziJe33CVGi4ZKEquVsNmRnwkfqxp4QZMp1GcjcVScyXru3qGna19QH9tTEsqVV7Jf8vgAKTDPFfoYQZZf",
          masterFingerprint: "c73a4236",
          path: "m/84'/1'/0'",
        },
        {
          xpub: "tpubDDimkbNa9cUM3y6vTJ39TGGbAENXMHrH81SmY7aQZtVLcAFQSLYtzzj5PpMrfcNx2bnGjtqgPRdqRx6aWudEuqpbBWpJYPdfJQYkKec6JgY",
          masterFingerprint: "ce216582",
          path: "m/84'/1'/0'",
        },
      ],

      expected: {
        parentTxid:
          "706566f191b2d2c2f412b3f77013caa8815db467dec7aa3ff24bd7c5bccc9bdb",
        parentFee: 1550,
        parentVsize: 140.25,
        childInputCount: 1, // Only spending the parent output
        childOutputCount: 1, // Only one change output
        combinedFeeRate: 32.5, // Achieved combined fee rate
        // The exact PSBT we expect to generate for this CPFP transaction
        exactPsbt:
          "cHNidP8B+wQCAAAAAQIEAgAAAAEEAQEBBQEBAQMEAAAAAAEGAQNPAQQ1h88Dgl2SPYAAAAA1gVrVrrCaAW77pvICudYT1OgMKWDHqygcNSGGEkGHtgOdMV/Gaa1omz+62G2Nk86Bp394s033WzYxU10IL4gndhBzmxmnVAAAgAEAAIAAAACATwEENYfPA13Er/mAAAAAXIkZAJ6zR6nZcfefzibOf8yIfgZw/MEBt3mO/wcS3tUC0m1lmogMBUHKndl7pk8FE6bqDneo61acMUMLVwZ3YpYQxzpCNlQAAIABAACAAAAAgE8BBDWHzwPmwZ+cgAAAAKgJSKesi1xqjMGyDjwGyadlp3IKHoSuCeqQobWE26BsAnYI4VTYWIrnlYwnBhG0SKKBnaJTTXHYnfQVPuD75Ba0EM4hZYJUAACAAQAAgAAAAIAAAQ4g25vMvMXXS/I/qsfeZ7RdgajKE3D3sxL0wtKykfFmZXABDwQBAAAAAQDNAgAAAAABAcuZhRB270eyF5uZ9NZkes2JmYC7QzBcSM/GgxYTuikUAAAAAAD9////AgJndM4CAAAAIlEgwgRxu/eg0TNg0SfBd8xyO3SgOq0IBq+cYsfn6aSUGmkA4fUFAAAAACIAICn+8vRBEU+5VfeZTXt8FONmSZDcEXUc88e/6D+SROL/AUBCV2GrTX0G0hgsnYix+yuKPSXrgWcqQJRDLsbzviRinoL43qPokzfBpfyc66J+0GbyQWU+Bt88htzwg3AqQTF3AAAAAAEBcgDh9QUAAAAAaVIhAjY9pkhm1G9ybFB0geUquQMKOzT+pnil4pC3tJC0X2OAIQKW1q44thLR57znb7mb9hJZPubSuAQsrNk5/7aeXmniaSEDC+2bcYNaXdfUW8cvtIpX8qM5bgyuVJ+4P+fwO4J80JRTrgEFaVIhAjY9pkhm1G9ybFB0geUquQMKOzT+pnil4pC3tJC0X2OAIQKW1q44thLR57znb7mb9hJZPubSuAQsrNk5/7aeXmniaSEDC+2bcYNaXdfUW8cvtIpX8qM5bgyuVJ+4P+fwO4J80JRTriIGAjY9pkhm1G9ybFB0geUquQMKOzT+pnil4pC3tJC0X2OAGHObGadUAACAAQAAgAAAAIAAAAAAEQAAACIGApbWrji2EtHnvOdvuZv2Elk+5tK4BCys2Tn/tp5eaeJpGMc6QjZUAACAAQAAgAAAAIAAAAAAEQAAACIGAwvtm3GDWl3X1FvHL7SKV/KjOW4MrlSfuD/n8DuCfNCUGM4hZYJUAACAAQAAgAAAAIAAAAAAEQAAAAABAwgDv/UFAAAAAAEEIgAgkaeXjJOPqXV0taM43yaCh16Fv+TvQ22/sHBWVpJH+DAA",
      },
    },
  ],
  sentTransaction: [
    {
      case: "CPFP on outgoing payment - Spending change output to accelerate own transaction",
      // This simulates sending Bitcoin with a low fee, then using change output for CPFP
      // Parent tx: c04265be523006e5394a9a917a852231144000aa9926b42597cec62ea8d3c88b
      // We're spending output 1 (change output) to create a child transaction

      parentTransaction: {
        txid: "c04265be523006e5394a9a917a852231144000aa9926b42597cec62ea8d3c88b",
        hex: "01000000000101cb99851076ef47b2179b99f4d6647acd899980bb43305c48cfc6831613ba29140100000000fdffffff0200e1f50500000000160014650182549b215de6007d286966675c69bc257f881c7cd71700000000220020c7f89d9f73995d9eb8649ba845d5f49586f82fb77a7459dbf08f88a226fe93850400473044022052024c7f6aaf51ca4a3d3ca4ba235d7ba353e280e8eace3368db84d3ca8a23db02207e7aaa36792a45237c7ab5f1c261d5f8ef9335e12dc4e397f1d3145017de5c4d0147304402207db9f2762e022503b3f3af2bc4e1148a24c6167341df347824f892ad1870d342022013a6dcfd0ef04c0472f47a93e209e319d232b394e9467fa1bc979ea1f309639b016952210227c0604bf32cde2ec295801c3f699aac2d81428a9ef21e0b482e1e4061cf97662102a48d032a8d75b42cd7916504c0444fc58f4c9bc91b04f3d4fe91763d324abe192102f6e05ade9cd9226697f997b15c0bc33fc4527b7260751039bb3bc76afc5f022f53ae00000000",
        fee: 2020, // Parent transaction fee (low fee causing delay)
        vsize: 188.5,
      },

      // The parent UTXO - this is output 1 (change output) from the parent transaction
      // This output belongs to us (it's our change), so we can spend it for CPFP
      parentUtxo: {
        txid: "c04265be523006e5394a9a917a852231144000aa9926b42597cec62ea8d3c88b",
        vout: 1, // Spending output index 1 (our change output)
        value: "399997980", // Change amount in satoshis (~3.99 BTC)
        prevTxHex:
          "01000000000101cb99851076ef47b2179b99f4d6647acd899980bb43305c48cfc6831613ba29140100000000fdffffff0200e1f50500000000160014650182549b215de6007d286966675c69bc257f881c7cd71700000000220020c7f89d9f73995d9eb8649ba845d5f49586f82fb77a7459dbf08f88a226fe93850400473044022052024c7f6aaf51ca4a3d3ca4ba235d7ba353e280e8eace3368db84d3ca8a23db02207e7aaa36792a45237c7ab5f1c261d5f8ef9335e12dc4e397f1d3145017de5c4d0147304402207db9f2762e022503b3f3af2bc4e1148a24c6167341df347824f892ad1870d342022013a6dcfd0ef04c0472f47a93e209e319d232b394e9467fa1bc979ea1f309639b016952210227c0604bf32cde2ec295801c3f699aac2d81428a9ef21e0b482e1e4061cf97662102a48d032a8d75b42cd7916504c0444fc58f4c9bc91b04f3d4fe91763d324abe192102f6e05ade9cd9226697f997b15c0bc33fc4527b7260751039bb3bc76afc5f022f53ae00000000",
        witnessUtxo: {
          script: Buffer.from(
            "1c7cd7170000000069522102832b2469ca66ccb72c01ef6441160c1440d2bdb2f357c1249da8e13c82fd83322102d32d3fb26a64d5817b34bd0e46ef55252ce2888da33428f8950b07c90f43eb682103604468e7783afd6952fedfbb95de5031fdb084c7673c6c9ba69dfbec936ce4eb53ae",
            "hex",
          ),
          value: 399997980,
        },
        witnessScript: Buffer.from(
          "522102832b2469ca66ccb72c01ef6441160c1440d2bdb2f357c1249da8e13c82fd83322102d32d3fb26a64d5817b34bd0e46ef55252ce2888da33428f8950b07c90f43eb682103604468e7783afd6952fedfbb95de5031fdb084c7673c6c9ba69dfbec936ce4eb53ae",
          "hex",
        ),
        bip32Derivations: [
          {
            pubkey: Buffer.from(
              "02832b2469ca66ccb72c01ef6441160c1440d2bdb2f357c1249da8e13c82fd8332",
              "hex",
            ),
            masterFingerprint: Buffer.from("c73a4236", "hex"),
            path: "m/84'/1'/0'/1/17", // This is a change address (path 1)
          },
          {
            pubkey: Buffer.from(
              "02d32d3fb26a64d5817b34bd0e46ef55252ce2888da33428f8950b07c90f43eb68",
              "hex",
            ),
            masterFingerprint: Buffer.from("739b19a7", "hex"),
            path: "m/84'/1'/0'/1/17",
          },
          {
            pubkey: Buffer.from(
              "03604468e7783afd6952fedfbb95de5031fdb084c7673c6c9ba69dfbec936ce4eb",
              "hex",
            ),
            masterFingerprint: Buffer.from("ce216582", "hex"),
            path: "m/84'/1'/0'/1/17",
          },
        ],
      },

      availableUtxos: [], // The change output alone provides sufficient value

      spendableOutputIndex: 1, // We're spending output 1 (change) from the parent
      changeAddress:
        "bcrt1qjxne0ryn375h2a945vud7f5zsa0gt0lyaapkm0aswpt9dyj8lqcq94eqw4",
      network: Network.REGTEST,
      dustThreshold: "546",
      scriptType: P2WSH,
      requiredSigners: 2,
      totalSigners: 3,
      targetFeeRate: 32.5,
      globalXpubs: [
        {
          xpub: "tpubDCyyVFP5xvLjEtEnUd3ycp8U7m5TZwt8B9q32bBytWEVRaTSWwiWjcR27yJLtgRvJdqbrEupi3vCaDfwZPbL8ViytwYnyeTYeZeDfvyJAMc",
          masterFingerprint: "739b19a7",
          path: "m/84'/1'/0'",
        },
        {
          xpub: "tpubDCiNatUPEtNj633QZvvfweoL4VziJe33CVGi4ZKEquVsNmRnwkfqxp4QZMp1GcjcVScyXru3qGna19QH9tTEsqVV7Jf8vgAKTDPFfoYQZZf",
          masterFingerprint: "c73a4236",
          path: "m/84'/1'/0'",
        },
        {
          xpub: "tpubDDimkbNa9cUM3y6vTJ39TGGbAENXMHrH81SmY7aQZtVLcAFQSLYtzzj5PpMrfcNx2bnGjtqgPRdqRx6aWudEuqpbBWpJYPdfJQYkKec6JgY",
          masterFingerprint: "ce216582",
          path: "m/84'/1'/0'",
        },
      ],

      expected: {
        parentTxid:
          "8bc8d3a82ec6ce9725b42699aa0040143122857a919a4a39e5063052be6542c0",
        parentFee: 2020,
        parentVsize: 188.5,
        childInputCount: 1, // Only spending the parent change output
        childOutputCount: 1, // Only one output (consolidating the change)
        combinedFeeRate: 32.5, // Achieved combined fee rate
        // The exact PSBT we expect to generate for this CPFP transaction
        exactPsbt:
          "cHNidP8B+wQCAAAAAQIEAgAAAAEEAQEBBQEBAQMEAAAAAAEGAQNPAQQ1h88Dgl2SPYAAAAA1gVrVrrCaAW77pvICudYT1OgMKWDHqygcNSGGEkGHtgOdMV/Gaa1omz+62G2Nk86Bp394s033WzYxU10IL4gndhBzmxmnVAAAgAEAAIAAAACATwEENYfPA13Er/mAAAAAXIkZAJ6zR6nZcfefzibOf8yIfgZw/MEBt3mO/wcS3tUC0m1lmogMBUHKndl7pk8FE6bqDneo61acMUMLVwZ3YpYQxzpCNlQAAIABAACAAAAAgE8BBDWHzwPmwZ+cgAAAAKgJSKesi1xqjMGyDjwGyadlp3IKHoSuCeqQobWE26BsAnYI4VTYWIrnlYwnBhG0SKKBnaJTTXHYnfQVPuD75Ba0EM4hZYJUAACAAQAAgAAAAIAAAQ4gi8jTqC7GzpcltCaZqgBAFDEihXqRmko55QYwUr5lQsABDwQBAAAAAQD9ewEBAAAAAAEBy5mFEHbvR7IXm5n01mR6zYmZgLtDMFxIz8aDFhO6KRQBAAAAAP3///8CAOH1BQAAAAAWABRlAYJUmyFd5gB9KGlmZ1xpvCV/iBx81xcAAAAAIgAgx/idn3OZXZ64ZJuoRdX0lYb4L7d6dFnb8I+Ioib+k4UEAEcwRAIgUgJMf2qvUcpKPTykuiNde6NT4oDo6s4zaNuE08qKI9sCIH56qjZ5KkUjfHq18cJh1fjvkzXhLcTjl/HTFFAX3lxNAUcwRAIgfbnydi4CJQOz868rxOEUiiTGFnNB3zR4JPiSrRhw00ICIBOm3P0O8EwEcvR6k+IJ4xnSMrOU6UZ/obyXnqHzCWObAWlSIQInwGBL8yzeLsKVgBw/aZqsLYFCip7yHgtILh5AYc+XZiECpI0DKo11tCzXkWUEwERPxY9Mm8kbBPPU/pF2PTJKvhkhAvbgWt6c2SJml/mXsVwLwz/EUntyYHUQObs7x2r8XwIvU64AAAAAAQFyHHzXFwAAAABpUiECgyskacpmzLcsAe9kQRYMFEDSvbLzV8EknajhPIL9gzIhAtMtP7JqZNWBezS9DkbvVSUs4oiNozQo+JULB8kPQ+toIQNgRGjneDr9aVL+37uV3lAx/bCEx2c8bJumnfvsk2zk61OuAQVpUiECgyskacpmzLcsAe9kQRYMFEDSvbLzV8EknajhPIL9gzIhAtMtP7JqZNWBezS9DkbvVSUs4oiNozQo+JULB8kPQ+toIQNgRGjneDr9aVL+37uV3lAx/bCEx2c8bJumnfvsk2zk61OuIgYC0y0/smpk1YF7NL0ORu9VJSziiI2jNCj4lQsHyQ9D62gYc5sZp1QAAIABAACAAAAAgAEAAAARAAAAIgYCgyskacpmzLcsAe9kQRYMFEDSvbLzV8EknajhPIL9gzIYxzpCNlQAAIABAACAAAAAgAEAAAARAAAAIgYDYERo53g6/WlS/t+7ld5QMf2whMdnPGybpp377JNs5OsYziFlglQAAIABAACAAAAAgAEAAAARAAAAAAEDCHpX1xcAAAAAAQQiACCRp5eMk4+pdXS1ozjfJoKHXoW/5O9Dbb+wcFZWkkf4MAA=",
      },
    },
  ],
};
