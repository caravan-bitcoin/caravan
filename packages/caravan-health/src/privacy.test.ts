import { PrivacyMetrics } from "./privacy";
import { determineSpendType, getSpendTypeScore } from "./spendType";
import { AddressUtxos, SpendType, Transaction, Network } from "./types";

const transactions: Transaction[] = [
  // transactions[0] is a perfect spend transaction
  {
    txid: "txid1",
    vin: [
      {
        prevTxId: "prevTxId1",
        vout: 0,
        sequence: 0,
      },
    ],
    vout: [
      {
        scriptPubkeyHex: "scriptPubkeyHex1",
        scriptPubkeyAddress: "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
        value: 0.1,
      },
    ],
    size: 0,
    weight: 0,
    fee: 0,
    isSend: true,
    amount: 0,
    block_time: 0,
  },
  // transactions[1] is a coin join transaction
  {
    txid: "txid2",
    vin: [
      {
        prevTxId: "prevTxId2",
        vout: 0,
        sequence: 0,
      },
      {
        prevTxId: "prevTxId2",
        vout: 0,
        sequence: 0,
      },
    ],
    vout: [
      {
        scriptPubkeyHex: "scriptPubkeyHex2",
        scriptPubkeyAddress: "scriptPubkeyAddress2",
        value: 0.2,
      },
      {
        scriptPubkeyHex: "scriptPubkeyHex2",
        scriptPubkeyAddress:
          "bc1qng72v5ceptk07htel0wcv6k27fkg6tmmd8887jr2l2yz5a5lnawqqeceya",
        value: 0.2,
      },
      {
        scriptPubkeyHex: "scriptPubkeyHex2",
        scriptPubkeyAddress:
          "bc1qng72v5ceptk07htel0wcv6k27fkg6tmmd8887jr2l2yz5a5lnawqqeceya",
        value: 0.2,
      },
      {
        scriptPubkeyHex: "scriptPubkeyHex2",
        scriptPubkeyAddress: "scriptPubkeyAddress2",
        value: 0.2,
      },
    ],
    size: 0,
    weight: 0,
    fee: 0,
    isSend: true,
    amount: 0,
    block_time: 0,
  },
];

const utxos: AddressUtxos = {
  address1: [
    {
      txid: "tx1",
      vout: 0,
      value: 0.1,
      status: {
        confirmed: true,
        block_time: 1234,
      },
    },
    {
      txid: "tx2",
      vout: 0,
      value: 0.2,
      status: {
        confirmed: true,
        block_time: 1234,
      },
    },
    {
      txid: "tx3",
      vout: 0,
      value: 0.3,
      status: {
        confirmed: true,
        block_time: 1234,
      },
    },
    {
      txid: "tx4",
      vout: 0,
      value: 0.4,
      status: {
        confirmed: true,
        block_time: 1234,
      },
    },
  ],
};

