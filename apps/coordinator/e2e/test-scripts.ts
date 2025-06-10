import { BitcoinCoreService, rpcConfig } from "./utils/bitcoinServices";

const clientConfig: rpcConfig = {
    username: "abhishek", 
    password: "abhishek",
    host: "http://localhost:18443",
    port: 18443,
};
export interface descStructure{
    checksum: string,
    fingerPrint: string,
    path: string,
    xpub: string
  }
type AddressType = "p2sh" | "p2sh-p2wsh" |"p2wsh";


async function testBitcoinServices() {
    console.log("🚀 Starting Bitcoin Services Test...\n");
    
    try {
        // Create client instance
        const client = new BitcoinCoreService(clientConfig);
        console.log("bitcoin client created successfully\n");

        // Test connection
        console.log("Testing RPC connection...");
        const connectionResult = await client.testRpcConnection();
        console.log("Connection result:", connectionResult);
        console.log(""); 
 
        console.log("📊 Getting blockchain info...");
        const blockchainInfo = await client.getBlockchainInfo();
        console.log("Blockchain info:", blockchainInfo);
        console.log("");


        // console.log("Creating test wallet...");
        // const walletResult = await client.createWallet({
        //     wallet_name: "abhishek12345",
        //     descriptors: true,
        //     load_on_startup: true
        // });
        // console.log("Wallet creation result:", walletResult);
        // console.log("");

        // const loadwallet = await client.loadWallets("abhishek12345")
        // console.log("loadWallet",loadwallet)

        const allWallets = await client.listWallets();
        console.log("all wallets", allWallets)

        const descriptor = await client.listDescriptors("abhishek12345")
        // console.log("desc",desc)
        const regex = /^\w+\(\[(.+?)\/(.+?)\](.+?)\/(.+?)\)\#(.+)$/;


        const addressDesc = await client.extractAddressDescriptors("abhishek12345");
        console.log("addressDEsc",addressDesc)



        // for(let desc of descriptor.descriptors){
        //     if(desc.desc.startsWith("sh(wpkh(")){
        //       const match = desc.desc.match(shWpkhRegex);
        //       console.log("match",match)
        //       if(match){
        //         addressDesc["p2sh-p2wsh"].fingerPrint = match[1];
        //         addressDesc["p2sh-p2wsh"].path = match[2];
        //         addressDesc["p2sh-p2wsh"].xpub = match[3];
        //         addressDesc["p2sh-p2wsh"].checksum = match[5];
        //       }
        //     } else {
        //       const match = desc.desc.match(regex);
        //       if(match){
        //         if(desc.desc.startsWith("pkh")){
        //           addressDesc.p2sh.fingerPrint = match[1];
        //           addressDesc.p2sh.path = match[2];
        //           addressDesc.p2sh.xpub = match[3];
        //           addressDesc.p2sh.checksum = match[5];
        //         } else if(desc.desc.startsWith("wpkh")){
        //           addressDesc.p2wsh.fingerPrint = match[1];
        //           addressDesc.p2wsh.path = match[2];
        //           addressDesc.p2wsh.xpub = match[3];
        //           addressDesc.p2wsh.checksum = match[5];
        //         }
        //       }
        //     }
        //   }
          
        // const balance = await client.checkBalance("abhishek")

        console.log("All tests completed successfully!",addressDesc);

    } catch (error) {
        console.error("Error during testing:", error);
    }
}

// Run the tests
testBitcoinServices(); 