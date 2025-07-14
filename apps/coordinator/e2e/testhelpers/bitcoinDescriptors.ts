import { MultiWalletDescriptors, WalletDescriptors } from "../utils/types";



/**
 * Extracts address descriptors (XFP and path) from a single wallet
 */
export async function extractWalletDescriptors(walletName: string, client: any): Promise<WalletDescriptors> {
  const descriptors = await client?.extractAddressDescriptors(walletName);
  
  if (!descriptors) {
    throw new Error(`Failed to extract descriptors for wallet: ${walletName}`);
  }

  const xfp = descriptors.p2pkh.fingerPrint;
  const path = descriptors.p2pkh.path;
  const formattedPath = "m/" + path?.replace(/h/g, "'");

  if (!xfp || !path) {
    throw new Error(`Invalid descriptors for wallet ${walletName}: xfp=${xfp}, path=${path}`);
  }

  return {
    xfp,
    path,
    formattedPath,
  };
}

export async function extractMultiWalletDescriptors(walletNames: string[], client: any): Promise<MultiWalletDescriptors> {
  // Extract descriptors for all wallets in parallel
  const descriptorPromises = walletNames.map(walletName => 
    extractWalletDescriptors(walletName, client)
  );
  
  const descriptors = await Promise.all(descriptorPromises);
  
  const xfps = descriptors.map(d => d.xfp);
  const paths = descriptors.map(d => d.path);
  const formattedPaths = descriptors.map(d => d.formattedPath);
  
  return {
    xfps,
    paths,
    formattedPaths,
    descriptors,
  };
}

/**
 * Extracts XFPs and formatted paths from 3 specific wallets
 */
export async function extractThreeWalletDescriptors(walletNames: string[], client: any): Promise<{
  xfps: [string, string, string];
  formattedPaths: [string, string, string];
}> {
  if (walletNames.length !== 3) {
    throw new Error(`Expected exactly 3 wallet names, got ${walletNames.length}`);
  }
  
  const result = await extractMultiWalletDescriptors(walletNames, client);
  
  return {
    xfps: result.xfps as [string, string, string],
    formattedPaths: result.formattedPaths as [string, string, string],
  };
} 