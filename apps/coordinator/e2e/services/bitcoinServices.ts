import { callBitcoind } from "@caravan/clients";
import {
  SingleSigAddressType,
  descStructure,
  rpcConfig,
  walletConfig,
} from "../state/types";

export class BitcoinCoreService {
  private readonly baseUrl: string;
  private readonly auth: { username: string; password: string };

  constructor(clientConfig: rpcConfig) {
    this.baseUrl = clientConfig.host;
    this.auth = {
      username: clientConfig.username,
      password: clientConfig.password,
    };
  }

  private walletUrl(walletName: string): string {
    return `${this.baseUrl}/wallet/${walletName}`;
  }

  private async rpc<T>(
    url: string,
    method: string,
    params: unknown[] = [],
  ): Promise<T> {
    const response = await callBitcoind<T>(url, this.auth, method, params);
    if (response.error) {
      throw new Error(
        `bitcoind RPC '${method}' failed: ${response.error.code} ${response.error.message}`,
      );
    }
    return response.result;
  }

  async waitForBitcoinCore() {
    const maxRetries = 10;
    const delay = 2000;

    for (let i = 1; i <= maxRetries; i++) {
      try {
        return await this.rpc<unknown>(this.baseUrl, "getblockchaininfo");
      } catch (error) {
        console.log(`Attempt: ${i}/${maxRetries} & error: ${error} `);
        if (i == maxRetries) {
          throw new Error(
            `Failed to connect to Bitcoin Core RPC after ${maxRetries} attempts: ${error}`,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  async getBlockchainInfo() {
    try {
      return await this.rpc<unknown>(this.baseUrl, "getblockchaininfo");
    } catch (error) {
      throw new Error(`Failed to fetch blockchain info: ${error}`);
    }
  }

  async createWallet(walletConfig: walletConfig) {
    try {
      return await this.rpc<unknown>(this.baseUrl, "createwallet", [
        walletConfig.wallet_name,
        walletConfig.disable_private_keys,
        walletConfig.blank,
        walletConfig.passphrase,
        walletConfig.avoid_reuse,
        walletConfig.descriptors ?? true,
        walletConfig.load_on_startup ?? true,
        walletConfig.external_signer,
      ]);
    } catch (error) {
      throw new Error(
        `Failed to create wallet '${walletConfig.wallet_name}': ${error}`,
      );
    }
  }

  async loadWallets(walletName: string) {
    try {
      return await this.rpc<unknown>(this.baseUrl, "loadwallet", [walletName]);
    } catch (error) {
      throw new Error(`Failed to load wallet '${walletName}': ${error}`);
    }
  }

  async unloadWallet(walletName: string) {
    try {
      return await this.rpc<unknown>(this.baseUrl, "unloadwallet", [
        walletName,
      ]);
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
      return await this.rpc<string[]>(this.baseUrl, "listwallets");
    } catch (error) {
      throw new Error(`Failed to list wallets: ${error}`);
    }
  }

  async listDescriptors(walletName: string) {
    try {
      return await this.rpc<unknown>(
        this.walletUrl(walletName),
        "listdescriptors",
      );
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
      const allDesc = await this.rpc<{
        descriptors: { desc: string }[];
      }>(this.walletUrl(walletName), "listdescriptors");

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
      return await this.rpc<number>(this.walletUrl(walletName), "getbalance");
    } catch (error) {
      throw new Error(
        `Failed to check balance for wallet '${walletName}': ${error}`,
      );
    }
  }

  async getNewAddress(walletName: string) {
    try {
      return await this.rpc<string>(
        this.walletUrl(walletName),
        "getnewaddress",
      );
    } catch (error) {
      throw new Error(
        `Failed to get new address from wallet '${walletName}': ${error}`,
      );
    }
  }

  async fundAddress(address: string, walletName: string, blocks?: number) {
    try {
      const blockHashes = await this.rpc<string[]>(
        this.baseUrl,
        "generatetoaddress",
        [blocks ?? 101, address],
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
      return await this.rpc<number>(
        this.walletUrl(walletName),
        "getreceivedbyaddress",
        [address],
      );
    } catch (error) {
      throw new Error(
        `Failed to check balance for address '${address}' in wallet '${walletName}': ${error}`,
      );
    }
  }

  async sendToAddress(walletName: string, toAddress: string, amount: number) {
    try {
      return await this.rpc<string>(
        this.walletUrl(walletName),
        "sendtoaddress",
        [toAddress, amount],
      );
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
      const result = await this.rpc<{ psbt: string; complete: boolean }>(
        this.walletUrl(walletName),
        "walletprocesspsbt",
        [psbtBase64, signInputs, sighashtype, bip32derivs],
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
      const decodedPbst = await this.rpc<{
        inputs: {
          partial_signatures?: Record<string, string>;
        }[];
      }>(this.baseUrl, "decodepsbt", [psbtBase64]);
      const extractedSignatures: {
        signatures: string[];
        publicKeys: string[];
        inputIndex: number;
      }[] = [];

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

          for (const [pubkey, signature] of Object.entries(
            input.partial_signatures,
          )) {
            publicKeys.push(pubkey);
            signatures.push(signature);
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
