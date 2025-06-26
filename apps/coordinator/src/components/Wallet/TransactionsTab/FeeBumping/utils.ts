import { Transaction } from "bitcoinjs-lib-v6";

import {
  Network,
  bitcoinsToSatoshis,
  P2SH_P2WSH,
  P2SH,
  P2WSH,
} from "@caravan/bitcoin";
import {
  TransactionAnalyzer,
  UTXO as FeeUTXO,
  GlobalXpub,
  UTXO,
} from "@caravan/fees";
import { FeePriority, FeeBumpRecommendation, PSBTFields } from "./types";
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
      // Use default based on priority
      return getDefaultFeeRate(withinBlocks);
    }
    return Math.max(1, Math.ceil(feeRate)); // Ensure we have at least 1 sat/vB
  } catch (error) {
    console.error("Error fetching fee estimate:", error);

    return getDefaultFeeRate(withinBlocks);
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

/**
 * Extracts global extended public keys from wallet nodes for PSBT inclusion
 * @param depositNodes - Wallet deposit nodes
 * @param changeNodes - Wallet change nodes
 * @returns Array of GlobalXpub objects
 */
export const extractGlobalXpubsFromWallet = (
  depositNodes: any,
  changeNodes: any,
): GlobalXpub[] => {
  const globalXpubs: GlobalXpub[] = [];
  const seenXpubs = new Set<string>(); // Prevent duplicates

  // Helper to process a single node
  const processNode = (node: any) => {
    if (!node?.multisig?.braidDetails) return;

    try {
      const braidDetails = JSON.parse(node.multisig.braidDetails);
      const extendedPublicKeys = braidDetails.extendedPublicKeys || [];

      extendedPublicKeys.forEach((epk: any) => {
        // Use base58String as the unique identifier
        const xpubString = epk.base58String || epk.xpub;
        if (!xpubString || seenXpubs.has(xpubString)) return;

        seenXpubs.add(xpubString);

        const globalXpub: GlobalXpub = {
          xpub: xpubString,
          masterFingerprint:
            epk.rootFingerprint || epk.masterFingerprint || "00000000",
          path: epk.path || "m",
        };

        globalXpubs.push(globalXpub);
      });
    } catch (error) {
      console.warn("Error parsing braidDetails for globalXpubs:", error);
    }
  };

  // Process all deposit nodes
  if (depositNodes) {
    Object.values(depositNodes).forEach(processNode);
  }

  // Process all change nodes
  if (changeNodes) {
    Object.values(changeNodes).forEach(processNode);
  }

  return globalXpubs;
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
  const [highPriorityFee, mediumPriorityFee, lowPriorityFee] =
    await Promise.all([
      getFeeEstimate(blockchainClient, CONFIRMATION_TARGETS.HIGH),
      getFeeEstimate(blockchainClient, CONFIRMATION_TARGETS.MEDIUM),
      getFeeEstimate(blockchainClient, CONFIRMATION_TARGETS.LOW),
    ]);

  // Select target fee rate based on user priority
  const targetFeeRate = selectTargetFeeRate(feePriority, {
    high: highPriorityFee,
    medium: mediumPriorityFee,
    low: lowPriorityFee,
  });

  // Validate inputs
  validateTransactionInputs(txHex, fee, availableUtxos);

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

// ============================================================================
// UTXO EXTRACTION AND FORMATTING
// ============================================================================

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
  try {
    // STEP 0: PREPARE WALLET SLICES FOR BIP32 RECOVERY
    // ------------------------------------------------
    // Combine all wallet slices for efficient lookup during BIP32 recovery
    const allSlices = [
      ...Object.values(depositNodes),
      ...Object.values(changeNodes),
    ].filter((slice: any) => slice?.multisig?.address); // Only include slices with valid addresses

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

        // Find the corresponding wallet slice for this address
        const matchingSlice = findMatchingWalletSlice(allSlices, outputAddress);

        let psbtFields: PSBTFields = {};
        if (matchingSlice) {
          const addressType = determineAddressType(matchingSlice);
          const recoveredMetadata = extractRBFMetadata(
            matchingSlice,
            addressType,
          );
          // Create PSBT fields using the cleaner approach
          const tx = Transaction.fromHex(prevTxHex);
          psbtFields = createPSBTFields(
            addressType,
            tx,
            vout,
            value || "0",
            recoveredMetadata,
            input,
          );
          // Resolve value if still missing
          if (!value) {
            value = await resolveUtxoValue(
              fullTx,
              vout,
              depositNodes,
              changeNodes,
              txid,
            );
          }
          // Skip if we still don't have a value
          if (!value) {
            console.warn(
              `Skipping input ${txid}:${vout} - could not determine value`,
            );
            continue;
          }
          // Create UTXO with all necessary fields
          const rbfUtxo = createRBFUtxo(
            txid,
            vout,
            value,
            prevTxHex,
            psbtFields,
          );
          utxos.push(rbfUtxo);
        } else {
          console.warn(
            `No matching wallet slice found for address ${outputAddress}`,
          );
        }
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
            // Determine address type and extract metadata for this wallet UTXO
            const addressType = determineAddressType(node);
            const walletMetadata = extractWalletRBFMetadata(node, addressType);

            // Create PSBT fields for wallet UTXO
            const tx = Transaction.fromHex(prevTxHex);
            const psbtFields = createPSBTFields(
              addressType,
              tx,
              utxo.index,
              utxo.amountSats.toString(),
              walletMetadata,
              undefined, // no input sequence for wallet UTXOs
            );
            // Create RBF needed UTXO with additional fields for wallet UTXOs
            const rbfUtxo = createRBFUtxo(
              utxo.txid,
              utxo.index,
              utxo.amountSats.toString(),
              prevTxHex,
              {
                // Add PSBT fields for proper signing
                ...psbtFields,

                // Add wallet-specific metadata
                confirmed: utxo.confirmed,
                blockHeight: utxo.blockHeight,
                addressType: addressType,

                // Add any BIP32 derivation info if available from the node
                ...(node.bip32Path && { bip32Path: node.bip32Path }),

                // Add address info if available
                ...(node.multisig?.address && {
                  address: node.multisig.address,
                }),
              },
            );

            utxos.push(rbfUtxo);
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

// ====================
// PRIVATE HELPER FUNCTIONS
// ====================

/**
 * Creates PSBT fields based on address type and transaction data
 */
const createPSBTFields = (
  addressType: string,
  tx: Transaction,
  vout: number,
  value: string,
  recoveredMetadata: any,
  input?: UTXO,
): PSBTFields => {
  const fields: PSBTFields = {};
  const txBuffer = tx.toBuffer();
  const parsedValue = parseInt(value);

  // Base fields that all address types need
  switch (addressType) {
    case P2SH:
      // P2SH: Only nonWitnessUtxo + redeemScript
      fields.nonWitnessUtxo = txBuffer;
      if (recoveredMetadata.redeemScript) {
        fields.redeemScript = recoveredMetadata.redeemScript;
      }
      break;

    case P2WSH:
      // P2WSH: nonWitnessUtxo + witnessUtxo + witnessScript
      fields.nonWitnessUtxo = txBuffer;
      fields.witnessUtxo = {
        script: tx.outs[vout].script,
        value: parsedValue,
      };
      if (recoveredMetadata.witnessScript) {
        fields.witnessScript = recoveredMetadata.witnessScript;
      }
      break;

    case P2SH_P2WSH:
      // P2SH_P2WSH: All fields needed
      fields.nonWitnessUtxo = txBuffer;
      fields.witnessUtxo = {
        script: tx.outs[vout].script,
        value: parsedValue,
      };
      if (recoveredMetadata.witnessScript) {
        fields.witnessScript = recoveredMetadata.witnessScript;
      }
      if (recoveredMetadata.redeemScript) {
        fields.redeemScript = recoveredMetadata.redeemScript;
      }
      break;

    default:
      // Fallback: provide basic fields
      fields.nonWitnessUtxo = txBuffer;
      break;
  }

  // Add BIP32 derivations if available
  if (recoveredMetadata.bip32Derivations) {
    fields.bip32Derivations = recoveredMetadata.bip32Derivations;
  }

  // Add sequence if available
  if (input?.sequence !== undefined) {
    fields.sequence = input.sequence;
  }

  return fields;
};

/**
 * Extracts RBF metadata specifically for wallet nodes
 * Wallet nodes may have slightly different structure than transaction slices
 */
const extractWalletRBFMetadata = (
  node: any,
  addressType: string,
): {
  bip32Derivations?: any[];
  redeemScript?: Buffer;
  witnessScript?: Buffer;
  addressType: string;
} => {
  const metadata: any = { addressType };

  try {
    // For wallet nodes, try to extract BIP32 info from braidDetails if available
    if (node.multisig?.braidDetails) {
      try {
        const braidDetails = JSON.parse(node.multisig.braidDetails);
        if (braidDetails.extendedPublicKeys) {
          metadata.bip32Derivations = braidDetails.extendedPublicKeys.map(
            (epk: any) => ({
              masterFingerprint: epk.rootFingerprint || epk.masterFingerprint,
              path: epk.path,
              pubkey: epk.publicKey || epk.pubkey, // Try different field names
            }),
          );
        }
      } catch (e) {
        console.warn("Could not parse braidDetails for wallet node BIP32 info");
      }
    }

    // Fallback to direct multisig bip32Derivation if available
    if (!metadata.bip32Derivations && node.multisig?.bip32Derivation) {
      metadata.bip32Derivations = node.multisig.bip32Derivation.map(
        (derivation: any) => ({
          masterFingerprint: derivation.masterFingerprint,
          path: derivation.path,
          pubkey: derivation.pubkey,
        }),
      );
    }

    // Extract scripts based on address type (same logic as extractRBFMetadata)
    switch (addressType) {
      case P2SH:
        if (node.multisig?.redeem?.output) {
          metadata.redeemScript = node.multisig.redeem.output;
        }
        break;

      case P2WSH:
        if (node.multisig?.redeem?.output) {
          metadata.witnessScript = node.multisig.redeem.output;
        }
        break;

      case P2SH_P2WSH:
        if (node.multisig?.output) {
          metadata.redeemScript = node.multisig.output;
        }
        if (node.multisig?.redeem?.redeem?.output) {
          metadata.witnessScript = node.multisig.redeem.redeem.output;
        }
        break;
    }
  } catch (error) {
    console.error("Error extracting wallet RBF metadata from node:", error);
  }

  return metadata;
};

/**
 * Attempts to resolve UTXO value from various sources
 * This function tries multiple strategies to find the value of a UTXO
 */
const resolveUtxoValue = async (
  fullTx: any,
  vout: number,
  depositNodes: any,
  changeNodes: any,
  txid: string,
): Promise<string | undefined> => {
  // STRATEGY 1: Check wallet nodes first (most reliable for our UTXOs)
  // This checks if the UTXO is still in our wallet's unspent set
  for (const nodes of [depositNodes, changeNodes]) {
    for (const node of Object.values(nodes) as any[]) {
      if (!node.utxos?.length) continue;

      const matchingUtxo = node.utxos.find(
        (u: any) => u.txid === txid && u.index === vout,
      );

      if (matchingUtxo) {
        console.log(
          `Found UTXO value in wallet: ${matchingUtxo.amountSats} sats`,
        );
        return matchingUtxo.amountSats.toString();
      }
    }
  }

  // STRATEGY 2: Extract from raw transaction data (for spent UTXOs)
  // Different blockchain clients return transaction data in different formats
  if (typeof fullTx === "object" && fullTx?.vout) {
    const voutData = fullTx.vout[vout];
    if (voutData?.value) {
      // Convert BTC to satoshis (Bitcoin Core returns values in BTC)
      const satoshiValue = bitcoinsToSatoshis(voutData.value);
      console.log(
        `Extracted UTXO value from transaction: ${satoshiValue} sats`,
      );
      return satoshiValue;
    }
  }

  // STRATEGY 3: Try alternative field names from different API formats
  // Some APIs use different field names for the same data
  if (typeof fullTx === "object" && fullTx?.vout) {
    const voutData = fullTx.vout[vout];

    // Try different possible field names
    const possibleValues = [
      voutData?.amount, // Some APIs use 'amount'
      voutData?.satoshis, // Some APIs return satoshis directly
      voutData?.value_sat, // Some APIs use 'value_sat'
      voutData?.scriptPubKey?.value, // Nested value location
    ];

    for (const possibleValue of possibleValues) {
      if (possibleValue !== undefined && possibleValue !== null) {
        // If it's already in satoshis (large number), use as-is
        // If it's in BTC (small decimal), convert to satoshis
        const finalValue =
          possibleValue > 1
            ? possibleValue.toString()
            : bitcoinsToSatoshis(possibleValue);

        console.log(
          `Found UTXO value via alternative field: ${finalValue} sats`,
        );
        return finalValue;
      }
    }
  }

  return undefined;
};

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
 * Extracts only the metadata fields needed for RBF operations
 */
const extractRBFMetadata = (
  slice: any,
  addressType: string,
): {
  bip32Derivations?: any[];
  redeemScript?: Buffer;
  witnessScript?: Buffer;
  addressType: string;
} => {
  const metadata: any = { addressType };

  try {
    // Extract BIP32 derivation information (needed for signing)
    if (slice.multisig?.bip32Derivation) {
      metadata.bip32Derivations = slice.multisig.bip32Derivation.map(
        (derivation: any) => ({
          masterFingerprint: derivation.masterFingerprint,
          path: derivation.path,
          pubkey: derivation.pubkey,
        }),
      );
    }

    // Extract scripts based on address type (only what's needed for RBF)
    switch (addressType) {
      case P2SH:
        if (slice.multisig?.redeem?.output) {
          metadata.redeemScript = slice.multisig.redeem.output;
        }
        break;

      case P2WSH:
        if (slice.multisig?.redeem?.output) {
          metadata.witnessScript = slice.multisig.redeem.output;
        }
        break;

      case P2SH_P2WSH:
        if (slice.multisig?.output) {
          metadata.redeemScript = slice.multisig.output;
        }
        if (slice.multisig?.redeem?.redeem?.output) {
          metadata.witnessScript = slice.multisig.redeem.redeem.output;
        }
        break;
    }
  } catch (error) {
    console.error("Error extracting RBF metadata from slice:", error);
  }

  return metadata;
};

/**
 * Determines the address type from slice data
 */
const determineAddressType = (slice: any): string => {
  // Try to get from braidDetails first
  if (slice.multisig?.braidDetails) {
    try {
      const braidDetails = JSON.parse(slice.multisig.braidDetails);
      if (braidDetails.addressType) {
        return braidDetails.addressType;
      }
    } catch (e) {
      console.warn("Could not parse braidDetails, using fallback detection");
    }
  }

  // Fallback detection logic
  if (slice.multisig?.redeem?.redeem) {
    return P2SH_P2WSH;
  } else if (slice.multisig?.address?.match(/^(tb|bc|bcrt)/)) {
    return P2WSH;
  }

  return P2SH; // default fallback
};

/**
 * Creates a complete UTXO object with all necessary fields for RBF operations
 */
const createRBFUtxo = (
  txid: string,
  vout: number,
  value: string,
  prevTxHex: string,
  additionalFields: Partial<FeeUTXO> = {},
): FeeUTXO => {
  return {
    txid,
    vout,
    value,
    prevTxHex,
    ...additionalFields,
  };
};

/**
 * Default fee rates for different priority levels (in sat/vB)
 * Used as fallback when blockchain client fails
 *
 * Fallback values based on :
 * https://b10c.me/blog/003-a-list-of-public-bitcoin-feerate-estimation-apis/
 * These values are reasonable defaults but will be less accurate
 */
const DEFAULT_FEE_RATES = {
  HIGH: 32.75,
  MEDIUM: 32.75,
  LOW: 20.09,
};

/**
 * Gets default fee rate based on confirmation target
 *
 * Fallback values based on :
 * https://b10c.me/blog/003-a-list-of-public-bitcoin-feerate-estimation-apis/
 * These values are reasonable defaults but will be less accurate
 */
const getDefaultFeeRate = (withinBlocks: number): number => {
  switch (withinBlocks) {
    case CONFIRMATION_TARGETS.HIGH:
      return DEFAULT_FEE_RATES.HIGH;
    case CONFIRMATION_TARGETS.MEDIUM:
      return DEFAULT_FEE_RATES.MEDIUM;
    case CONFIRMATION_TARGETS.LOW:
      return DEFAULT_FEE_RATES.LOW;
    default:
      return DEFAULT_FEE_RATES.MEDIUM;
  }
};

/**
 * Selects target fee rate based on priority
 */
const selectTargetFeeRate = (
  priority: FeePriority,
  feeRates: { high: number; medium: number; low: number },
): number => {
  switch (priority) {
    case FeePriority.HIGH:
      return feeRates.high;
    case FeePriority.LOW:
      return feeRates.low;
    case FeePriority.MEDIUM:
    default:
      return feeRates.medium;
  }
};

/**
 * Validates transaction inputs for analysis
 */
const validateTransactionInputs = (
  txHex: string,
  fee: number,
  availableUtxos: FeeUTXO[],
): void => {
  if (!txHex || typeof txHex !== "string") {
    throw new Error("Transaction hex must be a string");
  }

  if (isNaN(fee) || fee < 0) {
    console.warn("Invalid fee provided, using 0");
  }

  if (!availableUtxos?.length) {
    throw new Error("No UTXOs available for fee bumping");
  }
};
