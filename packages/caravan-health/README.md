# Caravan-Health

The `@caravan/health` package is a toolkit for analyzing and scoring the privacy and fee spending efficiency of Bitcoin transactions and wallets. Wallet health is determined by various factors including financial privacy, transaction fees, and the avoidance of dust outputs. It provides metrics and algorithms to evaluate various aspects of transaction behavior, UTXO management, and fee strategies.

# Defining Wallet Health Goals

Different users have diverse needs and preferences which impact their wallet health goals. Some users prioritize financial privacy, others focus on minimizing transaction fees, and some want a healthy wallet without delving into the technical details of UTXOs and transactions. The `@caravan/health ` package aims to highlight metrics for wallet health and provide suggestions for improvement.

# Features

## Privacy Metrics

The `PrivacyMetrics` class offers tools to assess the privacy of Bitcoin transactions and wallets:

- **Topology Score:** Evaluates transaction privacy based on input/output structure.
- **Mean Transaction Topology Score:** Calculates the average privacy score across all wallet transactions.
- **Address Reuse Factor (ARF):** Measures the extent of address reuse within the wallet.
- **Address Type Factor (ATF):** Evaluates the diversity of address types used in transactions.
- **UTXO Spread Factor:** Assesses the dispersion of UTXO values to gauge traceability resistance.
- **UTXO Value Dispersion Factor:** Combines UTXO spread and mass factors for a comprehensive view.
- **Weighted Privacy Score:** Provides an overall privacy health score for the wallet.

## Waste Metrics

The `WasteMetrics` class focuses on transaction fee efficiency and UTXO management:

- **Relative Fees Score (RFS):** Compares transaction fees to others in the same block.
- **Fees To Amount Ratio (FAR):** Evaluates the proportion of fees to transaction amounts.
- **calculateDustLimits:** Calculates the dust limits for UTXOs based on the current fee rate. A utxo is dust if it costs more to send based on the size of the input.
- **Weighted Waste Score (WWS):** Combines various metrics for an overall efficiency score.

## Transaction Analysis

The [transaction.ts](./src/transaction.ts) file has various utilities (or will have ;D) for analyzing an isolated transaction.

- **calculateWasteMetric:** Calculates the waste metric for a given coin selection and current and expected fee rates. This is based on bitcoin core's algorithm used for coin selection and the research done by Murch.

TODO:

- **Fingerprinting Analysis:** Analyze how easily a transaction exposes your wallet to fingerprinting by blockchain observers.

# Dependencies

This library depends on the `@caravan/clients` and `@caravan/bitcoin` package for type validations and preparing some of the required data for that type.

# Usage

To use the Caravan Health Library, you'll need to import the necessary classes and types

```javascript
import {
  PrivacyMetrics,
  WasteMetrics,
  AddressUtxos,
  SpendType,
} from "@caravan/health";
import { Transaction, FeeRatePercentile } from "@caravan/clients";
import { Network, MultisigAddressType } from "@caravan/bitcoin";

const transactions : Transaction[] = [];
const utxos: AddressUtxos = {};
const walletAddressType : MultisigAddressType = "P2SH";
const network : Network = "mainnet";
const feeRatePercentileHistory : FeeRatePercentile[]

// Initialize classes for health analysis
const privacyMetrics = new PrivacyMetrics(transactions,utxos);
const wasteMetrics = new WasteMetrics(transactions,utxos);

// For example use metric that calculates overall privacy score
const privacyScore = privacyMetrics.getWalletPrivacyScore(
  walletAddressType,
  network,
);

// For example use metric that calculates overall waste score
const wasteScore = wasteMetrics.weightedWasteScore(
  feeRatePercentileHistory,
);
```

# TODOs

- [] Expand the test cases for privacy and waste metrics to cover every possible case.
- [] Add links to each algorithm and the corresponding explanation in final research document.
