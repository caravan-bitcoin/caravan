import BitcoinCore from "bitcoin-core";
import {AddressType, descStructure, rpcConfig, walletConfig} from "./types"

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

  async testRpcConnection() {
    const maxRetries = 10;
    const delay = 2000;

    for (let i = 1; i <= maxRetries; i++) {
      try {
        const res = await this.client.command("getblockchaininfo");

        console.log("Connected to Bitcoin Core successfully");
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
      const unloadWallet = await this.client.command("unloadwallet", walletName);
      return unloadWallet;
    } catch (error) {
      console.log("Error unloading wallet:", error);
      throw error;
    }
  }

  async walletexists(walletName: string): Promise<boolean> {
    try {
      const wallets = await this.listWallets();

      if (wallets.includes(walletName)) {
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
  ): Promise<Record<AddressType, descStructure>> {
    const walletClient = this.getWalletClient(walletName);
    const allDesc = await walletClient?.command("listdescriptors");

    const standardDescRegex = /^\w+\(\[(.+?)\/(.+?)\](.+?)\/(.+?)\)\#(.+)$/;
    const shWpkhDescRegex =
      /^sh\(wpkh\(\[(.+?)\/(.+?)\](.+?)\/(.+?)\)\)\#(.+)$/;

    const parsedAddressDescriptors: Record<AddressType, descStructure> = {
      p2pkh: { checksum: "", fingerPrint: "", path: "", xpub: "" },
      "p2sh-p2wpkh": { checksum: "", fingerPrint: "", path: "", xpub: "" },
      p2wpkh: { checksum: "", fingerPrint: "", path: "", xpub: "" },
    };

    for (let desc of allDesc.descriptors) {
      const descriptor = desc.desc;

      if (descriptor.startsWith("sh(wpkh(")) {
        const match = descriptor.match(shWpkhDescRegex);
        if (match) {
          parsedAddressDescriptors["p2sh-p2wpkh"] = {
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
}
