import { MultisigAddressType } from "@caravan/bitcoin";
import { PsbtV2 } from "@caravan/psbt";
import { BigNumber } from "bignumber.js";

import { createCPFPTransaction } from "../cpfp";
import { TransactionAnalyzer } from "../transactionAnalyzer";
import {
  calculateTotalInputValue,
  calculateTotalOutputValue,
  reverseHex,
} from "../utils";

import { cpfpPsbtFixtures } from "./psbtTestCpfp.fixtures";

describe("CPFP PSBT Recreation Tests", () => {
  describe("Receiving Transaction CPFP", () => {
    it.each(cpfpPsbtFixtures.receivingTransaction)("$case", (fixture) => {
      const cpfpPsbtBase64 = createCPFPTransaction({
        originalTx: fixture.parentTransaction.hex,
        network: fixture.network,
        targetFeeRate: fixture.targetFeeRate,
        absoluteFee: fixture.parentTransaction.fee.toString(),
        availableInputs: fixture.availableUtxos,
        requiredSigners: fixture.requiredSigners,
        totalSigners: fixture.totalSigners,
        scriptType: fixture.scriptType as MultisigAddressType,
        dustThreshold: fixture.dustThreshold,
        spendableOutputIndex: fixture.spendableOutputIndex,
        parentUtxo: fixture.parentUtxo, //  parent UTXO
        changeAddress: fixture.changeAddress,
        globalXpubs: fixture.globalXpubs,
      });

      const generatedPsbt = new PsbtV2(cpfpPsbtBase64);
      const expectedPsbt = new PsbtV2(fixture.expected.exactPsbt, true);

      // === STRUCTURAL VERIFICATION ===
      // Verify the basic transaction structure matches expectations

      expect(generatedPsbt.PSBT_GLOBAL_INPUT_COUNT).toBe(
        fixture.expected.childInputCount,
      );
      expect(generatedPsbt.PSBT_GLOBAL_OUTPUT_COUNT).toBe(
        fixture.expected.childOutputCount,
      );

      // === PARENT UTXO VERIFICATION ===
      // Verify that we're correctly spending from the parent transaction

      expect(reverseHex(generatedPsbt.PSBT_IN_PREVIOUS_TXID[0])).toBe(
        fixture.expected.parentTxid,
      );
      expect(generatedPsbt.PSBT_IN_OUTPUT_INDEX[0]).toBe(
        fixture.spendableOutputIndex,
      );

      // === PSBT METADATA VERIFICATION ===
      // Ensure all necessary signing information is present and correct

      // Witness UTXO data must be present for segwit transactions
      expect(generatedPsbt.PSBT_IN_WITNESS_UTXO[0]).toBeDefined();
      expect(generatedPsbt.PSBT_IN_WITNESS_UTXO[0]).not.toBeNull();

      // Witness script is required for P2WSH multisig spending
      expect(generatedPsbt.PSBT_IN_WITNESS_SCRIPT[0]).toBeDefined();
      expect(generatedPsbt.PSBT_IN_WITNESS_SCRIPT[0]).not.toBeNull();

      // BIP32 derivations are essential for hardware wallet signing
      expect(generatedPsbt.PSBT_IN_BIP32_DERIVATION[0]).toBeDefined();
      expect(generatedPsbt.PSBT_IN_BIP32_DERIVATION[0].length).toBe(
        fixture.totalSigners,
      );

      // === GLOBAL XPUB VERIFICATION ===
      // Verify that global xpubs are included for wallet context

      expect(generatedPsbt.PSBT_GLOBAL_XPUB).toBeDefined();
      expect(generatedPsbt.PSBT_GLOBAL_XPUB.length).toBe(
        fixture.globalXpubs.length,
      );

      fixture.globalXpubs.forEach((expectedXpub, index) => {
        const psbtXpub = generatedPsbt.PSBT_GLOBAL_XPUB[index];
        expect(psbtXpub).toBeDefined();

        // Verify the master fingerprint is correctly encoded
        if (psbtXpub.value) {
          const valueBuffer = Buffer.from(psbtXpub.value, "hex");
          const fingerprint = valueBuffer.slice(0, 4).toString("hex");
          expect(fingerprint).toBe(expectedXpub.masterFingerprint);
        }
      });

      // === FEE CALCULATION VERIFICATION ===
      // Verify that the CPFP achieves the target combined fee rate

      const totalInputAmount = calculateTotalInputValue(generatedPsbt);
      const totalOutputAmount = calculateTotalOutputValue(generatedPsbt);
      const childFee = totalInputAmount.minus(totalOutputAmount);

      // Calculate combined fee rate (parent + child fees over combined vsize)
      const parentFee = new BigNumber(fixture.expected.parentFee);
      const combinedFee = parentFee.plus(childFee);
      const combinedVsize = fixture.expected.parentVsize + 116; // Estimated child vsize
      const combinedFeeRate = combinedFee.dividedBy(combinedVsize);

      // Verify we achieved approximately the target fee rate
      expect(combinedFeeRate.toNumber()).toBeCloseTo(
        fixture.expected.combinedFeeRate,
        1,
      );

      // === EXACT PSBT BINARY VERIFICATION ===
      // This is the most important test - verify exact PSBT binary output
      // This catches any subtle changes in PSBT generation that might break compatibility

      expect(generatedPsbt.serialize("base64")).toBe(
        expectedPsbt.serialize("base64"),
      );
    });
  });
});

