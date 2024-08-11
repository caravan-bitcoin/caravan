import { BlockchainClient, Transaction } from "@caravan/clients";
import { AddressUtxos } from "./types";
import { MultisigAddressType, Network, getAddressType } from "@caravan/bitcoin";

/*
The methodology for calculating a privacy score (p_score) for Bitcoin transactions based 
on the number of inputs and outputs is the primary point to define wallet health for privacy. 
The score is further influenced by several factors such as address reuse, 
address types and UTXO set fingerprints etc.
*/

// A normalizing quantity that increases the score by a certain factor in cases of self-payment.
// More about deniability : https://www.truthcoin.info/blog/deniability/
const DENIABILITY_FACTOR = 1.5;

/*
The p_score is calculated by evaluating the likelihood of self-payments, the involvement of 
change outputs and the type of transaction based on number of inputs and outputs.

We have 5 categories of transaction type each with their own impact on privacy score
- Perfect Spend (1 input, 1 output)
- Simple Spend (1 input, 2 outputs)
- UTXO Fragmentation (1 input, more than 2 standard outputs)
- Consolidation (more than 1 input, 1 output)
- CoinJoin or Mixing (more than 1 input, more than 1 output)
*/
enum SpendType {
  PerfectSpend = "PerfectSpend",
  SimpleSpend = "SimpleSpend",
  UTXOFragmentation = "UTXOFragmentation",
  Consolidation = "Consolidation",
  MixingOrCoinJoin = "MixingOrCoinJoin",
}

function determineSpendType(inputs: number, outputs: number): SpendType {
  if (inputs === 1) {
    if (outputs === 1) return SpendType.PerfectSpend;
    if (outputs === 2) return SpendType.SimpleSpend;
    return SpendType.UTXOFragmentation;
  } else {
    if (outputs === 1) return SpendType.Consolidation;
    return SpendType.MixingOrCoinJoin;
  }
}

export function getSpendTypeScore(
  spendType: SpendType,
  numberOfInputs: number,
  numberOfOutputs: number,
): number {
  switch (spendType) {
    case SpendType.PerfectSpend:
      return 1 / 2;
    case SpendType.SimpleSpend:
      return 4 / 9;
    case SpendType.UTXOFragmentation:
      return 2 / 3 - 1 / numberOfOutputs;
    case SpendType.Consolidation:
      return 1 / numberOfInputs;
    case SpendType.MixingOrCoinJoin:
      let x = Math.pow(numberOfOutputs, 2) / numberOfInputs;
      return ((2 / 3) * x) / (1 + x);
    default:
      throw new Error("Invalid spend type");
  }
}

/*
The transaction topology score evaluates privacy metrics based on the number of inputs and outputs.

Expected Range : [0, 0.75]
-> Very Poor : [0, 0.15]
-> Poor : (0.15, 0.3]
-> Moderate : (0.3, 0.45]
-> Good : (0.45, 0.6]
-> Very Good : (0.6, 0.75] 
*/
export async function getMeanTopologyScore(
  transactions: Transaction[],
  client: BlockchainClient,
): Promise<number> {
  let privacyScore = 0;
  for (let tx of transactions) {
    let topologyScore = await getTopologyScore(tx, client);
    privacyScore += topologyScore;
  }
  return privacyScore / transactions.length;
}

export async function getTopologyScore(
  transaction: Transaction,
  client: BlockchainClient,
): Promise<number> {
  const numberOfInputs: number = transaction.vin.length;
  const numberOfOutputs: number = transaction.vout.length;

  const spendType: SpendType = determineSpendType(
    numberOfInputs,
    numberOfOutputs,
  );
  const score: number = getSpendTypeScore(
    spendType,
    numberOfInputs,
    numberOfOutputs,
  );

  if (spendType === SpendType.Consolidation) {
    return score;
  }
  for (let output of transaction.vout) {
    let address = output.scriptPubkeyAddress;
    let isResued = await isReusedAddress(address, client);
    if (isResued === true) {
      return score;
    }
  }
  return score * DENIABILITY_FACTOR;
}

/* 
In order to score for address reuse we can check the amount being held by reused addresses 
with respect to the total amount

Expected Range : [0,1]
-> Very Poor : (0.8, 1]
-> Poor : [0.6, 0.8)
-> Moderate : [0.4, 0.6)
-> Good : [0.2, 0.4)
-> Very Good : [0 ,0.2) 
*/
export async function addressReuseFactor(
  utxos: AddressUtxos,
  client: BlockchainClient,
): Promise<number> {
  let reusedAmount: number = 0;
  let totalAmount: number = 0;

  for (const address in utxos) {
    const addressUtxos = utxos[address];
    for (const utxo of addressUtxos) {
      totalAmount += utxo.value;
      let isReused = await isReusedAddress(address, client);
      if (isReused) {
        reusedAmount += utxo.value;
      }
    }
  }
  return reusedAmount / totalAmount;
}

async function isReusedAddress(
  address: string,
  client: BlockchainClient,
): Promise<boolean> {
  let txs: Transaction[] = await client.getAddressTransactions(address);
  let countReceive = 0;
  for (const tx of txs) {
    if (!tx.isSend) {
      countReceive++;
    }
    if (countReceive > 1) return true;
  }
  return false;
}

