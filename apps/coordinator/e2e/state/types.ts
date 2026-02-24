/**
 * Shared type definitions for the entire E2E test infrastructure.
 *
 * This is the SINGLE SOURCE OF TRUTH for types across all layers.
 * Every page object, service, and fixture imports from here.
 *
 * CONVENTION: When adding a new feature ,
 * add types here first. TypeScript will be of great help then.
 */

// ─── Bitcoin RPC Types ──────────────────────────────────────

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

// ─── UI / Page Object Types ────────────────────────────────

export interface ClientSetupOptions {
  url?: string;
  username?: string;
  password?: string;
  watcherWallet?: string;
}

export interface receiveTableData {
  pathSuffix: string;
  utxos: string;
  balance: string;
  address: string;
}

export interface AddressTableData {
  pathSuffix: string;
  utxos: string;
  balance: string;
  lastUsed: string;
  address: string;
}

// ─── Test State Types ──────────────────────────────────────

export interface walletReference {
  walletName: string;
  address: string;
}

export interface downloadedFiles {
  WalletFile?: string;
  UnsignedPsbt?: string;
}

/**
 * Shared state persisted to disk between test projects.
 *
 * The setup project writes this. Behavioral tests read it.
 * This is the contract between infrastructure and assertions.
 */
export interface TestState {
  downloadDir: string;
  uploadDir: string;
  downloadDirFiles: downloadedFiles;
  uploadedDirFiles?: string[];
  test_wallet_names: string[];
  test_wallets: any[];
  sender: walletReference;
  receiver: walletReference;
  /** Addresses collected during setup, used by behavioral tests to verify UI */
  walletAddresses?: string[];
  timestamp: number;
}

// ─── Descriptor Types ──────────────────────────────────────

export interface WalletDescriptors {
  xfp: string;
  path: string;
  formattedPath: string;
  addressType?: string;
  xpub: string;
}

export interface MultiWalletDescriptors {
  xfps: string[];
  paths: string[];
  formattedPaths: string[];
  descriptors: WalletDescriptors[];
  xpubs: string[];
}

// ─── PSBT Types ────────────────────────────────────────────

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
