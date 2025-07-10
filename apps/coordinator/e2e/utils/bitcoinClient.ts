import { BitcoinCoreService } from "./bitcoinServices";
import { rpcConfig } from "./types";


export const clientConfig:rpcConfig = {
    username: "abhishek",
    password: "abhishek",
    port: 18443,
    host: "http://localhost:18443"
}

function bitcoinClient(){
    try {
        const client = new BitcoinCoreService(clientConfig)
        return client;
        
    } catch (error) {
        console.log("error",error)      
    }
}

export default bitcoinClient