/*
If we are making payment to other wallet types then the privacy score should decrease because 
the change received will be to an address type matching our wallet and it will lead to a deduction that
we still own that amount.

Expected Range : (0,1]
-> Very Poor : (0, 0.1]
-> Poor : [0.1, 0.3)
-> Moderate : [0.3, 0.4)
-> Good : [0.4, 0.5)
-> Very Good : [0.5 ,1] 
*/
export function addressTypeFactor(
  transactions: Transaction[],
  walletAddressType: MultisigAddressType,
  network: Network,
): number {
  const addressCounts: Record<MultisigAddressType, number> = {
    P2WSH: 0,
    P2SH: 0,
    P2PKH: 0,
    P2TR: 0,
    UNKNOWN: 0,
    "P2SH-P2WSH": 0,
  };

  transactions.forEach((tx) => {
    tx.vout.forEach((output) => {
      const addressType = getAddressType(output.scriptPubkeyAddress, network);
      addressCounts[addressType]++;
    });
  });

  const totalAddresses = Object.values(addressCounts).reduce(
    (a, b) => a + b,
    0,
  );
  const walletTypeCount = addressCounts[walletAddressType];

  if (walletTypeCount === 0 || totalAddresses === walletTypeCount) {
    return 1;
  }
  return 1 / (walletTypeCount + 1);
}

/* 
The spread factor using standard deviation helps in assessing the dispersion of UTXO values.
In Bitcoin privacy, spreading UTXOs reduces traceability by making it harder for adversaries
to link transactions and deduce the ownership and spending patterns of users.

Expected Range : [0,1)
-> Very Poor : (0, 0.2]
-> Poor : [0.2, 0.4)
-> Moderate : [0.4, 0.6)
-> Good : [0.6, 0.8)
-> Very Good : [0.8 ,1] 
*/
export function utxoSpreadFactor(utxos: AddressUtxos): number {
  const amounts: number[] = [];
  for (const address in utxos) {
    const addressUtxos = utxos[address];
    addressUtxos.forEach((utxo) => {
      amounts.push(utxo.value);
    });
  }

  const mean: number =
    amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
  const variance: number =
    amounts.reduce((sum, amount) => sum + Math.pow(amount - mean, 2), 0) /
    amounts.length;
  const stdDev: number = Math.sqrt(variance);
  return stdDev / (stdDev + 1);
}

/* 
The score is ad-hoc to normalize the privacy score based on the number of UTXOs in the set.

Expected Range : [0,1]
- 0 for UTXO set length >= 50
- 0.25 for UTXO set length >= 25 and <= 49
- 0.5 for UTXO set length >= 15 and <= 24
- 0.75 for UTXO set length >= 5 and <= 14
- 1 for UTXO set length < 5
*/
export function utxoMassFactor(utxos: AddressUtxos): number {
  let utxoSetLength = 0;
  for (const address in utxos) {
    const addressUtxos = utxos[address];
    utxoSetLength += addressUtxos.length;
  }
  let score: number;
  if (utxoSetLength >= 50) {
    score = 0;
  } else if (utxoSetLength >= 25 && utxoSetLength <= 49) {
    score = 0.25;
  } else if (utxoSetLength >= 15 && utxoSetLength <= 24) {
    score = 0.5;
  } else if (utxoSetLength >= 5 && utxoSetLength <= 14) {
    score = 0.75;
  } else {
    score = 1;
  }
  return score;
}

/*
UTXO Value Dispersion Factor is a combination of UTXO Spread Factor and UTXO Set Length Weight.
It signifies the combined effect of how much variance is there in the UTXO Set values is and how many number of UTXOs are there.

Expected Range : [-0.15,0.15]
-> Very Poor : [-0.1, -0.05)
-> Poor : [-0.05, 0)
-> Moderate : [0, 0.05)
-> Good : [0.05, 0.1)
-> Very Good : [0.1 ,0.15] 
*/
export function utxoValueDispersionFactor(utxos: AddressUtxos): number {
  let UMF: number = utxoMassFactor(utxos);
  let USF: number = utxoSpreadFactor(utxos);
  return (USF + UMF) * 0.15 - 0.15;
}

/*
The privacy score is a combination of all the factors calculated above.
- Privacy Score based on Inputs and Outputs (i.e Tx Topology)
- Address Reuse Factor (R.F)
- Address Type Factor (A.T.F)
- UTXO Value Dispersion Factor (U.V.D.F)

Expected Range : [0, 1]
-> Very Poor : [0, 0.2]
-> Poor : (0.2, 0.4]
-> Moderate : (0.4, 0.6]
-> Good : (0.6, 0.8]
-> Very Good : (0.8, 1]
*/
export async function getWalletPrivacyScore(
  transactions: Transaction[],
  utxos: AddressUtxos,
  walletAddressType: MultisigAddressType,
  client: BlockchainClient,
  network: Network,
): Promise<number> {
  let privacyScore = await getMeanTopologyScore(transactions, client);

  // Adjusting the privacy score based on the address reuse factor
  let addressReusedFactor = await addressReuseFactor(utxos, client);
  privacyScore =
    privacyScore * (1 - 0.5 * addressReusedFactor) +
    0.1 * (1 - addressReusedFactor);

  // Adjusting the privacy score based on the address type factor
  privacyScore =
    privacyScore *
    (1 - addressTypeFactor(transactions, walletAddressType, network));

  // Adjusting the privacy score based on the UTXO set length and value dispersion factor
  privacyScore = privacyScore + 0.1 * utxoValueDispersionFactor(utxos);

  return privacyScore;
}
