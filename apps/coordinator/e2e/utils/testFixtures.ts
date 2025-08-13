import { execSync } from "child_process";
import path from "path";
import { BitcoinCoreService } from "./bitcoinServices";


export default async function createTestWalletsAndFund(client: BitcoinCoreService){

    const timestamp = Date.now();
    
    const walletNames = [
        `test_wallet_${timestamp}_1`,
        `test_wallet_${timestamp}_2`,
        `test_wallet_${timestamp}_3`,
        `watcher_wallet_${timestamp}`
    ]

    for (const walletName of walletNames){
        try {
            const exist = await client?.walletExists(walletName);
        if(exist){
            // Cleaning up the existing wallets
            await client?.unloadWallet(walletName);
        }
        } catch (error) {
            console.log(`Wallet ${walletName} doesnt exist or already unloaded`)
        }
    }

    const wallet1 = await client?.createWallet({wallet_name: walletNames[0]});
    const wallet2 = await client?.createWallet({wallet_name: walletNames[1]});
    const wallet3 = await client?.createWallet({wallet_name: walletNames[2]});
    const watcher_wallet = await client?.createWallet({wallet_name: walletNames[3], disable_private_keys: true})

    const testWallets = [wallet1, wallet2,wallet3,watcher_wallet];

    const senderAddress = await client?.getNewAddress(walletNames[0]);
    await client?.fundAddress(senderAddress, walletNames[0],300);

    const receiverAddress = await client?.getNewAddress(walletNames[1]);

    return {walletNames,testWallets,senderAddress,receiverAddress}
}

export async function checkDockerAvailability(){
    try {
        execSync("docker info", {stdio: "pipe"});
        console.log("Docker is available, starting containers...");

        const composeFile = process.env.CI ? 'docker-compose.ci.yml' : 'docker-compose.yml'
        
        execSync(`docker compose -f ${composeFile} up -d`, {
            stdio: "inherit",
            cwd: path.join(process.cwd(), "e2e")
        });
    } catch (error) {
        console.error("Docker not available on your system:", error);
        throw new Error("Docker is required for running e2e tests");
    }
}


