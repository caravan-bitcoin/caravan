import { BitcoinCoreService, rpcConfig } from "./bitcoinServices";
import dotenv from 'dotenv';

// Load env variables from .env file
dotenv.config();

export const clientConfig: rpcConfig = {
    username: process.env.BITCOIN_RPC_USER!,
    password: process.env.BITCOIN_RPC_PASSWORD!,
    port: parseInt(process.env.BITCOIN_RPC_PORT!),
    host: `http://localhost:18443}`
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