# Caravan Fees Package

## Table of Contents

1. [Introduction](#introduction)
2. [Key Components](#key-components)
3. [Transaction Analyzer](#transaction-analyzer)
4. [BTC Transaction Template](#btc-transaction-template)
5. [RBF (Replace-By-Fee)](#rbf-replace-by-fee)
6. [CPFP (Child-Pays-For-Parent)](#cpfp-child-pays-for-parent)
7. [Usage Examples](#usage-examples)
8. [Advanced Customization](#advanced-customization)
9. [Best Practices](#best-practices)
10. [References](#references)

## Introduction

The Caravan Fees Package is a comprehensive toolkit for Bitcoin transaction fee management, focusing on Replace-By-Fee (RBF) and Child-Pays-For-Parent (CPFP) strategies. This package provides developers with powerful tools to analyze existing transactions, estimate appropriate fees, and create new transactions for fee bumping purposes.

### Why Use This Package?

- **Simplified Fee Management**: Automates complex calculations for RBF and CPFP.
- **Flexible Transaction Building**: Utilizes a template-based approach for creating new transactions.
- **Comprehensive Transaction Analysis**: Provides detailed insights into transaction properties and fee structures.
- **Customizable**: Allows for fine-tuned control over fee strategies and transaction construction.

## Key Components

The package consists of several key components:

1. **Transaction Analyzer**: Analyzes existing transactions and provides recommendations.
2. **BTC Transaction Template**: A flexible class for building new Bitcoin transactions.
3. **RBF Functions**: Utilities for creating Replace-By-Fee transactions.
4. **CPFP Functions**: Utilities for creating Child-Pays-For-Parent transactions.
5. **Utility Functions**: Helper functions for various Bitcoin-related calculations.

## Transaction Analyzer

The `TransactionAnalyzer` class is the cornerstone of the package, providing comprehensive analysis of Bitcoin transactions.

### Features:

- Analyzes transaction inputs, outputs, fees, and size.
- Determines RBF and CPFP eligibility.
- Recommends optimal fee bumping strategy.
- Estimates fees for RBF and CPFP operations.

### Usage:

```javascript
const analyzer = new TransactionAnalyzer({
  txHex: "raw_transaction_hex",
  network: Network.MAINNET,
  targetFeeRate: 5, // sats/vbyte
  absoluteFee: "1000", // in satoshis
  availableUtxos: [...], // array of available UTXOs
  requiredSigners: 2,
  totalSigners: 3,
  addressType: "P2WSH"
});

const analysis = analyzer.analyze();
console.log(analysis);

```

## Example Output

```json
{
  "txid": "1a2b3c4d5e6f...",
  "vsize": 140,
  "weight": 560,
  "fee": "1000",
  "feeRate": 7.14,
  "inputs": [...],
  "outputs": [...],
  "isRBFSignaled": true,
  "canRBF": true,
  "canCPFP": true,
  "recommendedStrategy": "RBF",
  "estimatedRBFFee": "1200",
  "estimatedCPFPFee": "1500"
}
```

# BTC Transaction Template

The `BtcTransactionTemplate` class provides a flexible way to construct new Bitcoin transactions, particularly useful for RBF and CPFP operations.

## Why Use a Template?

The template approach offers several advantages:

- **Flexibility**: Easily add, remove, or modify inputs and outputs.
- **Incremental Building**: Build transactions step-by-step, adjusting as needed and validating as needed.
- **Fee Management**: Automatically calculate and adjust fees based on target rates.
- **Change Handling**: Dynamically manage change outputs.

## Key Methods

- **`addInput(input: BtcTxInputTemplate)`**: Add a new input to the transaction.
- **`addOutput(output: BtcTxOutputTemplate)`**: Add a new output to the transaction.
- **`adjustChangeOutput()`**: Automatically adjust the change output based on fees.
- **`validate()`**: Ensure the transaction meets all necessary criteria.
- **`toPsbt()`**: Convert the transaction to a Partially Signed Bitcoin Transaction (PSBT).

## Usage Example

```javascript
const txTemplate = new BtcTransactionTemplate({
  targetFeeRate: 5,
  dustThreshold: "546",
  network: Network.MAINNET,
  scriptType: "P2WSH",
  requiredSigners: 2,
  totalSigners: 3,
});

txTemplate.addInput(
  new BtcTxInputTemplate({
    txid: "previous_txid",
    vout: 0,
    amountSats: "100000",
  }),
);

txTemplate.addOutput(
  new BtcTxOutputTemplate({
    address: "recipient_address",
    amountSats: "90000",
    type: TxOutputType.EXTERNAL,
  }),
);

txTemplate.adjustChangeOutput();

if (txTemplate.validate()) {
  const psbt = txTemplate.toPsbt();
  console.log("PSBT:", psbt);
}
```

## RBF (Replace-By-Fee)

The RBF functionality allows for the creation of transactions that replace existing unconfirmed transactions with higher fee versions.

### Key Functions

- **`createCancelRbfTransaction`**: Creates a transaction that cancels an existing unconfirmed transaction.
- **`createAcceleratedRbfTransaction`**: Creates a transaction that accelerates an existing unconfirmed transaction.

### RBF Calculations

The package provides flexibility in defining constraints for fee bumping while ensuring compliance with BIP125 rules.
It performs the following key actions:

- Allows users to specify custom fee rate and absolute fee targets.
- Ensures the new transaction meets BIP125 requirements, including:
  - At least one input from the original transaction.
  - New fee must be higher than the old fee.
  - New absolute fee must meet the minimum relay fee requirement.
- Performs sanity checks to prevent overpayment and ensure transaction validity.

## Usage Example

```javascript
const cancelRbfTx = createCancelRbfTransaction({
  originalTx: "020000000001...", // original transaction hex
  availableInputs: [
    { txid: "abc123...", vout: 0, value: "10000" },
    // ... more UTXOs
  ],
  cancelAddress: "bc1q...",
  network: Network.MAINNET,
  dustThreshold: "546",
  scriptType: "P2WSH",
  requiredSigners: 2,
  totalSigners: 3,
  targetFeeRate: 5,
  absoluteFee: "1000",
  fullRBF: false,
  strict: true,
});

console.log("Cancel RBF PSBT:", cancelRbfTx);
// Example output:
// Cancel RBF PSBT: cHNidP8BAH0CAAAAAbhbgd8Rm7xkjyGgIPz/tQm8YUH4xXcK...
```

## CPFP (Child-Pays-For-Parent)

The **CPFP** functionality allows for the creation of child transactions that increase the effective fee rate of unconfirmed parent transactions.

### Key Function

**`createCPFPTransaction`**: Creates a child transaction that spends an output from an unconfirmed parent transaction, including a higher fee to incentivize confirmation of both transactions.

### CPFP Calculations

The package calculates the necessary fee for the child transaction to bring the overall package (parent + child) fee rate up to the desired level using the following formula:

```plaintext
child_fee = (target_fee_rate * (parent_size + child_size)) - parent_fee
```

## Usage Example

```javascript
const cpfpTx = createCPFPTransaction({
  originalTx: "020000000001...", // original transaction hex
  availableInputs: [
    { txid: "def456...", vout: 1, value: "20000" },
    // ... more UTXOs
  ],
  spendableOutputIndex: 1,
  changeAddress: "bc1q...",
  network: Network.MAINNET,
  dustThreshold: "546",
  scriptType: "P2WSH",
  targetFeeRate: 10,
  absoluteFee: "1000",
  requiredSigners: 2,
  totalSigners: 3,
  strict: true,
});

console.log("CPFP PSBT:", cpfpTx);
// Example output:
// CPFP PSBT: cHNidP8BAH0CAAAAAT+X8zhpWKt0cK8nYEslhQLwCxFR5Zk3wl...
```

### Manual RBF Implementation:

```javascript
// Analyze the original transaction
const analyzer = new TransactionAnalyzer({...});
const analysis = analyzer.analyze();

// Create a new transaction template
const rbfTemplate = new BtcTransactionTemplate({...});

// Add at least one input from the original transaction
const originalInput = analysis.inputs[0];
rbfTemplate.addInput(new BtcTxInputTemplate({
  txid: originalInput.txid,
  vout: originalInput.vout,
  amountSats: originalInput.amountSats
}));

// Add more inputs if necessary
while (!rbfTemplate.areFeesPaid()) {
  // Add additional input...
}

// Add outputs (keeping original outputs for acceleration, or new output for cancellation)
analysis.outputs.forEach(output => {
  rbfTemplate.addOutput(new BtcTxOutputTemplate({
    address: output.address,
    amountSats: output.value.toString(),
    type: TxOutputType.EXTERNAL
  }));
});

// Adjust change output
rbfTemplate.adjustChangeOutput();

// Validate and create PSBT
if (rbfTemplate.validate()) {
  const psbt = rbfTemplate.toPsbt();
  console.log("RBF PSBT:", psbt);
}
```

### Manual CPFP Implementation:

```javascript
// Analyze the parent transaction
const analyzer = new TransactionAnalyzer({...});
const analysis = analyzer.analyze();

// Create a new transaction template for the child
const cpfpTemplate = new BtcTransactionTemplate({...});

// Add the spendable output from the parent as an input
const parentOutput = analysis.outputs[spendableOutputIndex];
cpfpTemplate.addInput(new BtcTxInputTemplate({
  txid: analysis.txid,
  vout: spendableOutputIndex,
  amountSats: parentOutput.value.toString()
}));

// Add a change output
cpfpTemplate.addOutput(new BtcTxOutputTemplate({
  address: changeAddress,
  amountSats: "0", // Will be adjusted later
  type: TxOutputType.CHANGE
}));

// Add additional inputs if necessary
while (!cpfpTemplate.areFeesPaid()) {
  // Add additional input...
}

// Adjust change output
cpfpTemplate.adjustChangeOutput();

// Validate and create PSBT
if (cpfpTemplate.validate()) {
  const psbt = cpfpTemplate.toPsbt();
  console.log("CPFP PSBT:", psbt);
}
```

## Advanced Customization

The package allows for advanced customization through various options:

- **Custom Fee Calculations**: Implement custom fee estimation logic by extending the `TransactionAnalyzer` class.
- **Transaction Templates**: Create custom transaction templates for specific use cases by extending `BtcTransactionTemplate`.

## Best Practices

- **Validate Transactions**: Always validate transactions before broadcasting.
- **Consider Mempool State**: Consider the mempool state and current network conditions when setting fee rates.
- **Use Strict Mode**: Use the strict mode in RBF/CPFP transactions for mission-critical operations.
- **Update Regularly**: Regularly update the package to ensure compatibility with the latest Bitcoin network rules.

## References

- **[BIP 125: Opt-in Full Replace-by-Fee Signaling](https://github.com/bitcoin/bips/blob/master/bip-0125.mediawiki)**
- **[Bitcoin Core RBF Implementation](https://github.com/bitcoin/bitcoin/pull/6871)**
- **[Bitcoin Optech: Replace-by-Fee](https://bitcoinops.org/en/topics/replace-by-fee/)**
- **[Bitcoin Optech: Child Pays for Parent](https://bitcoinops.org/en/topics/cpfp/)**
- **[BIP 174: Partially Signed Bitcoin Transaction Format](https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki)**

This package provides a comprehensive solution for managing Bitcoin transaction fees, particularly focusing on RBF and CPFP strategies. By leveraging the `TransactionAnalyzer` and `BtcTransactionTemplate` classes, developers can easily implement complex fee bumping strategies in their applications, ensuring efficient and timely transaction processing on the Bitcoin network.
