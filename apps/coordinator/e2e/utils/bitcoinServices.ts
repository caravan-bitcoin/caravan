import BitcoinCore from "bitcoin-core";
import {
  SingleSigAddressType,
  descStructure,
  rpcConfig,
  walletConfig,
} from "./types";
import { decode } from "punycode";

export class BitcoinCoreService {
  private clientConfig: rpcConfig;
  private client: BitcoinCore;
  private walletClient: Map<string, BitcoinCore> = new Map();

  constructor(clientConfig: rpcConfig) {
    this.clientConfig = {
      username: clientConfig.username,
      password: clientConfig.password,
      port: clientConfig.port,
      host: clientConfig.host,
    };

    this.client = new BitcoinCore(this.clientConfig);
  }

  private getWalletClient(walletName: string) {
    try {
      if (!this.walletClient.has(walletName)) {
        const walletClient = new BitcoinCore({
          ...this.clientConfig,
          wallet: walletName,
        });
        this.walletClient.set(walletName, walletClient);

        return this.walletClient.get(walletName);
      }
      return this.walletClient.get(walletName);
    } catch (error) {
      console.log("error", error);
    }
  }

  async waitForBitcoinCore() {
    const maxRetries = 10;
    const delay = 2000;

    for (let i = 1; i <= maxRetries; i++) {
      try {
        const res = await this.client.command("getblockchaininfo");

        return res;
      } catch (error) {
        console.log(`Attempt: ${i}/${maxRetries} & error: ${error} `);
        if (i == maxRetries) {
          console.log("Failed to connect to Bitcoin Core RPC");
        }
        //waiting for retry
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  async getBlockchainInfo() {
    try {
      const blockchainInfo = await this.client.command("getblockchaininfo");
      return blockchainInfo;
    } catch (error) {
      console.log("error", error);
    }
  }

  async createWallet(walletConfig: walletConfig) {
    try {
      const wallet = await this.client.command(
        "createwallet",
        walletConfig.wallet_name,
        walletConfig.disable_private_keys,
        walletConfig.blank,
        walletConfig.passphrase,
        walletConfig.avoid_reuse,
        walletConfig.descriptors || true,
        walletConfig.load_on_startup || true,
        walletConfig.external_signer,
      );
      return wallet;
    } catch (error) {
      console.log("Error while create wallet: ", error);
    }
  }

  async loadWallets(walletName: string) {
    try {
      const loadWallet = this.client.command("loadwallet", walletName);
      return loadWallet;
    } catch (error) {
      console.log("error", error);
    }
  }

  async unloadWallet(walletName: string) {
    try {
      const unloadWallet = await this.client.command(
        "unloadwallet",
        walletName,
      );
      return unloadWallet;
    } catch (error) {
      console.log("Error unloading wallet:", error);
      throw error;
    }
  }

  async walletExists(walletName: string): Promise<boolean> {
    try {
      const wallets = await this.listWallets();

      if (wallets && Array.isArray(wallets) && wallets.includes(walletName)) {
        return true;
      }
      return false;
    } catch (error) {
      console.log("error", error);
      return false;
    }
  }

  async listWallets() {
    try {
      const allWallets = await this.client.command("listwallets");
      return allWallets;
    } catch (error) {
      console.log("error", error);
    }
  }

  async listDescriptors(walletName: string) {
    try {
      const walletClient = this.getWalletClient(walletName);

      const descriptors = await walletClient?.command("listdescriptors");
      return descriptors;
    } catch (error) {
      console.log("error", error);
    }
  }

  async extractAddressDescriptors(
    walletName: string,
  ): Promise<Record<SingleSigAddressType, descStructure>> {
    const walletClient = this.getWalletClient(walletName);
    const allDesc = await walletClient?.command("listdescriptors");

    const standardDescRegex = /^\w+\(\[(.+?)\/(.+?)\](.+?)\/(.+?)\)\#(.+)$/;
    const shWpkhDescRegex =
      /^sh\(wpkh\(\[(.+?)\/(.+?)\](.+?)\/(.+?)\)\)\#(.+)$/;

    const parsedAddressDescriptors: Record<
      SingleSigAddressType,
      descStructure
    > = {
      p2pkh: { checksum: "", fingerPrint: "", path: "", xpub: "" },
      p2sh_p2wpkh: { checksum: "", fingerPrint: "", path: "", xpub: "" },
      p2wpkh: { checksum: "", fingerPrint: "", path: "", xpub: "" },
    };

    for (let desc of allDesc.descriptors) {
      const descriptor = desc.desc;

      if (descriptor.startsWith("sh(wpkh(")) {
        const match = descriptor.match(shWpkhDescRegex);
        if (match) {
          parsedAddressDescriptors["p2sh_p2wpkh"] = {
            fingerPrint: match[1],
            path: match[2],
            xpub: match[3],
            checksum: match[5],
          };
        }
      } else {
        const match = descriptor.match(standardDescRegex);
        if (match) {
          if (descriptor.startsWith("pkh")) {
            parsedAddressDescriptors.p2pkh = {
              fingerPrint: match[1],
              path: match[2],
              xpub: match[3],
              checksum: match[5],
            };
          } else if (descriptor.startsWith("wpkh")) {
            parsedAddressDescriptors.p2wpkh = {
              fingerPrint: match[1],
              path: match[2],
              xpub: match[3],
              checksum: match[5],
            };
          }
        }
      }
    }
    return parsedAddressDescriptors;
  }
  async checkBalance(walletName: string) {
    try {
      const walletClient = this.getWalletClient(walletName);

      const balance = await walletClient?.command("getbalance");
      return balance;
    } catch (error) {
      console.log("error", error);
    }
  }

  async getNewAddress(walletName: string) {
    try {
      const client = this.getWalletClient(walletName);

      const address = await client?.command("getnewaddress");
      return address;
    } catch (error) {
      console.log("error", error);
    }
  }

  async fundAddress(address: string, walletName: string, blocks?: number) {
    try {
      let blockHashes = await this.client?.command(
        "generatetoaddress",
        blocks ?? 101,
        address,
      );

      const balance = await this.checkAddressBalance(address, walletName);

      if (blockHashes.length == (blocks ?? 101) && balance > 0) return balance;

      return false;
    } catch (error) {
      console.log("error", error);
      return false;
    }
  }

  async checkAddressBalance(address: string, walletName: string) {
    try {
      const walletClient = this.getWalletClient(walletName);
      const balance = await walletClient?.command(
        "getreceivedbyaddress",
        address,
      );
      return balance;
    } catch (error) {
      console.log("error", error);
      return 0;
    }
  }

  async sendToAddress(WalletName: string, toAddress: string, amount: number) {
    try {
      const walletClient = this.getWalletClient(WalletName);

      let txid = await walletClient?.command(
        "sendtoaddress",
        toAddress,
        amount,
      );

      return txid;
    } catch (error) {
      console.log("error", error);
      return null;
    }
  }

  /**
 * Signs a PSBT with a specific wallet 
 * 
 * @param walletName - Name of the wallet to sign with
 * @param psbtBase64 - Base64 encoded unsigned/partially signed PSBT string
 * @param signInputs - Whether to sign the inputs (def: true)
 * @param sighashtype - Signature hash type (def: "ALL")
 * @param bip32derivs - whether to include the BIP32 derivation info (def: true)
 * @returns Object containing the signed PSBT and completion status
 */

  async signPsbt(
    walletName: string,
    psbtBase64: string,
    signInputs: boolean = true,
    sighashtype: string = "ALL",
    bip32derivs: boolean = true,
  ): Promise<{ psbt: string; complete: boolean }> {
    try {
      const walletClient = this.getWalletClient(walletName);

      const result = await walletClient?.command("walletprocesspsbt", psbtBase64, signInputs, sighashtype, bip32derivs );

      console.log(`psbt signed with wallet ${walletName}:`, {
        complete: result.complete,
        // checking if psbt changed
        hasSignatures: result.psbt !== psbtBase64
      })

      return {
        psbt: result.psbt,
        complete: result.complete
      }
    } catch (error) {
      throw new Error(`Failed to sign PSBT with wallet ${walletName}: ${error}`)
      
    }
  }

  /**
 * Extracts individual signatures from a signed PSBT for manual input testing
 * 
 * @param psbtBase64 - Base64 encoded signed PSBT
 * @returns Array of signature objects with hex signatures and public keys
 */

  async extractSignaturesFromPsbt(psbtBase64: string): Promise<{
    signatures: string[],
    publicKeys: string[],
    inputIndex: number
  }[]>{

   try {
    const decodedPbst = await this.client.command("decodepsbt", psbtBase64);
    console.log("decoded Psbt:",decodedPbst)

    //! define its type as well after testings
    const extractedSignatures: any = [];
    
    // Iterate through each input to extract signatures
    for(let inputIndex = 0; inputIndex < decodedPbst.inputs.length; inputIndex++){
      const input = decodedPbst.inputs[inputIndex];

      // Check if this input has partial signatures
      if(input.partial_signature){
        const signatures: string[] = [];
        const publicKeys: string[] = [];

        // Extract each signature and its corresponding public key
        for(const [pubkey, signature] of Object.entries(input.partial_signature)){
          publicKeys.push(pubkey);
          signatures.push(signature as string);
        }

        if(signatures.length > 0){
          extractedSignatures.push({
            signatures,
            publicKeys,
            inputIndex
          });
        }
      }
    }
    console.log(`extracted ${extractedSignatures.length} signs from psbt`);
    return extractedSignatures;

    
   } catch (error) {
    throw new Error(`Failed to extract signatures from PSBT: ${error}`)
   }

  }

  /**
 * Combines multiple PSBTs into a single PSBT with all signatures
 * Useful when we have separate PSBTs signed by different wallets
 * 
 * @param psbtArray - Array of base64 encoded PSBTs to combine
 * @returns Combined PSBT with all signatures
 */

  async combinePsbt(psbtArray: string[]): Promise<string>{
    try {
      if(psbtArray.length < 2){
        throw new Error("Need at least 2 PSBTs to combine")
      }
      
      // So, combinepsbt will take this array of PSBTs and will merge their signatures
      const combinePsbt = await this.client.command("combinepsbt", psbtArray)

      console.log(`successfully combined ${psbtArray.length} psbts: ${combinePsbt}`)

      return combinePsbt;
      
    } catch (error) {
      console.log("error",error)
      throw new Error(`Failed to combine PSBTs: ${error}`)
    }
  }
  
  /**
   * Decodes a PSBT and returns detailed information about its structure and signatures
   * 
   * @param psbtBase64 - Base64 encoded PSBT string
   * @returns Decoded PSBT information including inputs, outputs, and signature data
   */
  async decodePsbt(psbtBase64: string): Promise<any> {
    try {
      const decodedPsbt = await this.client.command("decodepsbt", psbtBase64);
      return decodedPsbt;
    } catch (error) {
      throw new Error(`Failed to decode PSBT: ${error}`);
    }
  }

  /**
   * Finalize a PSBT and extracts the raw transaction hex
   * This will convert a fully signed PSBT into a broadcastable transaction
   * 
   * @param fullySignedPsbt - Base64 encoded fully signed PSBT
   * @param extract - Whether to extract the final transaction (def: true)
   * @returns Object with finalized PSBT and transaction hex (if extracted)
   */

  async finalizePsbt(fullySignedPsbt: string, extract: boolean = true): Promise<{psbt?: string, hex?: string, complete: boolean}> {
      try {
        // finalizepsbt completes the PSBT by adding final scriptsig/scriptwitness 
        const result = await this.client.command("finalizepsbt", fullySignedPsbt, extract);
        
        console.log("final PSBT result: ", {complete: result.complete, txhex: result?.hex})

        return {
          psbt: result.psbt,
          hex: result.hex,
          complete: result.complete
        };
      } catch (error) {
        throw new Error(`Failed to finalize PSBT: ${error}`)
      }
  }
}
