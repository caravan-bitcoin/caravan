import { PrivacyMetrics } from "./privacy";
import { AddressUtxos, SpendType, Transaction, Network } from "./types";
import { determineSpendType, getSpendTypeScore } from "./spendType";

const transactions: Transaction[] = [
  // Perfect spend: 1 input, 1 output
  {
    txid: "txid1",
    vin: [{ prevTxId: "coinbase", vout: 0, sequence: 0 }],
    vout: [
      {
        scriptPubkeyHex: "hex1",
        scriptPubkeyAddress: "addr1",  // We'll reference this in UTXOs
        value: 0.1,
      },
    ],
    size: 200,
    weight: 800,
    fee: 0.0001,
    isSend: false,
    amount: 0.1,
    block_time: 1000,
  },

  // CoinJoin style tx: 2 inputs, 4 outputs (2 different addresses repeated)
  {
    txid: "txid2",
    vin: [
      { prevTxId: "txid1", vout: 0, sequence: 0 },  // spends txid1's output
      { prevTxId: "coinbase", vout: 1, sequence: 0 },
    ],
    vout: [
      {
        scriptPubkeyHex: "hex2",
        scriptPubkeyAddress: "addr2",  // We'll use in UTXOs
        value: 0.2,
      },
      {
        scriptPubkeyHex: "hex2",
        scriptPubkeyAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        value: 0.2,
      },
      {
        scriptPubkeyHex: "hex2",
        scriptPubkeyAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        value: 0.2,
      },
      {
        scriptPubkeyHex: "hex2",
        scriptPubkeyAddress: "addr2",
        value: 0.2,
      },
    ],
    size: 300,
    weight: 1200,
    fee: 0.0005,
    isSend: true,
    amount: 0.8,
    block_time: 1100,
  },

  // UTXO Fragmentation: 1 input, 4 outputs
  {
    txid: "txid3",
    vin: [{ prevTxId: "txid2", vout: 0, sequence: 0 }],  // spends addr2
    vout: [
      {
        scriptPubkeyHex: "hex3",
        scriptPubkeyAddress: "addr1",  // reuse
        value: 0.05,
      },
      {
        scriptPubkeyHex: "hex3",
        scriptPubkeyAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",  // reuse
        value: 0.05,
      },
      {
        scriptPubkeyHex: "hex3",
        scriptPubkeyAddress: "addr4",  // new
        value: 0.05,
      },
      {
        scriptPubkeyHex: "hex3",
        scriptPubkeyAddress: "addr5",  // new
        value: 0.05,
      },
    ],
    size: 400,
    weight: 1600,
    fee: 0.0002,
    isSend: true,
    amount: 0.2,
    block_time: 1200,
  },
];

const utxos: AddressUtxos = {
  addr1: [
    {
      txid: "txid3",
      vout: 0,
      value: 0.05,
      status: { confirmed: true, block_time: 1200 },
    },
  ],
  addr2: [
    {
      txid: "txid2",
      vout: 3,
      value: 0.2,
      status: { confirmed: true, block_time: 1100 },
    },
  ],
  bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh: [
    {
      txid: "txid2",
      vout: 1,
      value: 0.2,
      status: { confirmed: true, block_time: 1100 },
    },
    {
      txid: "txid3",
      vout: 1,
      value: 0.05,
      status: { confirmed: true, block_time: 1200 },
    },
  ],
  addr4: [
    {
      txid: "txid3",
      vout: 2,
      value: 0.05,
      status: { confirmed: true, block_time: 1200 },
    },
  ],
  addr5: [
    {
      txid: "txid3",
      vout: 3,
      value: 0.05,
      status: { confirmed: true, block_time: 1200 },
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
      // not a self payment
      const score: number = privacyMetric.getTopologyScore(transactions[0]);
      expect(score).toBe(0.5);

      const score2: number = privacyMetric.getTopologyScore(transactions[1]);
      expect(score2).toBeCloseTo(0.416);

      const score3: number = privacyMetric.getTopologyScore(transactions[2]);
      expect(score3).toBeCloseTo(0.42);
    });
  });

  describe("Mean Topology Score", () => {
    it("Calculates the mean topology score for all transactions done by a wallet", () => {
      const meanScore: number = privacyMetric.getMeanTopologyScore();
      expect(meanScore).toBeCloseTo(0.445);
    });
  });

  describe("Address Reuse Factor", () => {
    it("Returns 0 when no addresses are reused", () => {
      const uniqueUtxos: AddressUtxos = {
        "unique1": [{ txid: "txunique1", vout: 0, value: 0.1, status: { confirmed: true, block_time: 1000 } }],
        "unique2": [{ txid: "txunique2", vout: 0, value: 0.2, status: { confirmed: true, block_time: 1000 } }],
      };
      const metricUnique = new PrivacyMetrics(transactions, uniqueUtxos);
      expect(metricUnique.addressReuseFactor()).toBe(0);
    });
    it("Calculates ARF correctly for half reused addresses", () => {
      const arf = privacyMetric.addressReuseFactor();
      expect(arf).toBeCloseTo(0.833);
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
      expect(utxoSpreadFactor).toBeCloseTo(0.07);
    });
  });

  describe("UTXO Value Dispersion Factor", () => {
    it("Combines UTXO Spread Factor and UTXO Mass Factor", () => {
      const utxoValueDispersionFactor: number =
        privacyMetric.utxoValueDispersionFactor();
      expect(utxoValueDispersionFactor).toBeCloseTo(-0.03);
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