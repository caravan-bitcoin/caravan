import { Network, bitcoinsToSatoshis } from "@caravan/bitcoin";
import { TransactionAnalyzer, UTXO as FeeUTXO } from "@caravan/fees";
import { FeePriority, FeeBumpRecommendation } from "./types";
import { TransactionT } from "../types";
import { BlockchainClient } from "@caravan/clients";

/**
 * Confirmation targets for fee estimation in blocks
 *
 * These values align with common confirmation targets used generally:
 * - HIGH: Next block (10 minutes)
 * - MEDIUM: ~3 blocks (30 minutes)
 * - LOW: ~6 blocks (1 hour)
 *
 * @see https://gist.github.com/morcos/d3637f015bc4e607e1fd10d8351e9f41
 */
export const CONFIRMATION_TARGETS = {
  HIGH: 1, // Next block (~10 min)
  MEDIUM: 3, // Within Next 3 blocks ~30 min
  LOW: 6, // Within Next 6 blocks ~1 hour
};

/**
 * Gets fee estimate from the blockchain client with fallback mechanisms
 *
 * This function retrieves fee estimates from the blockchain client and provides
 * fallback values if the API call fails. It ensures that we always have reasonable
 * fee values to work with as our fee-package needs a targetFeeRate it should target achieving
 *
 * @param blockchainClient - The initialized blockchain client
 * @param feeTarget - Target blocks for confirmation (default: 3)
 * @returns Promise resolving to fee rate in sat/vB
 */
export const getFeeEstimate = async (
  blockchainClient: BlockchainClient,
  withinBlocks: number = CONFIRMATION_TARGETS.MEDIUM,
): Promise<number> => {
  try {
    if (!blockchainClient) {
      throw new Error("Blockchain client not initialized");
    }

    // Get fee estimate from the clients
    const feeRate = await blockchainClient.getFeeEstimate(withinBlocks);
    // Fallback values if the `getFeeEstimate` returns NaN
    if (!feeRate) {
      switch (withinBlocks) {
        case CONFIRMATION_TARGETS.HIGH:
          return 32.75; // Higher priority
        case CONFIRMATION_TARGETS.MEDIUM:
          return 32.75; // Medium priority
        case CONFIRMATION_TARGETS.LOW:
          return 20.09; // Lower priority
        default:
          return 32.75; // Default medium priority
      }
    }
    return Math.max(1, Math.ceil(feeRate)); // Ensure we have at least 1 sat/vB
  } catch (error) {
    console.error("Error fetching fee estimate:", error);

    // Fallback values based on :
    // https://b10c.me/blog/003-a-list-of-public-bitcoin-feerate-estimation-apis/
    // These values are reasonable defaults but will be less accurate
    switch (withinBlocks) {
      case CONFIRMATION_TARGETS.HIGH:
        return 32.75; // Higher priority
      case CONFIRMATION_TARGETS.MEDIUM:
        return 32.75; // Medium priority
      case CONFIRMATION_TARGETS.LOW:
        return 20.09; // Lower priority
      default:
        return 32.75; // Default medium priority
    }
  }
};

/**
 * Analyzes a transaction and provides fee bumping recommendations based on
 * current network fee estimates and transaction characteristics
 *
 * @param txHex - The raw transaction hex string
 * @param fee - The current transaction fee in satoshis
 * @param network - The Bitcoin network being used
 * @param availableUtxos - Available UTXOs for fee bumping
 * @param blockchainClient - The blockchain client for fee estimation
 * @param walletConfig - Wallet configuration parameters
 * @returns Fee bumping analysis and recommendations
 */
