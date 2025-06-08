import BitcoinCore from "bitcoin-core";

export interface rpcConfig {
  username: string;
  password: string;
  host: string;
  port: number;
  wallet?: string;
}

export interface walletConfig {
  wallet_name: string;
  disable_private_keys?: boolean;
  blank?: boolean;
  passphrase?: string;
  avoid_reuse?: boolean;
  descriptors?: boolean;
  load_on_startup?: boolean;
  external_signer?: boolean;
}

export class BitcoinCoreService {
  private clientConfig: rpcConfig;
  private client: BitcoinCore;
  private walletClient: Map<string, BitcoinCore> = new Map();

  constructor(clientConfig: rpcConfig) {
    this.clientConfig = {
      username: clientConfig.username || "abhishek",
      password: clientConfig.password || "abhishek",
      port: clientConfig.port || 18443,
      host: clientConfig.host || "http://localhost:18443",
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
        walletConfig.descriptors,
        walletConfig.load_on_startup,
        walletConfig.external_signer,
      );
      return wallet
    } catch (error) {
        console.log("Error while create wallet: ",error)
    }
  }
}
