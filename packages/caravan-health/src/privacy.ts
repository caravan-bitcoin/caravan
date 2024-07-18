import { BlockchainClient } from "@caravan/clients";
import type { UTXO, Transaction } from "@caravan/clients/src/client";

export interface WalletUTXOs {
  address: string;
  utxos: Array<UTXO>;
}

/*
The methodology for calculating a privacy score (p_score) for Bitcoin transactions based 
on the number of inputs and outputs is the primary point to define wallet health for privacy. 
The score is further influenced by several factors such as address reuse, 
address types and UTXO set fingerprints etc.

More on the algorithms for scoring privacy: <TODO : Add Link to Blog Post>
*/

// A normalizing quantity that increases the score by a certain factor in cases of self-payment.
// More about deniability : https://www.truthcoin.info/blog/deniability/
const DENIABILITY_FACTOR = 1.5;

/*
The p_score is calculated by evaluating the likelihood of self-payments, the involvement of 
change outputs and the type of transaction based on number of inputs and outputs.

We have 5 categories of transaction type
- Sweep Spend
- Simple Spend
- UTXO Fragmentation
- Consolidation
- CoinJoin
*/
enum SpendType {
  SweepSpend = "SweepSpend",
  SimpleSpend = "SimpleSpend",
  UTXOFragmentation = "UTXOFragmentation",
  Consolidation = "Consolidation",
  MixingOrCoinJoin = "MixingOrCoinJoin",
}

function SpendTypeScores(
  spendType: SpendType,
  numberOfInputs: number,
  numberOfOutputs: number,
): number {
  switch (spendType) {
    case SpendType.SweepSpend:
      return 1 / 2;
    case SpendType.SimpleSpend:
      return 4 / 9;
    case SpendType.UTXOFragmentation:
      return 2 / 3 - 1 / numberOfOutputs;
    case SpendType.Consolidation:
      return 1 / numberOfInputs;
    case SpendType.MixingOrCoinJoin:
      let x = Math.pow(numberOfOutputs, 2) / numberOfInputs;
      return (0.75 * x) / (1 + x);
  }
}

function determineSpendType(inputs: number, outputs: number): SpendType {
  if (inputs === 1) {
    if (outputs === 1) return SpendType.SweepSpend;
    if (outputs === 2) return SpendType.SimpleSpend;
    return SpendType.UTXOFragmentation;
  } else {
    if (outputs === 1) return SpendType.Consolidation;
    return SpendType.MixingOrCoinJoin;
  }
}

export function privscyScoreByTxTopology(
  transaction: Transaction,
  client: BlockchainClient,
): number {
  const numberOfInputs: number = transaction.vin.length;
  const numberOfOutputs: number = transaction.vout.length;

  const spendType: SpendType = determineSpendType(
    numberOfInputs,
    numberOfOutputs,
  );
  const score: number = SpendTypeScores(
    spendType,
    numberOfInputs,
    numberOfOutputs,
  );
  if (
    isSelfPayment(transaction, client) &&
    spendType !== SpendType.Consolidation
  ) {
    return score * DENIABILITY_FACTOR;
  }
  return score;
}

/*
Determine whether a Bitcoin transaction is a self-payment, meaning the sender and recipient
are the same entity. To check this, we make an RPC call to the watcher wallet asking for the
amount that a given address holds. If the call returns a number then it is part of wallet
otherwise it is not a self payment.
*/
function isSelfPayment(
  transaction: Transaction,
  client: BlockchainClient,
): boolean {
  transaction.vout.forEach(async (op) => {
    if ((await client.getAddressStatus(op.scriptPubkeyAddress)) === undefined) {
      return false;
    }
  });
  return true;
}

/* 
In order to score for address reuse we can check the amount being hold by reused UTXOs 
with respect to the total amount
*/
export async function addressReuseFactor(
  utxos: Array<WalletUTXOs>,
  client: BlockchainClient,
): Promise<number> {
  let reusedAmount: number = 0;
  let totalAmount: number = 0;

  for (const utxo of utxos) {
    const address = utxo.address;
    const reused = await isReusedAddress(address, client);

    const amount = utxo.utxos.reduce((sum, utxo) => sum + utxo.value, 0);
    if (reused) {
      reusedAmount += amount;
    }
    totalAmount += amount;
  }

  return reusedAmount / totalAmount;
}