export const analyzeTransaction = async (
  txHex: string,
  fee: number,
  network: Network,
  availableUtxos: FeeUTXO[],
  blockchainClient: BlockchainClient,
  walletConfig: {
    requiredSigners: number;
    totalSigners: number;
    addressType: string;
  },
  feePriority: FeePriority = FeePriority.MEDIUM,
): Promise<FeeBumpRecommendation> => {
  // Get fee estimates for different confirmation targets
  const highPriorityFee = await getFeeEstimate(
    blockchainClient,
    CONFIRMATION_TARGETS.HIGH,
  );
  const mediumPriorityFee = await getFeeEstimate(
    blockchainClient,
    CONFIRMATION_TARGETS.MEDIUM,
  );
  const lowPriorityFee = await getFeeEstimate(
    blockchainClient,
    CONFIRMATION_TARGETS.LOW,
  );

  // Select target fee rate based on user priority
  let targetFeeRate: number;
  switch (feePriority) {
    case FeePriority.HIGH:
      targetFeeRate = highPriorityFee;
      break;
    case FeePriority.MEDIUM:
      targetFeeRate = mediumPriorityFee;
      break;
    case FeePriority.LOW:
      targetFeeRate = lowPriorityFee;
      break;
    default:
      targetFeeRate = mediumPriorityFee; // Default to medium if somehow invalid
  }

  // Validate inputs
  if (!txHex || typeof txHex !== "string") {
    console.error("Invalid txHex:", typeof txHex, txHex);
    throw new Error("Transaction hex must be a string");
  }

  if (isNaN(fee) || fee < 0) {
    console.error("Invalid fee:", fee);
    fee = 0; // Use a default value
  }

  // Check if we have valid UTXOs
  if (
    !availableUtxos ||
    !Array.isArray(availableUtxos) ||
    availableUtxos.length === 0
  ) {
    throw new Error("No UTXOs available for fee bumping");
  }

  // Create analyzer with wallet-specific parameters
  const analyzer = new TransactionAnalyzer({
    txHex,
    network,
    targetFeeRate,
    absoluteFee: fee.toString(),
    availableUtxos,
    requiredSigners: walletConfig.requiredSigners,
    totalSigners: walletConfig.totalSigners,
    addressType: walletConfig.addressType,
  });

  // Get comprehensive analysis
  const analysis = analyzer.analyze();

  // Return the analysis from the analyzer with added network fee estimates
  return {
    ...analysis,
    networkFeeEstimates: {
      highPriority: highPriorityFee,
      mediumPriority: mediumPriorityFee,
      lowPriority: lowPriorityFee,
    },
    userSelectedFeeRate: targetFeeRate, // Telling us the feeRate we can expect based on user selected no. of blocks to confirm
    userSelectedPriority: feePriority, // Telling us which FeePriority user choosed
  };
};

// UTILITY FUNCTIONS FOR extractUtxosForFeeBumping`

/**
 * Extracts the output address from a transaction at the specified output index
 */
const extractOutputAddressFromTransaction = (
  fullTx: any,
  vout: number,
): string | null => {
  try {
    // Handle different transaction formats from various blockchain clients
    if (typeof fullTx === "object" && fullTx && fullTx.vout) {
      // Private client response format
      const voutData = fullTx.vout[vout];
      if (voutData) {
        // Try multiple address field variations
        return (
          voutData.scriptPubkeyAddress ||
          voutData.scriptPubKey?.address ||
          voutData.scriptpubkey_address ||
          null
        );
      }
    }
    return null;
  } catch (error) {
    console.error(`Error extracting output address from transaction:`, error);
    return null;
  }
};

/**
 * Finds the wallet slice that matches the given output address
 */
const findMatchingWalletSlice = (
  allSlices: any[],
  outputAddress: string | null,
): any | null => {
  if (!outputAddress) return null;

  // Find the corresponding wallet slice for this address
  // This gives us the multisig details, BIP32 path, etc.
  const matchingSlice = allSlices.find(
    (slice) => slice.multisig?.address === outputAddress,
  );

  return matchingSlice || null;
};

/**
 * Extracts BIP32 derivation paths and multisig scripts from a wallet slice
 */
