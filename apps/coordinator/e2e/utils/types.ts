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
    password?: string
  }
  