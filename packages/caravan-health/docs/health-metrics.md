# Caravan Health Research Document

## Introduction

The `@caravan/health` package analyzes privacy and fee efficiency in Bitcoin wallets. Below are the metrics and their corresponding implementations.

# Privacy Metrics Documentation

This document explains the privacy algorithms used in `caravan-health` and provides links to their implementations.

---

## 1️⃣ Topology Score

- **Definition:** Evaluates privacy based on transaction topology.
- **Implementation:** [`getTopologyScore()`](GITHUB_REPO_URL/blob/main/package/caravan-health/src/privacy.ts#LXX)
- **Calculation:** Determines the transaction type and assigns a privacy score.
- **More Info:** [Deniability in Bitcoin Transactions](https://www.truthcoin.info/blog/deniability/)

---

## 2️⃣ Mean Transaction Topology Privacy Score (MTPS)

- **Definition:** The average topology score across transactions.
- **Implementation:** [`getMeanTopologyScore()`](GITHUB_REPO_URL/blob/main/package/caravan-health/src/privacy.ts#LXX)

---

## 3️⃣ Address Reuse Factor (ARF)

- **Definition:** Measures the extent of address reuse.
- **Implementation:** [`addressReuseFactor()`](GITHUB_REPO_URL/blob/main/package/caravan-health/src/privacy.ts#LXX)

---

## 4️⃣ Address Type Factor (ATF)

- **Definition:** Evaluates the variety of address types used in transactions.
- **Implementation:** [`addressTypeFactor()`](GITHUB_REPO_URL/blob/main/package/caravan-health/src/privacy.ts#LXX)

---

## 5️⃣ UTXO Spread Factor

- **Definition:** Measures the distribution of UTXO values.
- **Implementation:** [`utxoSpreadFactor()`](GITHUB_REPO_URL/blob/main/package/caravan-health/src/privacy.ts#LXX)

---

## 6️⃣ UTXO Value Dispersion Factor (UVDF)

- **Definition:** Combines UTXO spread and mass factors to evaluate privacy.
- **Implementation:** [`utxoValueDispersionFactor()`](GITHUB_REPO_URL/blob/main/package/caravan-health/src/privacy.ts#LXX)

---

## 7️⃣ Weighted Privacy Score (WPS)

- **Definition:** A weighted combination of all privacy metrics to evaluate overall privacy health.
- **Implementation:** [`getWalletPrivacyScore()`](GITHUB_REPO_URL/blob/main/package/caravan-health/src/privacy.ts#LXX)
