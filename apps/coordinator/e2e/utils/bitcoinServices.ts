import BitcoinCore from "bitcoin-core"

export interface rpcConfig {
    username: string,
    password: string,
    host: string,
    port: number,
    wallet?: string
}

export class BitcoinCoreService {
    private clientConfig: rpcConfig
    private client: BitcoinCore


    constructor(){
        this.clientConfig = {
            username: "abhishek",
            password: "abhishek",
            port: 18443,
            host: "http://localhost:18443"
        }

        this.client = new BitcoinCore(this.clientConfig)
    }

    async getBlockchainInfo(){
        try {
            const blockchainInfo = await this.client.command("getblockchaininfo");
            return blockchainInfo
            
        } catch (error) {
            console.log("error", error)
        }
    }

}