describe("Sent Transaction CPFP", () => {
  it.each(cpfpPsbtFixtures.sentTransaction)("$case", (fixture) => {
    const cpfpPsbtBase64 = createCPFPTransaction({
      originalTx: fixture.parentTransaction.hex,
      network: fixture.network,
      targetFeeRate: fixture.targetFeeRate,
      absoluteFee: fixture.parentTransaction.fee.toString(),
      availableInputs: fixture.availableUtxos,
      requiredSigners: fixture.requiredSigners,
      totalSigners: fixture.totalSigners,
      scriptType: fixture.scriptType as MultisigAddressType,
      dustThreshold: fixture.dustThreshold,
      spendableOutputIndex: fixture.spendableOutputIndex,
      parentUtxo: fixture.parentUtxo, // The change output
      changeAddress: fixture.changeAddress,
      globalXpubs: fixture.globalXpubs,
    });

    const generatedPsbt = new PsbtV2(cpfpPsbtBase64);
    const expectedPsbt = new PsbtV2(fixture.expected.exactPsbt, true);

    // === CHANGE OUTPUT SPECIFIC VERIFICATION ===
    // When spending change outputs, we need to verify the derivation path is correct

    expect(reverseHex(generatedPsbt.PSBT_IN_PREVIOUS_TXID[0])).toBe(
      fixture.expected.parentTxid,
    );
    expect(generatedPsbt.PSBT_IN_OUTPUT_INDEX[0]).toBe(
      fixture.spendableOutputIndex,
    );

    // Verify this is indeed a change output (derivation path should include '/1/')
    // Change addresses use path m/84'/1'/0'/1/* while receiving addresses use m/84'/1'/0'/0/*
    const bip32Derivation = generatedPsbt.PSBT_IN_BIP32_DERIVATION[0][0];
    expect(bip32Derivation).toBeDefined();

    // The derivation should indicate this is a change address
    // (We can't easily decode the path here, but the fixture verification ensures correctness)

    // === CONSOLIDATION VERIFICATION ===
    // CPFP on sent transactions often consolidates change back to a single output

    expect(generatedPsbt.PSBT_GLOBAL_INPUT_COUNT).toBe(
      fixture.expected.childInputCount,
    );
    expect(generatedPsbt.PSBT_GLOBAL_OUTPUT_COUNT).toBe(
      fixture.expected.childOutputCount,
    );

    // === EXACT BINARY MATCH ===
    // Final verification that we generate the exact expected PSBT

    expect(generatedPsbt.serialize("base64")).toBe(
      expectedPsbt.serialize("base64"),
    );
  });
});

describe("Transaction Analysis Integration", () => {
  it("should properly analyze CPFP suitability for receiving transactions", () => {
    const fixture = cpfpPsbtFixtures.receivingTransaction[0];

    // Analyze the parent transaction to verify CPFP is recommended
    const analyzer = new TransactionAnalyzer({
      txHex: fixture.parentTransaction.hex,
      network: fixture.network,
      targetFeeRate: fixture.targetFeeRate,
      absoluteFee: fixture.parentTransaction.fee.toString(),
      availableUtxos: [fixture.parentUtxo], // Include the parent UTXO
      requiredSigners: fixture.requiredSigners,
      totalSigners: fixture.totalSigners,
      addressType: fixture.scriptType as MultisigAddressType,
      changeOutputIndex: fixture.spendableOutputIndex,
    });

    const analysis = analyzer.analyze();

    // Should recommend CPFP for low-fee transactions
    expect(analysis.canCPFP).toBe(true);
  });

  it("should handle sent transaction analysis correctly", () => {
    const fixture = cpfpPsbtFixtures.sentTransaction[0];

    const analyzer = new TransactionAnalyzer({
      txHex: fixture.parentTransaction.hex,
      network: fixture.network,
      targetFeeRate: fixture.targetFeeRate,
      absoluteFee: fixture.parentTransaction.fee.toString(),
      availableUtxos: [fixture.parentUtxo],
      requiredSigners: fixture.requiredSigners,
      totalSigners: fixture.totalSigners,
      addressType: fixture.scriptType as MultisigAddressType,
      changeOutputIndex: fixture.spendableOutputIndex,
    });

    const analysis = analyzer.analyze();

    // Should identify the change output as spendable
    expect(analysis.canCPFP).toBe(true);

    // Should calculate appropriate package size
    expect(analyzer.CPFPPackageSize).toBeGreaterThan(
      fixture.expected.parentVsize,
    );
  });
});
