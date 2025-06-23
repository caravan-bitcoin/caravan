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
  
  export type AddressType = "p2sh" | "p2sh-p2wsh" | "p2wsh";
  
  export interface descStructure {
    checksum: string;
    fingerPrint: string;
    path: string;
    xpub: string;
  }