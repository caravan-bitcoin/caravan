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

    async testRpcConnection(){
        const maxRetries = 10;
        const delay = 2000;

        for(let i =1; i <= maxRetries; i++){
           try {

            const res = await this.client.command("getblockchaininfo");

            console.log("Connected to Bitcoin Core successfully")
            return res;
            
           } catch (error) {
            console.log(`Attempt: ${i}/${maxRetries} & error: ${error} `)
            if (i == maxRetries) {
                console.log("Failed to connect to Bitcoin Core RPC")
            }
            //waiting for retry
            await new Promise(resolve => setTimeout(resolve,delay))
           }

        }
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