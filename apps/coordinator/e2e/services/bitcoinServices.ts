import BitcoinCore from "bitcoin-core";
import {
  SingleSigAddressType,
  descStructure,
  rpcConfig,
  walletConfig,
} from "../state/types";

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
      throw new Error(
        `Failed to get wallet client for '${walletName}': ${error}`,
      );
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
          throw new Error(
            `Failed to connect to Bitcoin Core RPC after ${maxRetries} attempts: ${error}`,
          );
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
      throw new Error(`Failed to fetch blockchain info: ${error}`);
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
      throw new Error(
        `Failed to create wallet '${walletConfig.wallet_name}': ${error}`,
      );
    }
  }

  async loadWallets(walletName: string) {
    try {
      const loadWallet = this.client.command("loadwallet", walletName);
      return loadWallet;
    } catch (error) {
      throw new Error(`Failed to load wallet '${walletName}': ${error}`);
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
      throw new Error(`Failed to unload wallet '${walletName}': ${error}`);
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
      throw new Error(
        `Failed to check if wallet '${walletName}' exists: ${error}`,
      );
    }
  }

  async listWallets() {
    try {
      const allWallets = await this.client.command("listwallets");
      return allWallets;
    } catch (error) {
      throw new Error(`Failed to list wallets: ${error}`);
    }
  }

  async listDescriptors(walletName: string) {
    try {
      const walletClient = this.getWalletClient(walletName);

      const descriptors = await walletClient?.command("listdescriptors");
      return descriptors;
    } catch (error) {
      throw new Error(
        `Failed to list descriptors for wallet '${walletName}': ${error}`,
      );
    }
  }

  async extractAddressDescriptors(
    walletName: string,
  ): Promise<Record<SingleSigAddressType, descStructure>> {
    try {
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
    } catch (error) {
      throw new Error(
        `Failed to extract address descriptors for wallet '${walletName}': ${error}`,
      );
    }
  }
  async checkBalance(walletName: string) {
    try {
      const walletClient = this.getWalletClient(walletName);

      const balance = await walletClient?.command("getbalance");
      return balance;
    } catch (error) {
      throw new Error(
        `Failed to check balance for wallet '${walletName}': ${error}`,
      );
    }
  }

  async getNewAddress(walletName: string) {
    try {
      const client = this.getWalletClient(walletName);

      const address = await client?.command("getnewaddress");
      return address;
    } catch (error) {
      throw new Error(
        `Failed to get new address from wallet '${walletName}': ${error}`,
      );
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
      throw new Error(
        `Failed to fund address '${address}' from wallet '${walletName}': ${error}`,
      );
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
      throw new Error(
        `Failed to check balance for address '${address}' in wallet '${walletName}': ${error}`,
      );
    }
  }

  async sendToAddress(walletName: string, toAddress: string, amount: number) {
    try {
      const walletClient = this.getWalletClient(walletName);

      let txid = await walletClient?.command(
        "sendtoaddress",
        toAddress,
        amount,
      );

      return txid;
    } catch (error) {
      throw new Error(
        `Failed to send ${amount} BTC from wallet '${walletName}' to address '${toAddress}': ${error}`,
      );
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

      const result = await walletClient?.command(
        "walletprocesspsbt",
        psbtBase64,
        signInputs,
        sighashtype,
        bip32derivs,
      );

      return {
        psbt: result.psbt,
        complete: result.complete,
      };
    } catch (error) {
      throw new Error(
        `Failed to sign PSBT with wallet ${walletName}: ${error}`,
      );
    }
  }

  /**
   * Extracts individual signatures from a signed PSBT for manual input testing
   *
   * @param psbtBase64 - Base64 encoded signed PSBT
   * @returns Array of signature objects with hex signatures and public keys
   */

  async extractSignaturesFromPsbt(psbtBase64: string): Promise<
    {
      signatures: string[];
      publicKeys: string[];
      inputIndex: number;
    }[]
  > {
    try {
      const decodedPbst = await this.client.command("decodepsbt", psbtBase64);
      const extractedSignatures: any = [];

      // Iterate through each input to extract signatures
      for (
        let inputIndex = 0;
        inputIndex < decodedPbst.inputs.length;
        inputIndex++
      ) {
        const input = decodedPbst.inputs[inputIndex];

        // Check if this input has partial signatures
        if (input.partial_signatures) {
          const signatures: string[] = [];
          const publicKeys: string[] = [];

          // Extract each signature and its corresponding public key
          for (const [pubkey, signature] of Object.entries(
            input.partial_signatures,
          )) {
            publicKeys.push(pubkey);
            signatures.push(signature as string);
          }

          if (signatures.length > 0) {
            extractedSignatures.push({
              signatures,
              publicKeys,
              inputIndex,
            });
          }
        }
      }
      return extractedSignatures;
    } catch (error) {
      throw new Error(`Failed to extract signatures from PSBT: ${error}`);
    }
  }
}