async function isReusedAddress(
  address: string,
  client: BlockchainClient,
): Promise<boolean> {
  let txs: Array<Transaction> = await client.getAddressTransactions(address);
  if (txs.length > 1) {
    return true;
  }
  return false;
}
/*
If we are making payment to other wallet types then the privacy score should decrease because 
the change received will be to an address type matching our wallet and it will lead to a deduction that
we still own that amount.
*/
export function addressTypeFactor(
  transactions: Array<Transaction>,
  walletAddressType: string,
): number {
  let P2WSH: number = 0;
  let P2PKH: number = 0;
  let P2SH: number = 0;
  let atf: number = 1;
  transactions.forEach((tx) => {
    tx.vout.forEach((output) => {
      let address = output.scriptPubkeyAddress;
      if (address.startsWith("bc")) {
        //Bech 32 Native Segwit (P2WSH) or Taproot
        P2WSH += 1;
      } else if (address.startsWith("1")) {
        // Legacy (P2PKH)
        P2PKH += 1;
      } else {
        // Segwith (P2SH)
        P2SH += 1;
      }
    });
  });

  if (walletAddressType == "P2WSH" && P2WSH != 0 && (P2SH != 0 || P2PKH != 0)) {
    atf = 1 / (P2WSH + 1);
  } else if (
    walletAddressType == "P2PKH" &&
    P2PKH != 0 &&
    (P2SH != 0 || P2WSH != 0)
  ) {
    atf = 1 / (P2PKH + 1);
  } else if (
    walletAddressType == "P2SH" &&
    P2SH != 0 &&
    (P2WSH != 0 || P2PKH != 0)
  ) {
    atf = 1 / (P2SH + 1);
  } else {
    atf = 1;
  }
  return atf;
}

/* 
The spread factor using standard deviation helps in assessing the dispersion of UTXO values.
In Bitcoin privacy, spreading UTXOs reduces traceability by making it harder for adversaries
to link transactions and deduce the ownership and spending patterns of users.
*/
export function utxoSpreadFactor(utxos: Array<WalletUTXOs>): number {
  const amounts: Array<number> = utxos.map((utxo) =>
    utxo.utxos.reduce((sum, utxo) => sum + utxo.value, 0),
  );
  const mean: number =
    amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
  const variance: number =
    amounts.reduce((sum, amount) => sum + Math.pow(amount - mean, 2), 0) /
    amounts.length;
  const stdDev: number = Math.sqrt(variance);
  return stdDev / (stdDev + 1);
}

/* 
The weightage is ad-hoc to normalize the privacy score based on the number of UTXOs in the set.
- 0 for UTXO set length >= 50
- 0.25 for UTXO set length >= 25 and <= 49
- 0.5 for UTXO set length >= 15 and <= 24
- 0.75 for UTXO set length >= 5 and <= 14
- 1 for UTXO set length < 5
*/
export function utxoSetLengthWeight(utxos: Array<WalletUTXOs>): number {
  let utxoSetLength = utxos.reduce((sum, utxo) => sum + utxo.utxos.length, 0);
  let weight: number;
  if (utxoSetLength >= 50) {
    weight = 0;
  } else if (utxoSetLength >= 25 && utxoSetLength <= 49) {
    weight = 0.25;
  } else if (utxoSetLength >= 15 && utxoSetLength <= 24) {
    weight = 0.5;
  } else if (utxoSetLength >= 5 && utxoSetLength <= 14) {
    weight = 0.75;
  } else {
    weight = 1;
  }
  return weight;
}

/*
UTXO Value Weightage Factor is a combination of UTXO Spread Factor and UTXO Set Length Weight.
It signifies the combined effect of how well spreaded the UTXO Set is and how many number of UTXOs are there.
*/
export function utxoValueWeightageFactor(utxos: Array<WalletUTXOs>): number {
  let W: number = utxoSetLengthWeight(utxos);
  let USF: number = utxoSpreadFactor(utxos);
  return (USF + W) * 0.15 - 0.15;
}

/*
The privacy score is a combination of all the factors calculated above.
- Privacy Score based on Inputs and Outputs
- Address Reuse Factor (R.F) : p_adjusted = p_score * (1 - 0.5 * r.f) + 0.10 * (1 - r.f)
- Address Type Factor (A.T.F) : p_adjusted = p_score * (1-A.T.F)
- UTXO Value Weightage Factor (U.V.W.F) : p_adjusted = p_score + U.V.W.F
*/
export async function privacyScore(
  transactions: Array<Transaction>,
  utxos: Array<WalletUTXOs>,
  walletAddressType: string,
  client: BlockchainClient,
): Promise<number> {
  let privacyScore =
    transactions.reduce(
      (sum, tx) => sum + privscyScoreByTxTopology(tx, client),
      0,
    ) / transactions.length;

  // Adjusting the privacy score based on the address reuse factor
  let addressReusedFactor = await addressReuseFactor(utxos, client);
  privacyScore =
    privacyScore * (1 - 0.5 * addressReusedFactor) +
    0.1 * (1 - addressReusedFactor);

  // Adjusting the privacy score based on the address type factor
  privacyScore =
    privacyScore * (1 - addressTypeFactor(transactions, walletAddressType));

  // Adjusting the privacy score based on the UTXO set length and value weightage factor
  privacyScore = privacyScore + 0.1 * utxoValueWeightageFactor(utxos);

  return privacyScore;
}
