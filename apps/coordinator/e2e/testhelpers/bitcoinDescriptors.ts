import { MultiWalletDescriptors, SingleSigAddressType, WalletDescriptors } from "../utils/types";

/**
 * Extracts address descriptors (XFP and path) from a single wallet
 */
export async function extractWalletDescriptors(walletName: string, client: any, addressType: SingleSigAddressType): Promise<WalletDescriptors> {
  const descriptors = await client?.extractAddressDescriptors(walletName);
  
  if (!descriptors) {
    throw new Error(`Failed to extract descriptors for wallet: ${walletName}`);
  }

  const targetDescriptor = descriptors[addressType];
  if (!targetDescriptor) {
    throw new Error(`No ${addressType} descriptor found for wallet: ${walletName}`);
  }

  const xfp = targetDescriptor.fingerPrint;
  const path = targetDescriptor.path;
  const formattedPath = "m/" + path?.replace(/h/g, "'");
  const xpub = targetDescriptor.xpub;

  if (!xfp || !path) {
    throw new Error(`Invalid descriptors for wallet ${walletName}: xfp=${xfp}, path=${path}`);
  }

  return {
    xfp,
    path,
    formattedPath,
    addressType,
    xpub
  };
}

export async function extractMultiWalletDescriptors(walletNames: string[], client: any, addressType: SingleSigAddressType): Promise<MultiWalletDescriptors> {
  // Extract descriptors for all wallets in parallel
  const descriptorPromises = walletNames.map(walletName => 
    extractWalletDescriptors(walletName, client, addressType)
  );
  
  const descriptors = await Promise.all(descriptorPromises);
  
  const xfps = descriptors.map(d => d.xfp);
  const paths = descriptors.map(d => d.path);
  const formattedPaths = descriptors.map(d => d.formattedPath);
  const xpubs = descriptors.map(d => d.xpub);
  
  return {
    xfps,
    paths,
    formattedPaths,
    descriptors,
    xpubs
  };
}