const extractBip32MetadataFromSlice = (slice: any): object => {
  const metadata: any = {};

  try {
    // Extract BIP32 derivation path
    if (slice.bip32Path) {
      metadata.bip32Path = slice.bip32Path;
    }

    // Extract BIP32 derivation information for each pubkey
    if (slice.multisig?.bip32Derivation) {
      metadata.bip32Derivations = slice.multisig.bip32Derivation.map(
        (derivation: any) => ({
          masterFingerprint: derivation.masterFingerprint,
          path: derivation.path,
          pubkey: derivation.pubkey,
        }),
      );
    }

    // Extract witness script (for P2WSH)
    if (slice.multisig?.output) {
      metadata.witnessScript = slice.multisig.output;
    }

    // Extract redeem script (for P2SH-wrapped)
    if (slice.multisig?.redeem?.output) {
      metadata.redeemScript = slice.multisig.redeem.output;
    }

    // Extract script hash
    if (slice.multisig?.hash) {
      metadata.scriptHash = slice.multisig.hash;
    }

    // Extract script type information
    if (slice.multisig?.name) {
      metadata.scriptType = slice.multisig.name;
    }

    // Extract address type and change flag
    metadata.isChange = slice.change || false;

    // Include address for reference
    if (slice.multisig?.address) {
      metadata.address = slice.multisig.address;
    }

    // Extract network information
    if (slice.multisig?.network) {
      metadata.network = slice.multisig.network;
    }

    console.log(`Extracted BIP32 metadata:`, {
      address: metadata.address,
      scriptType: metadata.scriptType,
      bip32Path: metadata.bip32Path,
      derivationCount: metadata.bip32Derivations?.length || 0,
      hasWitnessScript: !!metadata.witnessScript,
      hasRedeemScript: !!metadata.redeemScript,
    });
  } catch (error) {
    console.error("Error extracting BIP32 metadata from slice:", error);
  }

  return metadata;
};

/**
 * Extracts UTXOs from a transaction and wallet state for fee bumping
 *
 * This function collects two types of UTXOs needed for fee bumping operations:
 * 1. Original transaction inputs (required for RBF) - with recovered BIP32 paths and scripts
 * 2. Available wallet UTXOs (for adding inputs to new transactions)
 *
 * For spent UTXOs, this function implements a recovery mechanism to restore
 * BIP32 derivation paths and multisig scripts by matching output addresses
 * to known wallet slices.
 *
 * @param transaction - The transaction object to analyze
 * @param walletState - Current wallet state containing UTXOs
 * @param blockchainClient - Blockchain client for fetching additional details if needed
 * @returns Array of UTXOs formatted for use with the fee bumping algorithms
 */
