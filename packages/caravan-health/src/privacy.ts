import {BlockchainClient} from '@caravan/clients'
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
function privacyScoreOnIO(transaction: any, client: BlockchainClient): number {
  const numberOfInputs: number = transaction.vin.length;
  const numberOfOutputs: number = transaction.vout.length;

  let score: number;

  if (numberOfInputs === 1) {
    if (numberOfOutputs === 1) {
      // Sweep Spend (No change Output)
      // #Input = 1, #Output = 1
      score = 1 / 2;
    } else if (numberOfOutputs === 2) {
      // Simple Spend (Single change output)
      // #Input = 1, #Output = 2
      score = 4 / 9;
    } else {
      // UTXO Fragmentation
      // #Input = 1, #Output > 2
      score = 2 / 3 - 1 / numberOfOutputs;
    }
    if (isSelfPayment(transaction,client)) {
      return score * DENIABILITY_FACTOR;
    }
  } else {
    if (numberOfOutputs === 1) {
      // Consolidation
      // #Input >= 2, #Output = 1
      score = 1 / numberOfInputs;

      // No D.F for consolidation
    } else {
      // Mixing or CoinJoin
      // #Input >= 2, #Output >= 2
      let x = Math.pow(numberOfOutputs, 2) / numberOfInputs;
      score = (0.75 * x) / (1 + x);
      if (isSelfPayment(transaction,client)) {
        return score * DENIABILITY_FACTOR;
      }
    }
  }
  return score;
}

/*
Determine whether a Bitcoin transaction is a self-payment, meaning the sender and recipient
are the same entity. To check this, we make an RPC call to the watcher wallet asking for the
amount that a given address holds. If the call returns a number then it is part of wallet
otherwise it is not a self payment.
*/
function isSelfPayment(transaction: any, client: BlockchainClient): boolean {
  transaction.vout.forEach(async op => {
     if(await client.getAddressStatus(op.scriptPubKey.address) === undefined){
       return false;
     }
  })
  return true;
}

/* TODO : replace any type to custom types for Transactions and UTXOs*/
/* 
In order to score for address reuse we can check the amount being hold by reused UTXOs 
with respect to the total amount
*/
function addressReuseFactor(utxos: Array<any>): number {
  let reused_amount : number = 0;
  let total_amount : number = 0;
  utxos.forEach((utxo) => {
    if (utxo.reused) {
      reused_amount += utxo.amount;
    }
    total_amount += utxo.amount;
  });
  return reused_amount / total_amount;
}

/*
If we are making payment to other wallet types then the privacy score should decrease because 
the change received will be at address of our wallet type and it will lead to derivation that 
we still own that amount.
*/
function addressTypeFactor(transactions : Array<any>, walletAddressType : string): number {
    let P2WSH : number = 0;
    let P2PKH : number = 0;
    let P2SH : number = 0;
    let atf : number = 1;
    transactions.forEach(tx => {
        tx.vout.forEach(output => {
            let address = output.scriptPubKey.address;
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
        })
    });

    if (walletAddressType == "P2WSH" && (P2WSH != 0 && (P2SH != 0 || P2PKH != 0))) {
        atf = 1 / (P2WSH + 1);
    } else if (walletAddressType == "P2PKH" && (P2PKH != 0 && (P2SH != 0 || P2WSH != 0))) {
        atf = 1 / (P2PKH + 1);
    } else if (walletAddressType == "P2SH" && (P2SH != 0 && (P2WSH != 0 || P2PKH != 0))) {
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
function utxoSpreadFactor(utxos : Array<any>) : number {
    const amounts : Array<number> = utxos.map(utxo => utxo.amount);
    const mean : number = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
    const variance : number = amounts.reduce((sum, amount) => sum + Math.pow(amount - mean, 2), 0) / amounts.length;
    const stdDev : number = Math.sqrt(variance);
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
function utxoSetLengthWeight(utxos : Array<any>) : number {
  let utxo_set_length : number = utxos.length;
  let weight : number;
  if (utxo_set_length >= 50) {
      weight = 0;
  } else if (utxo_set_length >= 25 && utxo_set_length <= 49) {
      weight = 0.25;
  } else if (utxo_set_length >= 15 && utxo_set_length <= 24) {
      weight = 0.5;
  } else if (utxo_set_length >= 5 && utxo_set_length <= 14) {
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
function utxoValueWeightageFactor(utxos: Array<any>): number {
  let W : number = utxoSetLengthWeight(utxos);
  let USF : number = utxoSpreadFactor(utxos);
  return (USF + W)*0.15 -0.15;
}

/*
The privacy score is a combination of all the factors calculated above.
- Privacy Score based on Inputs and Outputs
- Address Reuse Factor (R.F) : p_adjusted = p_score * (1 - 0.5 * r.f) + 0.10 * (1 - r.f)
- Address Type Factor (A.T.F) : p_adjusted = p_score * (1-A.T.F)
- UTXO Value Weightage Factor (U.V.W.F) : p_adjusted = p_score + U.V.W.F
*/
export function privacyScore(transactions : Array<any>, utxos : Array<any>, walletAddressType : string, client: BlockchainClient) : number {
  let privacy_score = transactions.reduce((sum, tx) => sum + privacyScoreOnIO(tx,client), 0) / transactions.length;
  // Adjusting the privacy score based on the address reuse factor
  privacy_score = (privacy_score * (1 - (0.5 * addressReuseFactor(utxos)))) + (0.10 * (1 - addressReuseFactor(utxos)));
  // Adjusting the privacy score based on the address type factor
  privacy_score = privacy_score * (1 - addressTypeFactor(transactions,walletAddressType));
  // Adjusting the privacy score based on the UTXO set length and value weightage factor
  privacy_score = privacy_score + 0.1 * utxoValueWeightageFactor(utxos)

  return privacy_score
}
