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
  
  export type SingleSigAddressType = "p2pkh" | "p2sh_p2wpkh" | "p2wpkh";
  
  export interface descStructure {
    checksum: string;
    fingerPrint: string;
    path: string;
    xpub: string;
  }

  export interface ClientSetupOptions {
    url?: string,
    username?: string,
    password?: string,
    watcherWallet?: string,
  }

  export interface TestState {
    downloadWalletFile: string,
    test_wallet_names: string[],
    test_wallets: any[]
    walletAddress: string
    timestamp: number
  }

export interface receiveTableData {
    pathSuffix: string,
    utxos: string,
    balance: string,
    address: string
  }
  
export interface AddressTableData {
    pathSuffix: string;
    utxos: string;
    balance: string;
    lastUsed: string;
    address: string;
}

export interface WalletDescriptors {
  xfp: string;
  path: string;
  formattedPath: string;
}

export interface MultiWalletDescriptors {
  xfps: string[];
  paths: string[];
  formattedPaths: string[];
  descriptors: WalletDescriptors[];
}