export const extractUtxosForFeeBumping = async (
  transaction: TransactionT,
  depositNodes: any,
  changeNodes: any,
  blockchainClient: BlockchainClient,
): Promise<FeeUTXO[]> => {
  // Array to store
  const utxos: FeeUTXO[] = [];
  console.log("fullTX", transaction);
  try {
    // STEP 0: PREPARE WALLET SLICES FOR BIP32 RECOVERY
    // ------------------------------------------------
    // Combine all wallet slices for efficient lookup during BIP32 recovery
    const allSlices = [
      ...Object.values(depositNodes),
      ...Object.values(changeNodes),
    ].filter((slice: any) => slice?.multisig?.address); // Only include slices with valid addresses

    console.log(
      `Prepared ${allSlices.length} wallet slices for BIP32 recovery`,
    );

    // STEP 1: COLLECT WALLET UTXOS
    // ---------------------------

    // Create a map to track which UTXOs we've already processed
    // This helps us avoid duplicates when checking transaction inputs
    const processedUtxoMap = new Map<string, boolean>();

    // STEP 2: EXTRACT TRANSACTION INPUTS
    // ----------------------------------
    // These are needed for RBF because we must include the original inputs
    for (const input of transaction.vin) {
      // Our client sources (private node, Mempool.space, Blockstream.info)
      // all return inputs (`vin`) using the same structure—each entry includes
      // both `txid` and `vout` fields for easy, consistent parsing.
      //
      // Sources:
      // - Bitcoin Core (private RPC):
      //   https://developer.bitcoin.org/reference/rpc/gettransaction.html
      // - Mempool.space (public REST API):
      //   https://mempool.space/docs/api/rest#get-transaction
      // - Blockstream.info (public Esplora API):
      //   https://github.com/blockstream/esplora/blob/master/API.md#transaction-format
      const txid = input.txid;
      const vout = input.vout;
      console.log("inpt", input);
      // Skip if we don't have valid identifiers
      if (!txid || vout === undefined) continue;

      // Create a unique key to identify this UTXO
      const utxoKey = `${txid}:${vout}`;
      if (processedUtxoMap.has(utxoKey)) continue;
      processedUtxoMap.set(utxoKey, true);

      // Get the value of UTXO from the input's prevout if available
      let value: string | undefined;
      if (input.prevout && input.prevout.value) {
        value = input.prevout.value.toString(); // Note these properties exist in public clients
      }

      try {
        // Get the full previous transaction hex
        // This is REQUIRED for the TransactionAnalyzer to properly analyze inputs
        const fullTx = await blockchainClient.getTransaction(txid);
        const prevTxHex = await blockchainClient.getTransactionHex(txid);

        // STEP 2A: RECOVER BIP32 PATHS AND MULTISIG SCRIPTS
        // ------------------------------------------------
        /*
         * BIP32 Recovery Mechanism:
         * When a UTXO is spent, our wallet's UTXO set no longer retains the metadata
         * (BIP32 paths, multisig scripts). To recover this information:
         * 1. Extract the output address from the spending transaction
         * 2. Match this address against our known wallet slices
         * 3. Retrieve BIP32 derivation paths and multisig scripts from the matching slice
         */

        // Extract the output address that was spent by this input
        const outputAddress = extractOutputAddressFromTransaction(fullTx, vout);
        console.log(
          `Extracted output address for ${txid}:${vout} -> ${outputAddress}`,
        );

        // Find the corresponding wallet slice for this address
        const matchingSlice = findMatchingWalletSlice(allSlices, outputAddress);

        let recoveredMetadata = {};
        if (matchingSlice) {
          console.log(`Found matching slice for address ${outputAddress}`);
          recoveredMetadata = extractBip32MetadataFromSlice(matchingSlice);
        } else {
          console.warn(
            `No matching wallet slice found for address ${outputAddress}`,
          );
        }

        // If we don't have the value yet, try to get it from the wallet state (for only change outputs we see as rest used utxos are gone ...)
        if (!value) {
          // Look through all nodes for matching UTXOs
          for (const nodes of [depositNodes, changeNodes]) {
            for (const node of Object.values(nodes) as any[]) {
              if (!node.utxos || !node.utxos.length) continue;
              const matchingUtxo = node.utxos.find(
                (u: any) => u.txid === txid && u.index === vout,
              );

              if (matchingUtxo) {
                value = matchingUtxo.amountSats.toString();
              }
            }
            if (value) break;
          }
        }

        // If we still don't have a value, we need to extract it from the prev transaction
        if (!value) {
          // For private clients, we can use the raw transaction data
          if (typeof fullTx === "object" && fullTx && fullTx.vout) {
            // Handle private client response format
            const voutData = fullTx.vout[vout];
            if (voutData && voutData.value) {
              // Convert BTC to satoshis
              value = bitcoinsToSatoshis(voutData.value);
            }
          }
        }
        // Skip if we still don't have a value
        if (!value) {
          console.warn(
            `Skipping input ${txid}:${vout} - could not determine value`,
          );
          continue;
        }

        console.log("Successfully processed input:", {
          txid,
          vout,
          value,
          recoveredMetadata,
        });
        console.log("pushed", {
          txid,
          vout,
          value,
          prevTxHex,
        });
        // Add to UTXOs list with full transaction data
        utxos.push({
          txid,
          vout,
          value,
          prevTxHex,
          redeemScript: recoveredMetadata.redeemScript,
          witnessScript: recoveredMetadata.witnessScript,
          bip32Derivations: recoveredMetadata.bip32Derivations,
          sequence: input.sequence,
        });
      } catch (error) {
        console.warn(`Error processing input ${txid}:${vout}:`, error);
      }
    }

    // STEP 2: COLLECT ADDITIONAL SPENDABLE UTXOs FROM WALLET
    // ----------------------------------------------------

    // Process all wallet UTXOs
    for (const nodes of [depositNodes, changeNodes]) {
      for (const node of Object.values(nodes) as any[]) {
        if (!node.utxos || !node.utxos.length) continue;

        for (const utxo of node.utxos) {
          // Skip if missing required fields
          if (!utxo.txid || utxo.index === undefined || !utxo.amountSats)
            continue;

          // Skip unconfirmed UTXOs (safer for fee bumping)
          if (!utxo.confirmed) continue;

          const utxoKey = `${utxo.txid}:${utxo.index}`;

          // Skip if already processed
          if (processedUtxoMap.has(utxoKey)) continue;
          processedUtxoMap.set(utxoKey, true);

          try {
            // For actual fee bumping we need the full transaction hex
            const prevTxHex = await blockchainClient.getTransactionHex(
              utxo.txid,
            );

            utxos.push({
              txid: utxo.txid,
              vout: utxo.index,
              value: utxo.amountSats.toString(),
              prevTxHex,
            });
          } catch (error) {
            console.warn(
              `Skipping UTXO ${utxo.txid}:${utxo.index} - could not get transaction hex:`,
              error,
            );
            // If we can't get the full tx, add without prevTxHex - may work for some fee bumping scenarios
            utxos.push({
              txid: utxo.txid,
              vout: utxo.index,
              value: utxo.amountSats.toString(),
            });
          }
        }
      }
    }
    return utxos;
  } catch (error) {
    console.error("Error extracting UTXOs for fee bumping:", error);
    return utxos; // Return what we have, even if incomplete
  }
};

