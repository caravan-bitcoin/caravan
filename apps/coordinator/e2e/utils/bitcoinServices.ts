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


    constructor(clientConfig: rpcConfig){
        this.clientConfig = {
            username: clientConfig.username || "abhishek",
            password: clientConfig.password || "abhishek",
            port: clientConfig.port || 18443,
            host: clientConfig.host || "http://localhost:18443"
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