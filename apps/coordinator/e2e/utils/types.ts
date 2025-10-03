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

  export interface walletReference {
    walletName: string,
    address: string 
  }

  export interface downloadedFiles {
    WalletFile?: string,
    UnsignedPsbt?: string
  }

  export interface uploadFiles {

  }
  export interface TestState {
    downloadDir: string,
    uploadDir: string,
    downloadDirFiles: downloadedFiles,
    uploadedDirFiles?: string[],
    test_wallet_names: string[],
    test_wallets: any[]
    sender: walletReference,
    receiver: walletReference,
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
  addressType?: string;
  xpub: string
}

export interface MultiWalletDescriptors {
  xfps: string[];
  paths: string[];
  formattedPaths: string[];
  descriptors: WalletDescriptors[];
  xpubs: string[]
}

export interface SignedPsbtResult {
  unsignedPsbtPath: string
  signedPsbtPath: string
  signedPsbtBase64: string 
  isComplete?: boolean 
  walletsSigned: string[] 
}

export interface PsbtData {
  version: number
  inputCount: number
  outputCount: number
  inputs: PsbtInputData[]
  outputs: PsbtOutputData[]
  hasSignatures: boolean
  isComplete: boolean
  base64: string 
}

export interface PsbtInputData {
  txid: string
  vout: number 
  sequence?: number
  signatures: { [pubkey: string]: string}
  signatureCount: number 
  redeemScript?: string 
  witnessScript?: string 
}

export interface PsbtOutputData {
  address?: string 
  value: number 
  scriptPubKey: string 
}

// UTXO Selection Types
export interface UTXOInfo {
  amount: number; // in BTC
  checkboxSelector: string;
  txid: string;
  index: string;
}

export interface AddressUTXOData {
  pathSuffix: string;
  balance: number; // in BTC, converted from string
  address: string;
  utxos: UTXOInfo[];
  isExpanded: boolean;
}

export interface SimpleUTXOSelectionResult {
  selectedUTXOs: UTXOInfo[];
  totalAmount: number;
}

export interface IndividualSignatureResult {
  signatures: string[];
  publicKeys: string[];
  inputIndex: number;
}

export interface IndividualPsbtResult {
  walletName: string;
  signedPsbt: string;
  partialSignPsbtPath: string;
  signatures: IndividualSignatureResult[];
}

export interface IndividualSignedPsbtsResult {
  individualPsbts: IndividualPsbtResult[];
  unsignedPsbtPath: string;
}
