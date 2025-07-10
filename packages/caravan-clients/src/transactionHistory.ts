import { AddressTransaction, NormalizedTransaction, IBitcoinClient, TransactionQueryParams } from "./types";

export class TransactionHistoryService {
  constructor(private client: IBitcoinClient) {}

  async getWalletTransactions(
    addresses: string[],
    params: TransactionQueryParams = {}
  ): Promise<NormalizedTransaction[]> {
    const addressChunks = this.chunkArray(addresses, 5); // Avoid rate limiting
    const allTxs: AddressTransaction[] = [];
    
    for (const chunk of addressChunks) {
      for (const address of chunk) {
        try {
          const txs = await this.client.getAddressTransactions(address, {
            limit: params.limit,
            lastSeenTxid: params.lastSeenTxid,
            skip: params.skip
          });
          allTxs.push(...txs);
        } catch (error) {
          console.error(`Skipping ${address} due to error:`, error);
        }
        await this.delay(300); // Rate limiting
      }
    }
    
    return this.normalizeAndDeduplicate(allTxs);
  }

  private normalizeAndDeduplicate(txs: AddressTransaction[]): NormalizedTransaction[] {
    const txMap = new Map<string, NormalizedTransaction>();
    
    txs.forEach(addrTx => {
      if (!txMap.has(addrTx.txid)) {
        txMap.set(addrTx.txid, {
          txid: addrTx.txid,
          fee: addrTx.fee,
          status: addrTx.status,
          blockTime: addrTx.blockTime,
          involvedAddresses: [addrTx.address],
          inputs: [],
          outputs: []
        });
      } else {
        const existing = txMap.get(addrTx.txid)!;
        if (!existing.involvedAddresses.includes(addrTx.address)) {
          existing.involvedAddresses.push(addrTx.address);
        }
      }
    });
    
    return Array.from(txMap.values()).sort((a, b) => 
      (b.blockTime || 0) - (a.blockTime || 0)
    );
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}