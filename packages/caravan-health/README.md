# Caravan-Health

The `caravan-health` package is designed to help users maintain the health of their bitcoin wallets. Wallet health is determined by various factors including financial privacy, transaction fees, and the avoidance of dust outputs. This README will guide you through understanding wallet health goals, scoring metrics, and how to use the caravan-health package to achieve optimal wallet health.

# Defining Wallet Health Goals

Different users have diverse needs and preferences which impact their wallet health goals. Some users prioritize financial privacy, others focus on minimizing transaction fees, and some want a healthy wallet without delving into the technical details of UTXOs and transactions. The caravan-health package aims to highlight metrics for wallet health and provide suggestions for improvement.

# Wallet Health Goals:

- Protect financial privacy
- Minimize long-term and short-term fee rates
- Avoid creating dust outputs
- Determine when to consolidate and when to conserve UTXOs
- Manage spending frequency and allow simultaneous payments

---

# Scoring Metrics for health analysis

## Privacy Metrics

1. Reuse Factor (R.F)

Measures the extent to which addresses are reused. Lower reuse factor improves privacy.

2. Address Type Factor (A.T.F)

Assesses privacy based on the diversity of address types used in transactions.

3. UTXO Spread Factor (U.S.F)

Evaluates the spread of UTXO values to gauge privacy. Higher spread indicates better privacy.

4. Weightage on Number of UTXOs (W)

Considers the number of UTXOs in the wallet.

5. UTXO Value Dispersion Factor (U.V.D.F)

Combines UTXO spread and weightage on number of UTXOs. Adjusts privacy score based on UTXO value dispersion and quantity.

# Waste Metrics

1. Relative Fee Score (R.F.S)

Measures the fee rate compared to historical data. It can be associated with all the transactions and we can give a measure
if any transaction was done at expensive fees or nominal fees.

2. Fee-to-Amount Percent Score (F.A.P.S)

Ratio of fees paid to the transaction amount. Lower percentage signifies better fee efficiency.

3. Weightage on Number of UTXOs (W)

Considers the number of UTXOs.

## TODOs

- [] Extent the test cases for privacy and waste metrics to cover every possible case.