/**
 * Identifies the change output in a transaction by analyzing output addresses
 * and wallet data
 *
 * This function uses multiple heuristics to identify which output is the change:
 * 1. Matches against known wallet addresses
 * 2. Checks BIP32 path patterns (change addresses use path m/1/*)
 * 3. Position in outputs (change is often the last output)
 *
 * @param transaction - The transaction object
 * @param walletState - The wallet state containing addresses
 * @returns Index of the change output or undefined if not found
 *
 * @see https://en.bitcoin.it/wiki/Privacy#Change_address_detection
 */
export const getChangeOutputIndex = (
  transaction: TransactionT,
  depositNodes: any,
  changeNodes: any,
): number | undefined => {
  if (!transaction.vout || !transaction.vout.length) return undefined;

  // Create sets of known deposit and change addresses
  const depositAddresses = new Set(
    Object.values(depositNodes)
      .filter((node: any) => node.multisig && node.multisig.address)
      .map((node: any) => node.multisig.address),
  );

  const changeAddresses = new Set(
    Object.values(changeNodes)
      .filter((node: any) => node.multisig && node.multisig.address)
      .map((node: any) => node.multisig.address),
  );

  // Check each output to see if it's a change output
  for (let i = 0; i < transaction.vout.length; i++) {
    const output = transaction.vout[i];
    const address = output.scriptPubkeyAddress;

    if (!address) continue;

    //  address is in our change address list
    if (changeAddresses.has(address)) {
      return i;
    }
  }

  // Second pass: check if any output goes to a known wallet address
  // This is less reliable but can help identify change when the exact
  // change address isn't recognized
  for (let i = 0; i < transaction.vout.length; i++) {
    const output = transaction.vout[i];
    const address = output.scriptPubkeyAddress;

    if (!address) continue;

    if (depositAddresses.has(address)) {
      // If this is a deposit address in our wallet, it might be change
      // (though this is less reliable)
      return i;
    }
  }

  // If all else fails, the last output is often change by convention
  // This is the least reliable method, so we use it as a last resort
  return transaction.vout.length - 1;
};

/**
 * Formats a fee amount in satoshis to a human-readable string
 *
 * @param feeInSatoshis - The fee amount in satoshis
 * @param includeSuffix - Whether to include the "sats" suffix
 * @returns Formatted fee string
 */
export const formatFee = (
  feeInSatoshis: string,
  includeSuffix = true,
): string => {
  // Parse the fee as a number
  const fee = parseInt(feeInSatoshis, 10);

  if (isNaN(fee)) return "0" + (includeSuffix ? " sats" : "");

  // Format with thousands separators
  const formattedFee = fee.toLocaleString();

  return formattedFee + (includeSuffix ? " sats" : "");
};