describe("Privacy metric scoring", () => {
  const privacyMetric = new PrivacyMetrics(transactions, utxos);

  describe("Determine Spend Type", () => {
    it("Perfect Spend are transactions with 1 input and 1 output", () => {
      const spendType: SpendType = determineSpendType(1, 1);
      expect(spendType).toBe(SpendType.PerfectSpend);
    });

    it("Simple Spend are transactions with 1 input and 2 outputs", () => {
      const spendType: SpendType = determineSpendType(1, 2);
      expect(spendType).toBe(SpendType.SimpleSpend);
    });

    it("UTXO Fragmentation are transactions with 1 input and more than 2 outputs", () => {
      const spendType: SpendType = determineSpendType(1, 3);
      expect(spendType).toBe(SpendType.UTXOFragmentation);

      const spendType2: SpendType = determineSpendType(1, 4);
      expect(spendType2).toBe(SpendType.UTXOFragmentation);

      const spendType3: SpendType = determineSpendType(1, 5);
      expect(spendType3).toBe(SpendType.UTXOFragmentation);
    });

    it("Consolidation transactions have more than 1 inputs and 1 output", () => {
      const spendType: SpendType = determineSpendType(2, 1);
      expect(spendType).toBe(SpendType.Consolidation);

      const spendType2: SpendType = determineSpendType(3, 1);
      expect(spendType2).toBe(SpendType.Consolidation);

      const spendType3: SpendType = determineSpendType(4, 1);
      expect(spendType3).toBe(SpendType.Consolidation);
    });

    it("Mixing or CoinJoin transactions have more than 1 inputs and more than 1 outputs", () => {
      const spendType: SpendType = determineSpendType(3, 3);
      expect(spendType).toBe(SpendType.MixingOrCoinJoin);

      const spendType2: SpendType = determineSpendType(4, 3);
      expect(spendType2).toBe(SpendType.MixingOrCoinJoin);

      const spendType3: SpendType = determineSpendType(4, 4);
      expect(spendType3).toBe(SpendType.MixingOrCoinJoin);
    });
  });

  describe("Spend Type Score", () => {
    /*
      score = P(“An output cannot be a self-payment) * (1 - P(“involvement of any change output”))
        
      Perfect Spend Transaction
		    - No. of Input = 1
	      - No. of Output = 1

        P("An output can be a self-payment") = 0.5
        P("An output cannot be a self-payment") = 0.5
        P(“involvement of any change output”) = 0 (when number of output is 1 it will be 0)

        score = 0.5 * (1 - 0) = 0.5
    */
    it("Perfect Spend has a raw score of 0.5 for external wallet payments", () => {
      const score: number = getSpendTypeScore(1, 1);
      expect(score).toBe(0.5);
    });
    /*
        score = P(“An output cannot be a self-payment) * (1 - P(“involvement of any change output”))
        
        Simple Spend Transaction
          - No. of Output = 2

        P("An output can be a self-payment") = 0.33
        P("An output cannot be a self-payment") = 0.67

        P1 (Party1) -> P2 (Party-2) , P3(Party-3) | No change involved
        P1 (Party1) -> P1 (Party1), P1 (Party1) | No change involved
        P2 (Party-2) -> P2  (Party-2) ,P1 (Party1) | Yes change is involved
        P(“involvement of any change output”) = 0.33


        score = 0.67 * (1-0.33) = 0.4489
    */
    it("Simple Spend has a raw score of 0.44 for external wallet payments", () => {
      const score: number = getSpendTypeScore(1, 2);
      expect(score).toBeCloseTo(0.44);
    });

    /*
        UTXO Fragmentation Transaction
        ONE to MANY transaction
        No. of Input = 1
        No. of Output = 3 or more (MANY)
      
        score = 0.67 - ( 1 / Number of Outputs )
    
        Justification behind the number 0.67 : 
        We want that the privacy score should increase with higher numbers of outputs, 
        because in the case it is a self spend transaction then producing more outputs means 
        producing more UTXOs which has privacy benefits for the wallet.

        Now, We are using a multiplication factor of 1.5 for deniability in case of all the self spend transactions. 
        So the quantity [ X - ( 1 / No. of outputs) ] should be less than 1

        [ X - ( 1 / No. of outputs) ] <= 1

        Here the quantity ( 1 / No. of outputs) could be maximum when No. of outputs = 3
          [X - ⅓ ] <= 1
          [X - 0.33] <= 1
          X<=0.67

      */
    it("UTXO Fragmentation has a raw score of 0.33 for external wallet payments", () => {
      const score: number = getSpendTypeScore(1, 3);
      expect(score).toBeCloseTo(0.33);
    });

    /*
      Consolidation Transaction
      MANY to ONE transaction
      No. of Input = 2 or more (MANY)
      No. of Output = 1

      When the number of inputs is higher than the single output then the privacy score should decrease because 
      it increases the fingerprint or certainty for on-chain analysers to determine that the transaction was made as 
      a consolidation and with more inputs we tend to expose more UTXOs for a transaction.

      score = 1 / Number of Inputs
    */
    it("Consolidation has raw score of ", () => {
      const score: number = getSpendTypeScore(2, 1);
      expect(score).toBeCloseTo(0.5);

      const score2: number = getSpendTypeScore(3, 1);
      expect(score2).toBeCloseTo(0.33);
    });

    /*
      Mixing or CoinJoin Transaction
      MANY to MANY transaction
      No. of Input >= No. of Outputs (MANY)
      No. of Output > 2 or more (MANY)

      Justification : 
        Privacy score is directly proportional to higher number of outputs AND less number of inputs in case of coin join. 
        The explanation for this to happen is that if you try to consolidate 
        i.e lower number of output and high number of input, the privacy should be decreased and 
        in case of coin join where there are so many outputs against few inputs it should have increased 
        privacy since the probability of someone find out if the coin belongs to you or not is very small.

      score =   1/2 * (y2/x)/(1+y2/x)
    */
    it("MixingOrCoinJoin has raw score of ", () => {
      const score: number = getSpendTypeScore(2, 2);
      expect(score).toBeCloseTo(0.44);

      const score2: number = getSpendTypeScore(2, 3);
      expect(score2).toBeCloseTo(0.333);

      const score3: number = getSpendTypeScore(3, 2);
      expect(score3).toBeCloseTo(0.44);
    });
  });

  describe("Transaction Topology Score", () => {
    it("Calculates the transaction topology score based on the spend type", () => {
      const score: number = privacyMetric.getTopologyScore(transactions[0]);
      expect(score).toBe(0.75);

      const score2: number = privacyMetric.getTopologyScore(transactions[1]);
      expect(score2).toBeCloseTo(0.416);
    });
  });

  describe("Mean Topology Score", () => {
    it("Calculates the mean topology score for all transactions done by a wallet", () => {
      const meanScore: number = privacyMetric.getMeanTopologyScore();
      expect(meanScore).toBeCloseTo(0.583);
    });
  });

  describe("Address Reuse Factor", () => {
    it.todo(
      "Make multiple transactions and UTXO objects to test the address reuse factor for half used and half reused addresses.",
    );
    it("Calculates the amount being held by reused addresses with respect to the total amount", () => {
      const addressReuseFactor: number = privacyMetric.addressReuseFactor();
      expect(addressReuseFactor).toBe(0);
    });
  });

  describe("Address Type Factor", () => {
    it.todo("Test with different combination of address types and networks");
    it("Calculates the the address type distribution of the wallet transactions", () => {
      const addressTypeFactor: number = privacyMetric.addressTypeFactor(
        "P2SH",
        Network.MAINNET,
      );
      expect(addressTypeFactor).toBe(1);
    });
    it("Calculates the the address type distribution of the wallet transactions", () => {
      const addressTypeFactor: number = privacyMetric.addressTypeFactor(
        "P2WSH",
        Network.MAINNET,
      );
      expect(addressTypeFactor).toBe(0.25);
    });
  });

  describe("UTXO Spread Factor", () => {
    it("Calculates the standard deviation of UTXO values which helps in assessing the dispersion of UTXO values", () => {
      const utxoSpreadFactor: number = privacyMetric.utxoSpreadFactor();
      expect(utxoSpreadFactor).toBeCloseTo(0.1);
    });
  });

  describe("UTXO Value Dispersion Factor", () => {
    it("Combines UTXO Spread Factor and UTXO Mass Factor", () => {
      const utxoValueDispersionFactor: number =
        privacyMetric.utxoValueDispersionFactor();
      expect(utxoValueDispersionFactor).toBeCloseTo(0.015);
    });
  });

  describe("Overall Privacy Score", () => {
    it("Calculates the overall privacy score for a wallet", () => {
      const privacyScore: number = privacyMetric.getWalletPrivacyScore(
        "P2SH",
        Network.MAINNET,
      );
      expect(privacyScore).toBeCloseTo(0.0015);
    });
  });
});
