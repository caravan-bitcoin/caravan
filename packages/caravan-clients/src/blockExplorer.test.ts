import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { PublicClient } from './blockExplorer';
import { RawTransactionData, RawTxInput, RawTxOutput } from './types';

// Create a mock AxiosInstance
const mockAxiosInstance = {
  get: vi.fn(),
};

// Mock axios.create to return our mock instance
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
  },
}));

// Helper to create minimal valid transaction data
function createMockTx(partial: Partial<RawTransactionData>): RawTransactionData {
  const baseTx: RawTransactionData = {
    txid: 'tx1',
    version: 1,
    locktime: 0,
    vin: [],
    vout: [],
    size: 250,
    weight: 1000,
    fee: 0.0001,
    status: { confirmed: true, block_height: 800000, block_hash: 'blockhash', block_time: 123456789 },
    ...partial
  };
  return baseTx;
}

// Helper to create minimal input data
function createMockInput(partial: Partial<RawTxInput>): RawTxInput {
  return {
    txid: 'input-txid',
    vout: 0,
    sequence: 0xffffffff,
    prevout: {
      scriptpubkey: '76a914...',
      scriptpubkey_asm: 'OP_DUP OP_HASH160 ...',
      scriptpubkey_type: 'p2pkh',
      scriptpubkey_address: 'address',
      value: 0.001
    },
    ...partial
  };
}

// Helper to create minimal output data
function createMockOutput(partial: Partial<RawTxOutput>): RawTxOutput {
  return {
    scriptpubkey: '76a914...',
    scriptpubkey_asm: 'OP_DUP OP_HASH160 ...',
    scriptpubkey_type: 'p2pkh',
    scriptpubkey_address: 'address',
    value: 0.001,
    ...partial
  };
}

describe('PublicClient', () => {
  const baseUrl = 'https://blockstream.info/api';
  const client = new PublicClient(baseUrl);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAddressTransactions', () => {
    it('should fetch and map transactions successfully', async () => {
      const mockTx = createMockTx({
        txid: 'tx1',
        fee: 0.0001,
        status: { confirmed: true, block_time: 123456789 },
        vin: [createMockInput({
          prevout: {
              scriptpubkey_address: 'addr1',
              value: 0.001,
              scriptpubkey: '',
              scriptpubkey_asm: '',
              scriptpubkey_type: ''
          }
        })],
        vout: [createMockOutput({
          scriptpubkey_address: 'addr1', 
          value: 0.002
        })]
      });

      // Use the mock instance
      mockAxiosInstance.get.mockResolvedValueOnce({ data: [mockTx] });

      const result = await client.getAddressTransactions('addr1', { limit: 5 });
      
      expect(result).toEqual([
        {
          address: 'addr1',
          txid: 'tx1',
          fee: 10000,
          status: 'confirmed',
          blockTime: 123456789,
          amount: 100000
        }
      ]);
      
      // Verify correct endpoint is called
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/address/addr1/txs',
        { params: { limit: 5 } }
      );
    });

    it('should include lastSeenTxid in params when provided', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: [] });
      
      await client.getAddressTransactions('addr1', { 
        limit: 10,
        lastSeenTxid: 'prevTxId' 
      });
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/address/addr1/txs',
        { params: { limit: 10, after_txid: 'prevTxId' } }
      );
    });

    it('should return empty array on error', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('API error'));
      
      const result = await client.getAddressTransactions('addr1');
      
      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle transactions with multiple inputs/outputs', async () => {
      const mockTx = createMockTx({
        txid: 'tx1',
        fee: 0.0002,
        vin: [
          createMockInput({
            prevout: {
                scriptpubkey_address: 'addr1', value: 0.001,
                scriptpubkey: '',
                scriptpubkey_asm: '',
                scriptpubkey_type: ''
            }
          }),
          createMockInput({
            prevout: {
                scriptpubkey_address: 'addr1', value: 0.002,
                scriptpubkey: '',
                scriptpubkey_asm: '',
                scriptpubkey_type: ''
            }
          })
        ],
        vout: [
          createMockOutput({
            scriptpubkey_address: 'addr1', value: 0.003
          }),
          createMockOutput({
            scriptpubkey_address: 'addr2', value: 0.001
          })
        ]
      });

      mockAxiosInstance.get.mockResolvedValueOnce({ data: [mockTx] });

      const result = await client.getAddressTransactions('addr1');
      
      // Received: 0.003, Sent: 0.003 → Net: 0
      expect(result[0].amount).toEqual(0);
    });
  });

  describe('calculateNetAmount', () => {
    // Type-safe access to private method
    const calculateNetAmount = (tx: RawTransactionData, address: string) => {
      // Using type assertion to access private method
      const clientPrivate = client as unknown as {
        calculateNetAmount: (tx: RawTransactionData, address: string) => number
      };
      return clientPrivate.calculateNetAmount(tx, address);
    };

    it('should calculate net amount correctly for receive-only', () => {
      const tx = createMockTx({
        vin: [createMockInput({
          prevout: {
              scriptpubkey_address: 'addr2', value: 0.001,
              scriptpubkey: '',
              scriptpubkey_asm: '',
              scriptpubkey_type: ''
          }
        })],
        vout: [createMockOutput({
          scriptpubkey_address: 'addr1', value: 0.002
        })]
      });

      const amount = calculateNetAmount(tx, 'addr1');
      expect(amount).toEqual(200000);
    });

    it('should calculate net amount correctly for send-only', () => {
      const tx = createMockTx({
        vin: [createMockInput({
          prevout: {
              scriptpubkey_address: 'addr1', value: 0.002,
              scriptpubkey: '',
              scriptpubkey_asm: '',
              scriptpubkey_type: ''
          }
        })],
        vout: [createMockOutput({
          scriptpubkey_address: 'addr2', value: 0.001
        })]
      });

      const amount = calculateNetAmount(tx, 'addr1');
      expect(amount).toEqual(-200000);
    });

    it('should handle mixed transactions', () => {
      const tx = createMockTx({
        vin: [
          createMockInput({
            prevout: {
                scriptpubkey_address: 'addr1', value: 0.001,
                scriptpubkey: '',
                scriptpubkey_asm: '',
                scriptpubkey_type: ''
            }
          }),
          createMockInput({
            prevout: {
                scriptpubkey_address: 'addr2', value: 0.002,
                scriptpubkey: '',
                scriptpubkey_asm: '',
                scriptpubkey_type: ''
            }
          })
        ],
        vout: [
          createMockOutput({
            scriptpubkey_address: 'addr1', value: 0.002
          }),
          createMockOutput({
            scriptpubkey_address: 'addr3', value: 0.001
          })
        ]
      });

      const amount = calculateNetAmount(tx, 'addr1');
      // Received: 0.002, Sent: 0.001 → Net: +0.001
      expect(amount).toEqual(100000);
    });
  });
});